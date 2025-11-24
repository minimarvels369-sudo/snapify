// DIAGNOSTIC BUILD V6 - Switched to functions.config()
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

// IMPORTANT: Switched to Firebase runtime config for security
const apiKey = functions.config().shopify.key;
const apiSecret = functions.config().shopify.secret;
const appName = 'snapify'; // Hardcoding for safety
const scopes = "read_products,write_products,read_product_listings,write_product_listings";

function getFunctionsBaseUrl() {
    const region = process.env.FUNCTION_REGION || 'us-central1';
    const projectId = process.env.GCLOUD_PROJECT;
    if (!projectId) {
        console.error("V6_LOG: GCLOUD_PROJECT not set");
        return `https://[REGION]-[PROJECT_ID].cloudfunctions.net/api`;
    }
    return `https://${region}-${projectId}.cloudfunctions.net/api`;
}

app.post("/auth", (req, res) => {
  console.log("V6_LOG: /auth started.");
  const { shop } = req.body;
  if (!shop) {
    console.error("V6_LOG: /auth failed - Missing shop.");
    return res.status(400).send("Missing shop parameter.");
  }

  // Check if secrets are loaded
  if (!apiKey || !apiSecret) {
      console.error("V6_LOG: /auth - Shopify API key or secret is not configured on Firebase.");
      return res.status(500).send("Server configuration error: App secrets are not set.");
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${getFunctionsBaseUrl()}/auth/callback`;
  
  console.log(`V6_LOG: /auth - Storing state for ${shop}`);
  db.collection("shops").doc(shop).set({ state }, { merge: true })
    .then(() => {
      const installUrl = `https://{shop}.myshopify.com/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&state=${state}&redirect_uri=${redirectUri}`;
      console.log(`V6_LOG: /auth - State stored. Redirecting.`);
      res.json({ installUrl: installUrl.replace('{shop}', shop) });
    })
    .catch(error => {
      console.error("V6_LOG: /auth - Firestore error storing state:", error);
      res.status(500).send("Error initiating authentication.");
    });
});

app.get("/auth/callback", async (req, res) => {
  console.log("V6_LOG: /auth/callback started.");
  const { shop, hmac, code, state } = req.query;

  if (!shop || !hmac || !code || !state) {
    console.error("V6_LOG: /auth/callback - Missing params.", { shop, hmac, code, state });
    return res.status(400).send("Required parameters are missing.");
  }
  
  if (!apiSecret) {
      console.error("V6_LOG: /auth/callback - CRITICAL: SHOPIFY_API_SECRET is not loaded!");
      return res.status(500).send("Server configuration error.");
  }
  console.log(`V6_LOG: /auth/callback - Received callback for shop: ${shop}`);

  // 1. HMAC Validation
  const map = { ...req.query };
  delete map.hmac;
  const message = new URLSearchParams(map).toString();
  const generatedHmac = crypto.createHmac('sha256', apiSecret).update(message).digest('hex');

  if (generatedHmac !== hmac) {
      console.error("V6_LOG: /auth/callback - HMAC validation failed. Secret might be wrong.");
      return res.status(400).send("HMAC validation failed.");
  }
  console.log("V6_LOG: /auth/callback - HMAC validation successful.");
  
  // 2. Nonce Verification
  try {
    console.log(`V6_LOG: /auth/callback - Verifying nonce for ${shop}`);
    const shopDoc = await db.collection("shops").doc(shop).get();
    if (!shopDoc.exists || shopDoc.data().state !== state) {
        console.error(`V6_LOG: /auth/callback - Nonce verification failed.`);
        return res.status(403).send("Request origin cannot be verified.");
    }
    console.log("V6_LOG: /auth/callback - Nonce verification successful.");
  } catch (error) {
    console.error("V6_LOG: /auth/callback - Firestore error on nonce verification:", error);
    return res.status(500).send("Error during nonce verification.");
  }

  // 3. Exchange for Access Token and Store
  const shopify = new Shopify({ shopName: shop, apiKey: apiKey, apiSecret: apiSecret });
  try {
    console.log("V6_LOG: /auth/callback - Exchanging code for access token.");
    const accessToken = await shopify.exchange_temporary_code({ code });
    console.log("V6_LOG: /auth/callback - Access token obtained.");

    console.log("V6_LOG: /auth/callback - Storing shop data in Firestore.");
    await db.collection("shops").doc(shop).set({
      shopDomain: shop,
      accessToken: accessToken,
      isActive: true,
      // ... other fields
    }, { merge: true });
    console.log("V6_LOG: /auth/callback - SUCCESS: Shop data stored in Firestore.");

    // Final Redirect
    const host = req.query.host;
    if (!host) {
        console.error("V6_LOG: /auth/callback - Host param missing.");
        return res.status(400).send("Host parameter is missing.");
    }
    const encodedHost = Buffer.from(host, 'utf-8').toString('base64');
    const redirectUrl = `https://admin.shopify.com/store/${shop.split('.')[0]}/apps/${appName}?shop=${shop}&host=${encodedHost}`;
    console.log(`V6_LOG: /auth/callback - Redirecting to app.`);
    res.redirect(redirectUrl);

  } catch (error) {
    console.error("V6_LOG: /auth/callback - CRITICAL ERROR during token exchange or Firestore write:", error);
    res.status(500).send(error.message || "An error occurred during the final step.");
  }
});


// All other functions (sync, etc.) remain the same
// but will now work because the access token will be in Firestore.
// The logging in them is still useful.

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
