import express from "express";
import Stripe from "stripe";
import crypto from "crypto";

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const APP_URL = process.env.APP_URL;

function getPriceMap() {
  try {
    return JSON.parse(process.env.STRIPE_PRICE_MAP || "{}");
  } catch {
    return {};
  }
}

router.post("/billing/create-checkout", async (req, res) => {
  try {
    const { plan } = req.body || {};
    const priceMap = getPriceMap();

    const priceId = priceMap[plan];
    if (!priceId) {
      return res.status(400).json({
        ok: false,
        error: "invalid_plan"
      });
    }

    const checkoutToken = crypto.randomBytes(24).toString("hex");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      customer_creation: "always",
      success_url: `${APP_URL}/#postpago?ct=${checkoutToken}`,
      cancel_url: `${APP_URL}/#home`,
      metadata: {
        plan,
        checkoutToken
      }
    });

    return res.json({
      ok: true,
      url: session.url
    });
  } catch (err) {
    console.error("❌ CREATE CHECKOUT ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "checkout_error"
    });
  }
});

export default router;
