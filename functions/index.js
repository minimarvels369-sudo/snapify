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
app.use(express.json());

// IMPORTANT: Set these in your .env file
const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const appName = process.env.APP_NAME;

const scopes = "read_products,write_products,read_product_listings,write_product_listings";

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
  // The redirect URI must be an absolute URL
  const redirectUri = `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/api/auth/callback`;

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
  const providedHmac = Buffer.from(hmac, "utf-8");
  const generatedHash = Buffer.from(
    crypto.createHmac("sha256", apiSecret).update(message).digest("hex"),
    "utf-8"
  );

  let shopifyHmac;
  if (typeof hmac === 'string') {
    shopifyHmac = Buffer.from(hmac, 'utf-8');
  } else if (Array.isArray(hmac)) {
    // Handle the case where hmac is an array of strings, though unlikely for this parameter.
    // For this example, we'll just use the first element.
    shopifyHmac = Buffer.from(hmac[0], 'utf-8');
  } else {
    // hmac is undefined or not a string/array
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
      accessToken: accessToken, // In a production app, this should be encrypted
      plan: "free",
      credits: 100, // Initial credits
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
    }, { merge: true });
    
    // 5. Get the host to redirect to the embedded app
    const host = req.query.host;
    const encodedHost = Buffer.from(host, 'utf-8').toString('base64');
    
    // Redirect to the app's root in Shopify admin
    res.redirect(`https://admin.shopify.com/store/${shop.split('.')[0]}/apps/${appName}?shop=${shop}&host=${encodedHost}`);
  } catch (error) {
    console.error("Error during OAuth callback:", error);
    res.status(500).send(error.message);
  }
});


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


exports.api = functions.https.onRequest(app);
