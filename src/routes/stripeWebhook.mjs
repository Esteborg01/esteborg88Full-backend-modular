// src/routes/stripeWebhook.mjs
import Stripe from "stripe";
import { getDb } from "../config/mongoClient.mjs";
import {
  getVipDurationDays,
  getModulesForPlan,
  computeRenewedExpiry,
} from "../core/vipRules.mjs";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("stripe_secret_missing");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function stripeWebhookHandler(req, res) {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("❌ STRIPE_WEBHOOK_SECRET missing");
    return res.status(500).send("webhook_secret_missing");
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("❌ Stripe webhook signature failed:", err?.message || err);
    return res.status(400).send("signature_verification_failed");
  }

  try {
    // Solo procesamos cuando el checkout terminó
    if (event.type !== "checkout.session.completed") {
      return res.json({ received: true });
    }

    const session = event.data.object;

    const email =
      session?.customer_details?.email ||
      session?.customer_email ||
      null;

    const plan = session?.metadata?.plan || null;

    if (!email || !plan) {
      console.warn("⚠️ Webhook missing email or plan", { email, plan });
      return res.json({ received: true });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const days = getVipDurationDays(plan);
    const modules = getModulesForPlan(plan);

    // Coaching (days=0, modules=[]) no da acceso VIP
    const shouldGrantVip = days > 0 && modules.length > 0;

    const db = await getDb();
    const users = db.collection("users");

    const existing = await users.findOne({ email: normalizedEmail });

    // unión de módulos (si ya tenía otros)
    const prevMods = Array.isArray(existing?.modulesAllowed) ? existing.modulesAllowed : [];
    const nextMods = Array.from(new Set([...prevMods, ...modules]));

    let nextVipExpiresAt = existing?.vipExpiresAt || null;
    if (shouldGrantVip) {
      nextVipExpiresAt = computeRenewedExpiry(existing?.vipExpiresAt || null, days);
    }

    const now = new Date();

    if (!existing) {
      await users.insertOne({
        email: normalizedEmail,
        // ✅ Usuario creado por compra: aún no tiene password
        passwordHash: null,
        plan: plan,
        modulesAllowed: shouldGrantVip ? nextMods : [],
        vipExpiresAt: shouldGrantVip ? nextVipExpiresAt : null,
        status: "active",
        emailVerified: true, // ✅ para no frenar login por verify
        createdAt: now,
        updatedAt: now,

        // trazabilidad
        stripe: {
          lastSessionId: session.id,
          customerId: session.customer || null,
        },
      });
    } else {
      await users.updateOne(
        { _id: existing._id },
        {
          $set: {
            plan: plan,
            modulesAllowed: shouldGrantVip ? nextMods : (existing.modulesAllowed || []),
            vipExpiresAt: shouldGrantVip ? nextVipExpiresAt : (existing.vipExpiresAt || null),
            emailVerified: true,
            updatedAt: now,
            "stripe.lastSessionId": session.id,
            "stripe.customerId": session.customer || existing?.stripe?.customerId || null,
          },
          $setOnInsert: { createdAt: now },
        }
      );
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    // Stripe requiere 2xx para no reintentar infinito.
    // Pero aquí mejor regresamos 200 y ya lo revisamos en logs si truena.
    return res.json({ received: true });
  }
}
