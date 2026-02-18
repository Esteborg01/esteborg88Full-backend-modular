import express from "express";
import Stripe from "stripe";
import { getDb } from "../config/mongoClient.mjs";
import { addDays } from "../core/vipRules.mjs";
import { requireAuth } from "../middleware/requireAuth.mjs";
import { getPlanConfig } from "../core/planCatalog.mjs";

const router = express.Router();

function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY_missing");
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
}

function priceIdFromPlan(plan) {
  const map = JSON.parse(process.env.STRIPE_PRICE_MAP || "{}");
  return map[plan] || null;
}

// ✅ Crear Checkout (PAGO ÚNICO) — requiere login
router.post("/billing/checkout", requireAuth, async (req, res) => {
  try {
    const { plan } = req.body || {};
    if (!plan) return res.status(400).json({ ok: false, error: "plan_required" });

    const cfg = getPlanConfig(plan);
    if (!cfg) return res.status(400).json({ ok: false, error: "invalid_plan" });

    const priceId = priceIdFromPlan(plan);
    if (!priceId) return res.status(400).json({ ok: false, error: "price_not_found" });

    const appUrl = process.env.APP_URL || "https://membersvip.esteborg.live";

    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: req.user?.email,
      success_url: `${appUrl}/#miembrosvip?paid=1`,
      cancel_url: `${appUrl}/#miembrosvip?canceled=1`,
      metadata: {
        plan,
        userEmail: String(req.user?.email || "").toLowerCase().trim(),
      },
    });

    return res.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("checkout error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

// ✅ Webhook Stripe — requiere RAW body (lo montamos especial en server.mjs)
router.post("/billing/webhook", async (req, res) => {
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(500).json({ ok: false, error: "STRIPE_WEBHOOK_SECRET_missing" });
    }

    const stripe = stripeClient();
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (e) {
      console.error("webhook signature error:", e.message);
      return res.status(400).send(`Webhook Error: ${e.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const plan = session?.metadata?.plan;
      const email = (session?.metadata?.userEmail || session?.customer_details?.email || "")
        .toLowerCase()
        .trim();

      const cfg = getPlanConfig(plan);
      if (!cfg || !email) return res.json({ ok: true });

      const db = await getDb();
      const users = db.collection("users");

      const vipExpiresAt = addDays(new Date(), cfg.days);

      await users.updateOne(
        { email },
        {
          $set: {
            status: "active",
            plan,
            modulesAllowed: cfg.modulesAllowed,
            vipExpiresAt,
            lastPaymentAt: new Date(),
            stripeCustomerId: session.customer || null,
            updatedAt: new Date(),
          },
        }
      );
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("webhook error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;
