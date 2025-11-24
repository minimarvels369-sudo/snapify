// Force redeploy
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
// Use express.json() for auth routes, but raw body for webhook verification
app.use((req, res, next) => {
  if (req.path.includes('/webhooks')) {
    // Pass raw body for webhook verification
    next();
  } else {
    express.json()(req, res, next);
  }
});


// IMPORTANT: Set these in your .env file
const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const appName = process.env.APP_NAME || 'snapify';

const scopes = "read_products,write_products,read_product_listings,write_product_listings";

/**
 * Returns the base URL for the cloud functions.
 * @returns {string} The base URL.
 */
function getFunctionsBaseUrl() {
    const region = process.env.FUNCTION_REGION || 'us-central1';
    const projectId = process.env.GCLOUD_PROJECT;
    if (!projectId) {
        console.error("GCLOUD_PROJECT not set, cannot determine function URL");
        return `https://[REGION]-[PROJECT_ID].cloudfunctions.net/api`;
    }
    return `https://${region}-${projectId}.cloudfunctions.net/api`;
}

/**
 * Route: /api/auth
 * Description: Starts the Shopify OAuth flow.
 * It builds the authorization URL and redirects the user to it.
 */
app.post("/auth", (req, res) => {
  const { shop } = req.body;
  if (!shop) {
    return res.status(400).send("Missing shop parameter.");
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${getFunctionsBaseUrl()}/auth/callback`;

  // Store the nonce in Firestore for later verification
  db.collection("shops").doc(shop).set({ state }, { merge: true })
    .then(() => {
      const installUrl = `https://{shop}.myshopify.com/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&state=${state}&redirect_uri=${redirectUri}`;
      res.json({ installUrl: installUrl.replace('{shop}', shop) });
    })
    .catch(error => {
      console.error("Error storing state:", error);
      res.status(500).send("Error initiating authentication.");
    });
});

/**
 * Route: /api/auth/callback
 * Description: Handles the callback from Shopify after authorization.
 * It verifies the request, exchanges the authorization code for an access token,
 * and stores the shop data in Firestore.
 */
app.get("/auth/callback", async (req, res) => {
  const { shop, hmac, code, state } = req.query;

  if (!shop || !hmac || !code || !state) {
    return res.status(400).send("Required parameters are missing.");
  }

  // 1. HMAC Validation
  const map = { ...req.query };
  delete map.hmac;
  const message = new URLSearchParams(map).toString();
  
  let shopifyHmac;
  if (typeof hmac === 'string') {
    shopifyHmac = Buffer.from(hmac, 'utf-8');
  } else if (Array.isArray(hmac)) {
    // Take the first element if hmac is an array
    shopifyHmac = Buffer.from(hmac[0], 'utf-8');
  } else {
    return res.status(400).send('HMAC validation failed: Invalid hmac parameter.');
  }

  const generatedHmac = crypto.createHmac('sha256', apiSecret).update(message).digest();

  if (!crypto.timingSafeEqual(generatedHmac, shopifyHmac)) {
    return res.status(400).send("HMAC validation failed.");
  }
  
  // 2. Nonce Verification
  const shopDoc = await db.collection("shops").doc(shop).get();
  if (!shopDoc.exists || shopDoc.data().state !== state) {
    return res.status(403).send("Request origin cannot be verified.");
  }

  const shopify = new Shopify({
    shopName: shop,
    apiKey: apiKey,
    apiSecret: apiSecret,
  });

  try {
    // 3. Exchange authorization code for an access token
    const accessToken = await shopify.exchange_temporary_code({ code });

    // 4. Store shop data securely in Firestore
    await db.collection("shops").doc(shop).set({
      shopDomain: shop,
      accessToken: accessToken,
      plan: "free",
      credits: 100,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
    }, { merge: true });

    // 5. Register webhooks automatically
    await registerWebhooks(shop, accessToken);
    
    // 6. Get the host to redirect to the embedded app
    const host = req.query.host;
    if (!host) {
        return res.status(400).send("Host parameter is missing. Cannot redirect.");
    }
    const encodedHost = Buffer.from(host, 'utf-8').toString('base64');
    
    // Redirect to the app's root in Shopify admin
    res.redirect(`https://admin.shopify.com/store/${shop.split('.')[0]}/apps/${appName}?shop=${shop}&host=${encodedHost}`);
  } catch (error) {
    console.error("Error during OAuth callback:", error);
    res.status(500).send(error.message);
  }
});

