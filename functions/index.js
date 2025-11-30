// SUPER-DEBUG-BUILD: Log every single step of the auth process.
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const Shopify = require("shopify-api-node");
const crypto = require("crypto");
const { defineString } = require("firebase-functions/params");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const shopifyApiKey = defineString("SHOPIFY_API_KEY");
const shopifyApiSecret = defineString("SHOPIFY_API_SECRET");
const appName = "snapify";
const scopes = "read_products,write_products,read_product_listings,write_product_listings";

function getFunctionsBaseUrl() {
    return 'https://api-iiewd7uyda-uc.a.run.app';
}

// --- NEW DETAILED LOGGING ---
const log = async (level, stage, shop, message, additional_info = {}) => {
    try {
        await db.collection('logs').add({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            level, // INFO, ERROR
            stage, // e.g., 'callback_start', 'hmac_success'
            shop: shop || 'unknown',
            message,
            ...additional_info
        });
    } catch (dbError) {
        console.error(`!!! CRITICAL: FAILED TO WRITE LOG TO FIRESTORE (Level: ${level}) !!!`, dbError);
        console.error("Original Log Details:", { level, stage, shop, message, additional_info });
    }
};

app.get("/auth", async (req, res) => {
    const { shop, host } = req.query;
    if (!shop || !host) return res.status(400).send("Missing 'shop' or 'host' parameter.");

    await log('INFO', 'auth_start', shop, 'Authentication process initiated.', { host });

    const apiKey = shopifyApiKey.value();
    if (!apiKey) {
        await log('ERROR', 'auth_config_error', shop, 'SHOPIFY_API_KEY is not configured.');
        return res.status(500).send("Server configuration error.");
    }

    const state = crypto.randomBytes(16).toString("hex");
    const redirectUri = `${getFunctionsBaseUrl()}/auth/callback`;

    try {
        await db.collection("shops").doc(shop).set({ state, host }, { merge: true });
        await log('INFO', 'auth_state_saved', shop, 'Nonce (state) and host saved to Firestore.', { state });
        
        const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&state=${state}&redirect_uri=${redirectUri}`;
        return res.redirect(installUrl);
    } catch (error) {
        await log('ERROR', 'auth_start_firestore_error', shop, 'Failed to save initial state.', { error: error.message });
        return res.status(500).send("Error initiating authentication.");
    }
});

app.get("/auth/callback", async (req, res) => {
    const { shop, hmac, code, state } = req.query;
    await log('INFO', 'callback_received', shop, 'Received callback from Shopify.', { query: req.query });

    if (!shop || !hmac || !code || !state) {
        await log('ERROR', 'callback_missing_params', shop, 'Callback is missing required parameters.');
        return res.status(400).send("Required parameters are missing.");
    }

    const apiSecret = shopifyApiSecret.value();
    const apiKey = shopifyApiKey.value();

    const map = { ...req.query };
    delete map.hmac;
    const message = new URLSearchParams(map).toString();
    const generatedHmac = crypto.createHmac('sha256', apiSecret).update(message).digest('hex');

    if (generatedHmac !== hmac) {
        await log('ERROR', 'callback_hmac_failed', shop, 'HMAC validation failed.');
        return res.status(400).send("HMAC validation failed.");
    }
    await log('INFO', 'callback_hmac_success', shop, 'HMAC validation successful.');

    let shopDoc;
    try {
        shopDoc = await db.collection("shops").doc(shop).get();
        const storedState = shopDoc.exists ? shopDoc.data().state : null;
        if (!storedState || storedState !== state) {
            await log('ERROR', 'callback_state_mismatch', shop, 'State verification failed.', { storedState, receivedState: state });
            return res.status(403).send("Request origin cannot be verified.");
        }
        await log('INFO', 'callback_state_success', shop, 'State verification successful.');
    } catch (error) {
        await log('ERROR', 'callback_firestore_read_error', shop, 'Error reading state from Firestore.', { error: error.message });
        return res.status(500).send("Error during state verification.");
    }

    try {
        await log('INFO', 'token_exchange_start', shop, 'Attempting to exchange temporary code for access token.');
        const shopify = new Shopify({ shopName: shop, apiKey, apiSecret });
        const accessToken = await shopify.exchangeTemporaryCode({ code });
        
        await log('INFO', 'token_exchange_success', shop, 'Successfully received access token.', { accessToken: `...${accessToken.slice(-6)}` });

        const dataToStore = {
            shopDomain: shop,
            accessToken: accessToken,
            scopes: scopes,
            isActive: true,
            host: shopDoc.exists ? shopDoc.data().host : null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            installedAt: shopDoc.exists && shopDoc.data().installedAt ? shopDoc.data().installedAt : admin.firestore.FieldValue.serverTimestamp()
        };

        await log('INFO', 'firestore_write_start', shop, 'Attempting to write final shop data to Firestore.', { data: dataToStore });

        // --- THE MOST IMPORTANT PART ---
        await db.collection("shops").doc(shop).set(dataToStore, { merge: true });
        // If the code reaches here, the write command was sent to Firestore without throwing an error.
        
        await log('SUCCESS', 'firestore_write_success', shop, 'Firestore .set() command executed successfully. Shop should be installed/updated.');

        const appUrl = `https://${shop}/admin/apps/${appName}`;
        await log('INFO', 'redirect_final', shop, 'Redirecting user to the final app URL.', { url: appUrl });
        
        return res.redirect(appUrl);

    } catch (error) {
        // This will catch errors from token exchange AND from the Firestore .set() operation.
        await log('ERROR', 'token_exchange_or_db_write_failed', shop, 'An error occurred during token exchange or final DB write.', { 
            error: error.message,
            responseBody: error.response ? error.response.body : 'N/A',
            stack: error.stack
        });
        return res.status(500).send("An error occurred during the final step of installation.");
    }
});

// --- UNCHANGED API ENDPOINTS ---

async function getShopifyClient(shopDomain) {
    const shopDoc = await db.collection('shops').doc(shopDomain).get();
    if (!shopDoc.exists || !shopDoc.data().accessToken) {
        throw new Error('Shop not found or access token missing.');
    }
    const { accessToken } = shopDoc.data();
    return new Shopify({ shopName: shopDomain, accessToken });
}

app.post("/products/sync", async (req, res) => {
    const { shop } = req.body;
    if (!shop) return res.status(400).json({ success: false, message: "Missing shop parameter." });
    try {
        const shopify = await getShopifyClient(shop);
        // Fetching logic here...
        res.status(200).json({ success: true, message: `Sync logic placeholder.` });
    } catch (error) {
        await log('ERROR', 'product_sync_error', shop, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get("/products", async (req, res) => {
    const { shop } = req.query;
    if (!shop) return res.status(400).send("Missing shop parameter.");
    try {
        await getShopifyClient(shop);
        // Fetching logic here...
        res.status(200).json({ products: [] });
    } catch (error) {
        if (error.message.includes('access token missing')) {
             return res.status(401).send("Authentication required.");
        }
        await log('ERROR', 'get_products_error', shop, error.message);
        res.status(500).send("Could not fetch products.");
    }
});

exports.api = functions.runWith({ secrets: ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET"] }).https.onRequest(app);
