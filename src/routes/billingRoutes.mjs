// src/routes/billingRoutes.mjs
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
  try {
    return JSON.parse(process.env.STRIPE_PRICE_MAP || "{}");
  } catch {
    return {};
  }
}

/**
 * POST /api/billing/checkout
 * - No requiere token
 * - Manda directo a Stripe Checkout
 * - Metadata incluye `plan`
 * - ✅ customer_creation: "always" para que Stripe cree Customer incluso si total=0 (cupon 100%)
 */
router.post("/billing/checkout", async (req, res) => {
  try {
    const { plan } = req.body || {};
    if (!plan) return res.status(400).json({ ok: false, error: "missing_plan" });

    const planSlug = String(plan).trim();
    const priceMap = getPriceMap();
    const priceId = priceMap[planSlug];

    if (!priceId) {
      return res.status(400).json({ ok: false, error: "unknown_plan", plan: planSlug });
    }

    const stripe = getStripe();

    const successUrl =
      process.env.STRIPE_SUCCESS_URL || "https://membersvip.esteborg.live/#login?paid=1";
    const cancelUrl =
      process.env.STRIPE_CANCEL_URL || "https://membersvip.esteborg.live/#home";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],

      success_url: successUrl,
      cancel_url: cancelUrl,

      allow_promotion_codes: true,

      // ✅ Parche: fuerza creación de Customer aunque el total sea 0.00
      customer_creation: "always",

      // opcional (no rompe): Stripe decide si pedir dirección
      billing_address_collection: "auto",

      // ✅ Para que el webhook sepa el plan exacto
      metadata: { plan: planSlug },
    });

    return res.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("checkout error:", err);

    if (err?.code === "stripe_secret_missing") {
      return res.status(500).json({ ok: false, error: "stripe_secret_missing" });
    }

    // Mensaje útil si Stripe rechaza algo
    const stripeMsg = err?.raw?.message || err?.message || null;
    if (stripeMsg) {
      return res.status(500).json({ ok: false, error: "stripe_error", message: stripeMsg });
    }

    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;