/**
 * Registers the necessary webhooks for the app.
 * @param {string} shopDomain - The shop domain.
 * @param {string} accessToken - The shop's access token.
 */
async function registerWebhooks(shopDomain, accessToken) {
    const shopify = new Shopify({
        shopName: shopDomain,
        accessToken: accessToken,
    });

    const baseUrl = getFunctionsBaseUrl();
    const webhookTopics = [
        { topic: 'products/create', address: `${baseUrl}/webhooks/products/create` },
        { topic: 'products/update', address: `${baseUrl}/webhooks/products/update` },
        { topic: 'products/delete', address: `${baseUrl}/webhooks/products/delete` },
    ];

    // First, delete any existing webhooks for this app to avoid duplicates
    try {
        const existingWebhooks = await shopify.webhook.list();
        for (const webhook of existingWebhooks) {
            // Check if the webhook address belongs to our function
            if (webhook.address.startsWith(baseUrl)) {
                await shopify.webhook.delete(webhook.id);
                console.log(`Deleted existing webhook ${webhook.id} for topic ${webhook.topic}`);
            }
        }
    } catch (error) {
        console.error('Error deleting existing webhooks:', error);
    }
    
    // Then, create the new webhooks
    for (const { topic, address } of webhookTopics) {
        try {
            await shopify.webhook.create({
                topic: topic,
                address: address,
                format: 'json',
            });
            console.log(`Webhook created for topic: ${topic} at ${address}`);
        } catch (error) {
            // It's possible the webhook already exists, check for that error
            if (error.response && error.response.body && error.response.body.errors && error.response.body.errors.address) {
                 console.warn(`Webhook for ${topic} might already exist:`, error.response.body.errors.address);
            } else {
                console.error(`Failed to create webhook for ${topic}:`, error);
            }
        }
    }
}


/**
 * Route: /api/auth/verify
 * Description: Verifies if a shop has an active session (i.e., exists in Firestore).
 */
app.post("/auth/verify", async (req, res) => {
  const { shop } = req.body;
  if (!shop) {
    return res.status(400).send("Missing shop parameter.");
  }

  try {
    const shopDoc = await db.collection("shops").doc(shop).get();
    if (shopDoc.exists && shopDoc.data().isActive) {
      res.json({ authenticated: true });
    } else {
      res.json({ authenticated: false });
    }
  } catch (error) {
    console.error("Error verifying auth:", error);
    res.status(500).send("Error verifying session.");
  }
});


/**
 * Fetches a Shopify client instance with the stored access token.
 * @param {string} shopDomain The Shopify domain (e.g., 'your-shop.myshopify.com').
 * @returns {Promise<Shopify>} A Shopify API client instance.
 */
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

/**
 * GraphQL query to fetch products with pagination.
 */
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

/**
 * Recursively fetches all products from a Shopify store using GraphQL pagination.
 * @param {Shopify} shopify - The Shopify API client.
 * @param {string|null} cursor - The pagination cursor.
 * @returns {Promise<Array>} A list of all products.
 */
async function fetchAllProducts(shopify, cursor = null) {
    try {
        const response = await shopify.graphql(productsQuery, { first: 250, after: cursor });
        const products = response.products.edges.map(edge => ({
            ...edge.node,
            // Keep description in descriptionHtml for consistency
        }));

        if (response.products.pageInfo.hasNextPage) {
            const lastCursor = response.products.edges[response.products.edges.length - 1].cursor;
            // Small delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
            const nextProducts = await fetchAllProducts(shopify, lastCursor);
            return products.concat(nextProducts);
        } else {
            return products;
        }
    } catch (error) {
        console.error('Error fetching products from Shopify:', error.response ? error.response.body : error);
        // Implement retry logic or better error logging here
        throw new Error('Failed to fetch products from Shopify');
    }
}

/**
 * Route: /api/products/sync
 * Description: Fetches all products from Shopify and saves them to Firestore.
 */
app.post("/products/sync", async (req, res) => {
    const { shop } = req.body;
    
    // التأكد من وجود اسم المتجر
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
            // التأكد من أن الـ ID string
            const productId = String(product.id).split('/').pop();
            const productRef = db.collection('shops').doc(shop).collection('products').doc(productId);
            batch.set(productRef, product, { merge: true });
        });
        
        await batch.commit();

        await db.collection('shops').doc(shop).update({
            productsSyncedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // الرد الناجح بصيغة JSON
        res.status(200).json({ success: true, message: `Synced ${products.length} products successfully.` });

    } catch (error) {
        console.error("Error syncing products:", error);
        
        // === هنا كان سبب المشكلة ===
        // تم التغيير من send إلى json ليفهمها التطبيق
        res.status(500).json({ 
            success: false, 
            message: error.message || "Internal Server Error during sync" 
        });
    }
});

