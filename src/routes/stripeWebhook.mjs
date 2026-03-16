// src/routes/stripeWebhook.mjs

import Stripe from "stripe";
import { MongoClient } from "mongodb";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

let client;
let db;

async function getDb() {
  if (db) return db;

  client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  db = client.db();

  return db;
}

function getPlanConfig(plan) {
  const normalized = String(plan || "").toLowerCase();

  const catalog = {
    iavipcom: {
      plan: "iavipcom",
      modulesAllowed: ["iavipcom"],
      durationDays: 30,
    },
    comunica: {
      plan: "comunica",
      modulesAllowed: ["comunica"],
      durationDays: 30,
    },
    ventas: {
      plan: "ventas",
      modulesAllowed: ["ventas"],
      durationDays: 30,
    },
    erpev: {
      plan: "erpev",
      modulesAllowed: ["erpev"],
      durationDays: 30,
    },
    vip: {
      plan: "vip",
      modulesAllowed: ["iavipcom", "comunica", "ventas", "erpev"],
      durationDays: 30,
    },
    full: {
      plan: "full",
      modulesAllowed: ["iavipcom", "comunica", "ventas", "erpev"],
      durationDays: 30,
    },
    esteborgfull: {
      plan: "esteborgfull",
      modulesAllowed: ["iavipcom", "comunica", "ventas", "erpev"],
      durationDays: 30,
    },
  };

  return (
    catalog[normalized] || {
      plan: normalized || "vip",
      modulesAllowed: ["iavipcom", "comunica", "ventas", "erpev"],
      durationDays: 30,
    }
  );
}

function buildExpiration(durationDays = 30) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  return expiresAt;
}

export const stripeWebhookHandler = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    return res.status(400).send("Missing stripe-signature header");
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Stripe signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const database = await getDb();
    const users = database.collection("users");

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const email =
        session.customer_details?.email ||
        session.customer_email ||
        session.metadata?.email ||
        "";

      const plan =
        session.metadata?.plan ||
        session.metadata?.module ||
        session.metadata?.product ||
        "vip";

      if (!email) {
        console.error("⚠️ checkout.session.completed sin email");
        return res.json({ received: true });
      }

      const planConfig = getPlanConfig(plan);
      const vipExpiresAt = buildExpiration(planConfig.durationDays);

      await users.updateOne(
        { email: email.toLowerCase().trim() },
        {
          $set: {
            email: email.toLowerCase().trim(),
            emailVerified: true,
            status: "active",
            vip: true,
            plan: planConfig.plan,
            modulesAllowed: planConfig.modulesAllowed,
            vipActivatedAt: new Date(),
            vipExpiresAt,
            stripeCustomerId: session.customer || null,
            stripeSessionId: session.id || null,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      console.log(
        "✅ VIP activado:",
        email,
        "| plan:",
        planConfig.plan,
        "| módulos:",
        planConfig.modulesAllowed.join(",")
      );
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;

      const email =
        invoice.customer_email ||
        invoice.metadata?.email ||
        "";

      const plan =
        invoice.metadata?.plan ||
        invoice.metadata?.module ||
        "vip";

      if (email) {
        const planConfig = getPlanConfig(plan);
        const vipExpiresAt = buildExpiration(planConfig.durationDays);

        await users.updateOne(
          { email: email.toLowerCase().trim() },
          {
            $set: {
              email: email.toLowerCase().trim(),
              emailVerified: true,
              status: "active",
              vip: true,
              plan: planConfig.plan,
              modulesAllowed: planConfig.modulesAllowed,
              vipRenewedAt: new Date(),
              vipExpiresAt,
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );

        console.log("🔁 Membresía renovada:", email);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;

      const email =
        subscription.metadata?.email ||
        "";

      if (email) {
        await users.updateOne(
          { email: email.toLowerCase().trim() },
          {
            $set: {
              status: "inactive",
              vip: false,
              modulesAllowed: [],
              vipCanceledAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );

        console.log("❌ Membresía cancelada:", email);
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    return res.status(500).send("Webhook handler failed");
  }
};
