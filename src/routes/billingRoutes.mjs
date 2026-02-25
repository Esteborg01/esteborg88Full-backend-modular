import express from "express";
import Stripe from "stripe";

const router = express.Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    const e = new Error("stripe_secret_missing");
    e.code = "stripe_secret_missing";
    throw e;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function getPriceMap() {
  // STRIPE_PRICE_MAP ejemplo:
  // {"vip30":"price_123","ia90":"price_456","vippremium":"price_789"}
  try {
    return JSON.parse(process.env.STRIPE_PRICE_MAP || "{}");
  } catch {
    return {};
  }
}

// POST /api/billing/checkout
router.post("/billing/checkout", async (req, res) => {
  try {
    const { plan } = req.body || {};
    if (!plan) return res.status(400).json({ ok: false, error: "missing_plan" });

    const priceMap = getPriceMap();
    const priceId = priceMap[String(plan)];
    if (!priceId) {
      return res.status(400).json({ ok: false, error: "unknown_plan", plan });
    }

    const stripe = getStripe();

    const successUrl = process.env.STRIPE_SUCCESS_URL || "https://membersvip.esteborg.live/#miembrosvip";
    const cancelUrl  = process.env.STRIPE_CANCEL_URL  || "https://membersvip.esteborg.live/#home";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Tip: si quieres amarrar el usuario por email/token luego, lo metemos aquí.
    });

    return res.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("checkout error:", err);
    if (err?.code === "stripe_secret_missing") {
      return res.status(500).json({ ok: false, error: "stripe_secret_missing" });
    }
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;