/**
 * Route: /api/products
 * Description: Fetches products for a shop from Firestore.
 */
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

/**
 * Route: /api/products/:productId
 * Description: Fetches a single product for a shop from Firestore.
 */
app.get("/products/:productId", async (req, res) => {
    const { shop } = req.query;
    const { productId } = req.params;

    if (!shop) {
        return res.status(400).send("Missing shop parameter.");
    }
    if (!productId) {
        return res.status(400).send("Missing product ID parameter.");
    }

    try {
        const productRef = db.collection('shops').doc(shop).collection('products').doc(productId);
        const doc = await productRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: "Product not found." });
        }
        // Return the product data, combining the ID and the rest of the data
        res.status(200).json({ product: { id: doc.id, ...doc.data() } });
    } catch (error) {
        console.error(`Error fetching product ${productId} from Firestore for ${shop}:`, error);
        res.status(500).send("Could not fetch product.");
    }
});


// Middleware to verify Shopify webhooks
const verifyShopifyWebhook = (req, res, next) => {
    const hmac = req.get('X-Shopify-Hmac-Sha256');
    if (!hmac) {
        return res.status(401).send('HMAC signature is missing');
    }
    
    // express.raw({type: 'application/json'}) should make req.body a buffer
    const rawBody = req.body;

    const genHash = crypto
        .createHmac('sha256', apiSecret)
        .update(rawBody)
        .digest('base64');
    
    let providedHmac;
    try {
        providedHmac = Buffer.from(hmac, 'base64');
    } catch(e) {
        return res.status(401).send('Invalid HMAC format');
    }
    
    const generatedHash = Buffer.from(genHash, 'base64');

    if (crypto.timingSafeEqual(providedHmac, generatedHash)) {
        // HMAC is valid, parse body and move on
        try {
          req.body = JSON.parse(rawBody.toString('utf8'));
          next();
        } catch (e) {
          console.error("Error parsing webhook body:", e);
          res.status(400).send("Invalid JSON body.");
        }
    } else {
        res.status(401).send('HMAC signature is invalid');
    }
};


app.post("/webhooks/products/create", express.raw({type: 'application/json'}), verifyShopifyWebhook, async (req, res) => {
    const shop = req.get('X-Shopify-Shop-Domain');
    const product = req.body;
    const productId = product.id.toString();

    try {
        const productRef = db.collection('shops').doc(shop).collection('products').doc(productId);
        await productRef.set(product, { merge: true });
        console.log(`Product ${productId} created for shop ${shop}`);
        res.status(200).send('OK');
    } catch (error) {
        console.error(`Failed to create product ${productId} for ${shop}:`, error);
        res.status(500).send('Internal Server Error');
    }
});

app.post("/webhooks/products/update", express.raw({type: 'application/json'}), verifyShopifyWebhook, async (req, res) => {
    const shop = req.get('X-Shopify-Shop-Domain');
    const product = req.body;
    const productId = product.id.toString();

    try {
        const productRef = db.collection('shops').doc(shop).collection('products').doc(productId);
        await productRef.update(product);
        console.log(`Product ${productId} updated for shop ${shop}`);
        res.status(200).send('OK');
    } catch (error) {
        console.error(`Failed to update product ${productId} for ${shop}:`, error);
        res.status(500).send('Internal Server Error');
    }
});

app.post("/webhooks/products/delete", express.raw({type: 'application/json'}), verifyShopifyWebhook, async (req, res) => {
    const shop = req.get('X-Shopify-Shop-Domain');
    const { id } = req.body;
    const productId = id.toString();
    
    try {
        const productRef = db.collection('shops').doc(shop).collection('products').doc(productId);
        await productRef.delete();
        console.log(`Product ${productId} deleted for shop ${shop}`);
        res.status(200).send('OK');
    } catch (error) {
        console.error(`Failed to delete product ${productId} for ${shop}:`, error);
        res.status(500).send('Internal Server Error');
    }
});


exports.api = functions.https.onRequest(app);
