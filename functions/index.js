// FINAL BUILD V13 - Verify API Key on initial auth
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

function getFunctionsBaseUrl() {
    return 'https://api-iiewd7uyda-uc.a.run.app';
}

// **** NEW Logging Function ****
const logError = async (stage, error, shop = 'unknown', additional_info = {}) => {
    const logEntry = {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        shop: shop,
        stage: stage,
        message: error.message || 'An unknown error occurred.',
        stack: error.stack || null,
        requestQuery: additional_info.requestQuery || null,
        ...additional_info
    };
    try {
        await db.collection('logs').add(logEntry);
    } catch (dbError) {
        console.error("!!! FAILED TO WRITE TO FIRESTORE LOGS !!!", dbError);
    }
};


app.get("/auth", async (req, res) => {
  const { shop } = req.query;
  if (!shop) {
    return res.status(400).send("Missing shop parameter.");
  }

  const apiKey = shopifyApiKey.value();

  // **** NEW API Key Check ****
  if (!apiKey) {
      await logError('initial_auth_get_api_key', new Error('CRITICAL - SHOPIFY_API_KEY is not loaded from params!'), shop, { requestQuery: req.query });
      return res.status(500).send("Server configuration error: API Key is missing.");
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${getFunctionsBaseUrl()}/auth/callback`;

  try {
    await db.collection("shops").doc(shop).set({ state }, { merge: true });
    const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&state=${state}&redirect_uri=${redirectUri}`;
    res.redirect(installUrl);
  } catch (error) {
    await logError('initial_auth_firestore_error', error, shop, { requestQuery: req.query });
    res.status(500).send("Error initiating authentication.");
  }
});

app.get("/auth/callback", async (req, res) => {
    const { shop, hmac, code, state } = req.query;

    if (!shop || !hmac || !code || !state) {
        await logError('callback_params_check', new Error('A required query parameter is missing.'), shop, { requestQuery: req.query });
        return res.status(400).send("Required parameters are missing.");
    }

    const apiSecret = shopifyApiSecret.value();
    if (!apiSecret) {
        await logError('get_api_secret', new Error('SHOPIFY_API_SECRET is not loaded from params!'), shop, { requestQuery: req.query });
        return res.status(500).send("Server configuration error.");
    }

    const map = { ...req.query };
    delete map.hmac;
    const message = new URLSearchParams(map).toString();
    const generatedHmac = crypto.createHmac('sha256', apiSecret).update(message).digest('hex');

    if (generatedHmac !== hmac) {
        await logError('hmac_validation', new Error('HMAC validation failed.'), shop, { generatedHmac, receivedHmac: hmac, requestQuery: req.query });
        return res.status(400).send("HMAC validation failed.");
    }

    try {
        const shopDoc = await db.collection("shops").doc(shop).get();
        const storedState = shopDoc.exists ? shopDoc.data().state : null;

        if (!storedState || storedState !== state) {
            await logError('nonce_verification', new Error('Nonce verification failed: state mismatch.'), shop, { storedState, receivedState: state, requestQuery: req.query });
            return res.status(403).send("Request origin cannot be verified.");
        }
    } catch (error) {
        await logError('nonce_firestore_error', error, shop, { requestQuery: req.query });
        return res.status(500).send("Error during nonce verification.");
    }

    const apiKey = shopifyApiKey.value();
    if (!apiKey) {
        await logError('get_api_key_callback', new Error('SHOPIFY_API_KEY is not loaded from params!'), shop, { requestQuery: req.query });
        return res.status(500).send("Server configuration error.");
    }
    const shopify = new Shopify({ shopName: shop, apiKey: apiKey, apiSecret: apiSecret });

    try {
        const accessToken = await shopify.exchange_temporary_code({ code });

        const shopData = {
            shopDomain: shop,
            accessToken: accessToken,
            isActive: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection("shops").doc(shop).set(shopData, { merge: true });

        const host = req.query.host;
        if (!host) {
            const redirectUrl = `https://admin.shopify.com/store/${shop.split('.')[0]}/apps/${appName}`;
            res.redirect(redirectUrl);
            return;
        }
        const encodedHost = Buffer.from(host, 'utf-8').toString('base64');
        const redirectUrl = `https://admin.shopify.com/store/${shop.split('.')[0]}/apps/${appName}?shop=${shop}&host=${encodedHost}`;
        res.redirect(redirectUrl);

    } catch (error) {
        await logError('exchange_temporary_code', error, shop, { response: error.response ? error.response.body : 'No response body', requestQuery: req.query });
        res.status(500).send(error.message || "An error occurred during the final step.");
    }
});


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
