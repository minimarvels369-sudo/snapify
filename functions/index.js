// BUILD FROM STABLE VERSION c86bcf7 - with fixes
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
app.use(express.json()); // Use JSON parsing for all relevant routes

// Define Firebase Params for environment variables
const shopifyApiKey = defineString("SHOPIFY_API_KEY");
const shopifyApiSecret = defineString("SHOPIFY_API_SECRET");
const appName = "snapify";
const scopes = "read_products,write_products,read_product_listings,write_product_listings";

function getFunctionsBaseUrl() {
    return 'https://api-iiewd7uyda-uc.a.run.app';
}

// Logging function for debugging
const logError = async (stage, error, shop = 'unknown', additional_info = {}) => {
    try {
        await db.collection('logs').add({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            shop: shop,
            stage: stage,
            level: 'ERROR',
            message: error.message || 'An unknown error occurred.',
            stack: error.stack || null,
            ...additional_info
        });
    } catch (dbError) {
        console.error("!!! CRITICAL: FAILED TO WRITE LOG TO FIRESTORE !!!", dbError);
        console.error("Original Error Details:", { stage, error, shop });
    }
};

// --- CORRECTED AUTH FLOW ---

// 1. Initial Authentication Endpoint
app.get("/auth", async (req, res) => {
    const { shop, host } = req.query;

    if (!shop || !host) {
        return res.status(400).send("Missing 'shop' or 'host' parameter.");
    }

    const apiKey = shopifyApiKey.value();
    if (!apiKey) {
        await logError('auth_start_failure', new Error('SHOPIFY_API_KEY is not configured.'), shop);
        return res.status(500).send("Server configuration error: App credentials missing.");
    }

    const state = crypto.randomBytes(16).toString("hex");
    const redirectUri = `${getFunctionsBaseUrl()}/auth/callback`;

    try {
        // Store state and host for verification in the callback
        await db.collection("shops").doc(shop).set({ 
            state: state,
            host: host, // Save the host
        }, { merge: true });

        const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&state=${state}&redirect_uri=${redirectUri}`;
        return res.redirect(installUrl);

    } catch (error) {
        await logError('auth_start_firestore_error', error, shop);
        return res.status(500).send("Error initiating authentication.");
    }
});

// 2. Authentication Callback Endpoint
app.get("/auth/callback", async (req, res) => {
    const { shop, hmac, code, state } = req.query;
    const apiSecret = shopifyApiSecret.value();
    const apiKey = shopifyApiKey.value();

    if (!shop || !hmac || !code || !state) {
        return res.status(400).send("Required parameters are missing.");
    }

    if (!apiSecret || !apiKey) {
        await logError('callback_config_error', new Error('API keys not configured.'), shop);
        return res.status(500).send("Server configuration error.");
    }

    const map = { ...req.query };
    delete map.hmac;
    const message = new URLSearchParams(map).toString();
    const generatedHmac = crypto.createHmac('sha256', apiSecret).update(message).digest('hex');

    if (generatedHmac !== hmac) {
        await logError('callback_hmac_failed', new Error('HMAC validation failed.'), shop);
        return res.status(400).send("HMAC validation failed.");
    }

    let shopDoc;
    try {
        shopDoc = await db.collection("shops").doc(shop).get();
        const storedState = shopDoc.exists ? shopDoc.data().state : null;

        if (!storedState || storedState !== state) {
            await logError('callback_state_mismatch', new Error('State verification failed.'), shop);
            return res.status(403).send("Request origin cannot be verified.");
        }
    } catch (error) {
        await logError('callback_firestore_read_error', error, shop);
        return res.status(500).send("Error during state verification.");
    }
    
    try {
        const shopify = new Shopify({ shopName: shop, apiKey: apiKey, apiSecret: apiSecret });
        // *** THE FIX: Correct function name is exchangeTemporaryCode ***
        const accessToken = await shopify.exchangeTemporaryCode({ code });

        const dataToStore = {
            shopDomain: shop,
            accessToken: accessToken,
            scopes: scopes,
            isActive: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            installedAt: shopDoc.exists && shopDoc.data().installedAt ? shopDoc.data().installedAt : admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection("shops").doc(shop).set(dataToStore, { merge: true });

        // --- FINAL, CORRECT REDIRECT ---
        const appUrl = `https://${shop}/admin/apps/${appName}`;
        return res.redirect(appUrl);

    } catch (error) {
        await logError('callback_token_exchange_error', error, shop, { 
            responseBody: error.response ? error.response.body : null 
        });
        return res.status(500).send("An error occurred during the final step of installation.");
    }
});

