// DIAGNOSTIC BUILD V5 - DO NOT REMOVE LOGS
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const Shopify = require("shopify-api-node");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use((req, res, next) => {
  if (req.path.includes('/webhooks')) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const appName = process.env.APP_NAME || 'snapify';
const scopes = "read_products,write_products,read_product_listings,write_product_listings";

function getFunctionsBaseUrl() {
    const region = process.env.FUNCTION_REGION || 'us-central1';
    const projectId = process.env.GCLOUD_PROJECT;
    if (!projectId) {
        console.error("V5_LOG: GCLOUD_PROJECT not set");
        return `https://[REGION]-[PROJECT_ID].cloudfunctions.net/api`;
    }
    return `https://${region}-${projectId}.cloudfunctions.net/api`;
}

app.post("/auth", (req, res) => {
  console.log("V5_LOG: /auth endpoint started.");
  const { shop } = req.body;
  if (!shop) {
    console.error("V5_LOG: /auth failed - Missing shop parameter.");
    return res.status(400).send("Missing shop parameter.");
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${getFunctionsBaseUrl()}/auth/callback`;
  
  console.log(`V5_LOG: /auth - Preparing to store state for shop: ${shop}`);
  db.collection("shops").doc(shop).set({ state }, { merge: true })
    .then(() => {
      const installUrl = `https://{shop}.myshopify.com/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&state=${state}&redirect_uri=${redirectUri}`;
      console.log(`V5_LOG: /auth - State stored. Redirecting to: ${installUrl.replace('{shop}', shop)}`);
      res.json({ installUrl: installUrl.replace('{shop}', shop) });
    })
    .catch(error => {
      console.error("V5_LOG: /auth - Error storing state in Firestore:", error);
      res.status(500).send("Error initiating authentication.");
    });
});

app.get("/auth/callback", async (req, res) => {
  console.log("V5_LOG: /auth/callback started.");
  const { shop, hmac, code, state } = req.query;

  if (!shop || !hmac || !code || !state) {
    console.error("V5_LOG: /auth/callback - Missing required parameters.", { shop, hmac, code, state });
    return res.status(400).send("Required parameters are missing.");
  }
  console.log(`V5_LOG: /auth/callback - Received callback for shop: ${shop}`);

  // 1. HMAC Validation
  try {
      const map = { ...req.query };
      delete map.hmac;
      const message = new URLSearchParams(map).toString();
      const generatedHmac = crypto.createHmac('sha256', apiSecret).update(message).digest('hex');

      if (generatedHmac !== hmac) {
          console.error("V5_LOG: /auth/callback - HMAC validation failed.");
          return res.status(400).send("HMAC validation failed.");
      }
      console.log("V5_LOG: /auth/callback - HMAC validation successful.");
  } catch (error) {
      console.error("V5_LOG: /auth/callback - Error during HMAC validation:", error);
      return res.status(500).send("Error during HMAC validation.");
  }
  
  // 2. Nonce Verification
  let shopDoc;
  try {
    console.log(`V5_LOG: /auth/callback - Verifying nonce (state) for shop: ${shop}`);
    shopDoc = await db.collection("shops").doc(shop).get();
    if (!shopDoc.exists) {
        console.error(`V5_LOG: /auth/callback - Nonce verification failed: Shop document does not exist for ${shop}.`);
        return res.status(403).send("Nonce verification failed: Shop not found.");
    }
    if (shopDoc.data().state !== state) {
        console.error(`V5_LOG: /auth/callback - Nonce verification failed: State mismatch for ${shop}.`);
        return res.status(403).send("Nonce verification failed: State mismatch.");
    }
    console.log("V5_LOG: /auth/callback - Nonce verification successful.");
  } catch (error) {
    console.error("V5_LOG: /auth/callback - Error reading from Firestore for nonce verification:", error);
    return res.status(500).send("Error during nonce verification.");
  }

  const shopify = new Shopify({ shopName: shop, apiKey: apiKey, apiSecret: apiSecret });

  try {
    console.log("V5_LOG: /auth/callback - Exchanging temporary code for access token.");
    const accessToken = await shopify.exchange_temporary_code({ code });
    console.log("V5_LOG: /auth/callback - Access token obtained successfully.");

    console.log("V5_LOG: /auth/callback - Storing shop data and access token in Firestore.");
    await db.collection("shops").doc(shop).set({
      shopDomain: shop,
      accessToken: accessToken,
      plan: "free",
      credits: 100,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
    }, { merge: true });
    console.log("V5_LOG: /auth/callback - Shop data stored successfully in Firestore.");

    // Register webhooks, redirect, etc.
    await registerWebhooks(shop, accessToken);
    const host = req.query.host;
    if (!host) {
        console.error("V5_LOG: /auth/callback - Host parameter is missing.");
        return res.status(400).send("Host parameter is missing.");
    }
    const encodedHost = Buffer.from(host, 'utf-8').toString('base64');
    const redirectUrl = `https://admin.shopify.com/store/${shop.split('.')[0]}/apps/${appName}?shop=${shop}&host=${encodedHost}`;
    console.log(`V5_LOG: /auth/callback - Redirecting to: ${redirectUrl}`);
    res.redirect(redirectUrl);

  } catch (error) {
    console.error("V5_LOG: /auth/callback - CRITICAL ERROR during token exchange or Firestore write:", error);
    res.status(500).send(error.message || "An error occurred during the final step of authentication.");
  }
});

async function registerWebhooks(shopDomain, accessToken) {
    // ... (omitting webhook logic for brevity, it's less critical for now)
}

app.post("/products/sync", async (req, res) => {
    console.log("--- V5_LOG: /products/sync started ---");
    const { shop } = req.body;
    if (!shop) {
        console.error("--- V5_LOG: Sync failed: Missing shop parameter. ---");
        return res.status(400).json({ success: false, message: "Missing shop parameter." });
    }
    try {
        console.log(`--- V5_LOG: Sync - Getting client for ${shop} ---`);
        const shopify = await getShopifyClient(shop);
        console.log("--- V5_LOG: Sync - Client obtained, fetching products. ---");
        const products = await fetchAllProducts(shopify);
        // ... (rest of the sync logic)
        res.status(200).json({ success: true, message: `Synced ${products.length} products successfully.` });
    } catch (error) {
        console.error("--- V5_LOG: Sync caught an error ---", { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: error.message || "Internal Server Error during sync" });
    }
});

// Dummy functions to avoid breaking the app if they are not defined elsewhere
async function getShopifyClient(shopDomain) {
    console.log(`--- V5_LOG: getShopifyClient for ${shopDomain} ---`);
    const shopDoc = await db.collection('shops').doc(shopDomain).get();
    if (!shopDoc.exists || !shopDoc.data().accessToken) {
        console.error(`--- V5_LOG: getShopifyClient - Shop not found or AT missing for ${shopDomain} ---`);
        throw new Error('Shop not found or access token missing.');
    }
    const { accessToken } = shopDoc.data();
    console.log(`--- V5_LOG: getShopifyClient - AT found for ${shopDomain} ---`);
    return new Shopify({ shopName: shopDomain, accessToken: accessToken });
}

async function fetchAllProducts(shopify) {
    // In a real scenario, you would have your full pagination logic here.
    // For this diagnostic build, we can simplify it to see if the call works at all.
    try {
        console.log("--- V5_LOG: fetchAllProducts - Starting fetch. ---");
        const products = await shopify.product.list({ limit: 5 });
        console.log(`--- V5_LOG: fetchAllProducts - Fetched ${products.length} products. ---`);
        return products;
    } catch (error) {
        console.error("--- V5_LOG: fetchAllProducts - Error fetching from Shopify ---", error);
        throw new Error('Failed to fetch products from Shopify.');
    }
}

exports.api = functions.https.onRequest(app);
