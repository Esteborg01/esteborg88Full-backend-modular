import Stripe from "stripe";
import { MongoClient } from "mongodb";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20"
});

let mongoClient;
let db;

/* =========================
Mongo lazy init
========================= */
async function getDb() {
  if (db) return db;

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI missing");
  }

  mongoClient = new MongoClient(process.env.MONGO_URI);
  await mongoClient.connect();
  db = mongoClient.db();

  console.log("✅ Mongo connected (webhook)");

  return db;
}

/* =========================
Stripe Webhook Handler
========================= */

export const stripeWebhookHandler = async (req, res) => {

  const sig = req.headers["stripe-signature"];

  if (!sig) {
    return res.status(400).send("Missing stripe signature");
  }

  let event;

  try {

    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

  } catch (err) {

    console.error("❌ Stripe signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);

  }

  try {

    const database = await getDb();
    const users = database.collection("users");

    /* =========================
    checkout.session.completed
    ========================= */

    if (event.type === "checkout.session.completed") {

      const session = event.data.object;

      const email =
        session.customer_details?.email ||
        session.customer_email ||
        session.metadata?.email;

      if (!email) {
        console.error("⚠️ Stripe session without email");
        return res.json({ received: true });
      }

      console.log("💰 Pago completado:", email);

      await users.updateOne(
        { email },
        {
          $set: {
            email,
            vip: true,
            emailVerified: true,
            stripeCustomerId: session.customer || null,
            stripeSessionId: session.id,
            vipActivatedAt: new Date(),
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      console.log("✅ Usuario VIP activado:", email);
    }

    /* =========================
    invoice.payment_succeeded
    (renovaciones)
    ========================= */

    if (event.type === "invoice.payment_succeeded") {

      const invoice = event.data.object;

      const email = invoice.customer_email;

      if (email) {

        console.log("🔁 Renovación pagada:", email);

        await users.updateOne(
          { email },
          {
            $set: {
              vip: true,
              vipRenewedAt: new Date(),
              updatedAt: new Date()
            }
          }
        );
      }
    }

    /* =========================
    customer.subscription.deleted
    (cancelación)
    ========================= */

    if (event.type === "customer.subscription.deleted") {

      const subscription = event.data.object;

      const email = subscription.customer_email;

      if (email) {

        console.log("❌ Suscripción cancelada:", email);

        await users.updateOne(
          { email },
          {
            $set: {
              vip: false,
              vipCanceledAt: new Date(),
              updatedAt: new Date()
            }
          }
        );
      }
    }

    res.json({ received: true });

  } catch (err) {

    console.error("❌ Webhook processing error:", err);
    res.status(500).send("Webhook handler failed");

  }
};