// --- REST OF THE API (UNCHANGED FROM c86bcf7) ---

async function getShopifyClient(shopDomain) {
    const shopDoc = await db.collection('shops').doc(shopDomain).get();
    if (!shopDoc.exists || !shopDoc.data().accessToken) {
        throw new Error('Shop not found or access token missing.');
    }
    const { accessToken } = shopDoc.data();
    return new Shopify({
        shopName: shopDomain,
        accessToken: accessToken,
    });
}

const productsQuery = `
query getProducts($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    edges {
      cursor
      node {
        id
        title
        descriptionHtml
        images(first: 10) {
          edges {
            node {
              url
              altText
            }
          }
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              price
              sku
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;

async function fetchAllProducts(shopify, cursor = null) {
    try {
        const response = await shopify.graphql(productsQuery, { first: 250, after: cursor });
        const products = response.products.edges.map(edge => ({ ...edge.node }));

        if (response.products.pageInfo.hasNextPage) {
            const lastCursor = response.products.edges[response.products.edges.length - 1].cursor;
            await new Promise(resolve => setTimeout(resolve, 500));
            const nextProducts = await fetchAllProducts(shopify, lastCursor);
            return products.concat(nextProducts);
        }
        return products;
    } catch (error) {
        console.error('Error fetching products from Shopify:', error.response ? error.response.body : error);
        throw new Error('Failed to fetch products from Shopify');
    }
}

app.post("/products/sync", async (req, res) => {
    const { shop } = req.body;
    if (!shop) {
        return res.status(400).json({ success: false, message: "Missing shop parameter." });
    }
    try {
        const shopify = await getShopifyClient(shop);
        const products = await fetchAllProducts(shopify);
        if (!products || products.length === 0) {
            return res.status(200).json({ success: true, message: "No products found in Shopify." });
        }
        const batch = db.batch();
        products.forEach(product => {
            const productId = String(product.id).split('/').pop();
            const productRef = db.collection('shops').doc(shop).collection('products').doc(productId);
            batch.set(productRef, product, { merge: true });
        });
        await batch.commit();
        await db.collection('shops').doc(shop).update({ productsSyncedAt: admin.firestore.FieldValue.serverTimestamp() });
        res.status(200).json({ success: true, message: `Synced ${products.length} products successfully.` });
    } catch (error) {
        await logError('product_sync_error', error, shop);
        res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
});

app.get("/products", async (req, res) => {
    const { shop } = req.query;
    if (!shop) {
        return res.status(400).send("Missing shop parameter.");
    }
    try {
        // This will throw if the token is missing, which is a form of auth check.
        await getShopifyClient(shop);
        const productsRef = db.collection('shops').doc(shop).collection('products');
        const snapshot = await productsRef.get();
        if (snapshot.empty) {
            return res.status(200).json({ products: [] });
        }
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ products });
    } catch (error) {
        if (error.message.includes('access token missing')) {
             return res.status(401).send("Authentication required.");
        }
        await logError('get_products_error', error, shop);
        res.status(500).send("Could not fetch products.");
    }
});

exports.api = functions.runWith({ secrets: ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET"] }).https.onRequest(app);
