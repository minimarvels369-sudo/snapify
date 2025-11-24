// FINAL BUILD V9 - Hardcoded the correct redirect URL
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
app.use((req, res, next) => {
  if (req.path.includes('/webhooks')) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

const shopifyApiKey = defineString("SHOPIFY_API_KEY");
const shopifyApiSecret = defineString("SHOPIFY_API_SECRET");

const appName = 'snapify';
const scopes = "read_products,write_products,read_product_listings,write_product_listings";

// CORRECTED: Hardcode the known correct Gen 2 function URL.
function getFunctionsBaseUrl() {
    return 'https://api-iiewd7uyda-uc.a.run.app';
}

app.get("/auth", (req, res) => {
  console.log("V9_LOG: /auth (GET) started.");
  const { shop } = req.query;

  if (!shop) {
    console.error("V9_LOG: /auth failed - Missing shop query param.");
    return res.status(400).send("Missing shop parameter.");
  }

  const apiKey = shopifyApiKey.value();
  const apiSecret = shopifyApiSecret.value();

  if (!apiKey || !apiSecret) {
      console.error("V9_LOG: /auth - Shopify API key or secret is not configured in .env file.");
      return res.status(500).send("Server configuration error: App secrets are not set.");
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${getFunctionsBaseUrl()}/auth/callback`;
  console.log(`V9_LOG: Using redirect URI: ${redirectUri}`); // Log the generated URI
  
  console.log(`V9_LOG: /auth - Storing state for ${shop}`);
  db.collection("shops").doc(shop).set({ state }, { merge: true })
    .then(() => {
      const installUrl = `https://${shop}.myshopify.com/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&state=${state}&redirect_uri=${redirectUri}`;
      console.log(`V9_LOG: /auth - State stored. Redirecting user to install URL.`);
      res.redirect(installUrl);
    })
    .catch(error => {
      console.error("V9_LOG: /auth - Firestore error storing state:", error);
      res.status(500).send("Error initiating authentication.");
    });
});


app.get("/auth/callback", async (req, res) => {
  console.log("V9_LOG: /auth/callback execution started.");
  const { shop, hmac, code, state } = req.query;

  console.log("V9_LOG: Received query params:", JSON.stringify(req.query));

  if (!shop || !hmac || !code || !state) {
    console.error("V9_LOG: CRITICAL - A required query parameter is missing. Aborting.");
    return res.status(400).send("Required parameters are missing.");
  }

  const apiSecret = shopifyApiSecret.value();
  if (!apiSecret) {
      console.error("V9_LOG: CRITICAL - SHOPIFY_API_SECRET is not loaded from .env! Aborting.");
      return res.status(500).send("Server configuration error.");
  }
  console.log("V9_LOG: API Secret is loaded.");

  // 1. HMAC Validation
  const map = { ...req.query };
  delete map.hmac;
  const message = new URLSearchParams(map).toString();
  const generatedHmac = crypto.createHmac('sha256', apiSecret).update(message).digest('hex');

  if (generatedHmac !== hmac) {
      console.error("V9_LOG: CRITICAL - HMAC validation FAILED.");
      return res.status(400).send("HMAC validation failed.");
  }
  console.log("V9_LOG: HMAC validation successful.");
  
  // 2. Nonce Verification
  try {
    const shopDoc = await db.collection("shops").doc(shop).get();
    if (!shopDoc.exists || shopDoc.data().state !== state) {
        console.error(`V9_LOG: CRITICAL - Nonce verification FAILED.`);
        return res.status(403).send("Request origin cannot be verified.");
    }
    console.log("V9_LOG: Nonce verification successful.");
  } catch (error) {
    console.error("V9_LOG: CRITICAL - A Firestore error occurred during Nonce verification. Aborting.", error);
    return res.status(500).send("Error during nonce verification.");
  }
  
  // 3. Exchange for Access Token and Store
  const apiKey = shopifyApiKey.value();
  const shopify = new Shopify({ shopName: shop, apiKey: apiKey, apiSecret: apiSecret });

  try {
    const accessToken = await shopify.exchange_temporary_code({ code });
    console.log("V9_LOG: Access token exchange successful.");

    const shopData = {
      shopDomain: shop,
      accessToken: accessToken,
      isActive: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("shops").doc(shop).set(shopData, { merge: true });
    console.log("V9_LOG: SUCCESS! Shop data has been written to Firestore successfully.");

    // Final Redirect
    const host = req.query.host;
    if (!host) {
        const redirectUrl = `https://admin.shopify.com/store/${shop.split('.')[0]}/apps/${appName}`
         res.redirect(redirectUrl);
         return;
    }
    const encodedHost = Buffer.from(host, 'utf-8').toString('base64');
    const redirectUrl = `https://admin.shopify.com/store/${shop.split('.')[0]}/apps/${appName}?shop=${shop}&host=${encodedHost}`;
    res.redirect(redirectUrl);

  } catch (error) {
    console.error("V9_LOG: CRITICAL - An error occurred during the final stage.", error);
    if (error.response && error.response.body) {
        console.error("V9_LOG: Detailed error from Shopify:", JSON.stringify(error.response.body, null, 2));
    }
    res.status(500).send(error.message || "An error occurred during the final step.");
  }
});


// Helper function to get Shopify client, updated to use new param system
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
        const products = response.products.edges.map(edge => ({
            ...edge.node,
        }));

        if (response.products.pageInfo.hasNextPage) {
            const lastCursor = response.products.edges[response.products.edges.length - 1].cursor;
            await new Promise(resolve => setTimeout(resolve, 500));
            const nextProducts = await fetchAllProducts(shopify, lastCursor);
            return products.concat(nextProducts);
        } else {
            return products;
        }
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

        await db.collection('shops').doc(shop).update({
            productsSyncedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({ success: true, message: `Synced ${products.length} products successfully.` });

    } catch (error) {
        console.error("Error syncing products:", error);
        res.status(500).json({ 
            success: false, 
            message: error.message || "Internal Server Error during sync" 
        });
    }
});

app.get("/products", async (req, res) => {
    const { shop } = req.query;
    if (!shop) {
        return res.status(400).send("Missing shop parameter.");
    }

    try {
        const productsRef = db.collection('shops').doc(shop).collection('products');
        const snapshot = await productsRef.get();
        if (snapshot.empty) {
            return res.status(200).json({ products: [] });
        }
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ products });
    } catch (error) {
        console.error(`Error fetching products from Firestore for ${shop}:`, error);
        res.status(500).send("Could not fetch products.");
    }
});


exports.api = functions.https.onRequest(app);
