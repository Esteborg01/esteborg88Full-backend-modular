import Stripe from "stripe";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function planToModules(plan) {
  switch (plan) {
    case "planesteborgiaexperto":
      return ["iavipcom"];
    case "planesteborg30diascom":
      return ["comunica"];
    case "planesteborg30diasvts":
      return ["ventas"];
    case "evaluatuerp":
      return ["erpev"];
    case "planesteborg30diasbund":
      return ["comunica", "ventas"];
    case "vippremium":
      return ["iavipcom", "comunica", "ventas"];
    case "esteborgmaster":
      return ["iavipcom", "comunica", "ventas", "erpev"];
    case "planesteborgcoach1hr":
      return [];
    default:
      return [];
  }
}

function planDurationDays(plan) {
  switch (plan) {
    case "planesteborg30diascom":
    case "planesteborg30diasvts":
    case "evaluatuerp":
      return 30;
    case "planesteborg30diasbund":
      return 60;
    case "planesteborgiaexperto":
    case "vippremium":
    case "esteborgmaster":
      return 90;
    case "planesteborgcoach1hr":
      return 30;
    default:
      return 30;
  }
}

function addDaysISO(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export async function stripeWebhookHandler(req, res) {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ STRIPE SIGNATURE ERROR:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const email =
        session.customer_details?.email ||
        session.customer_email ||
        null;

      const plan = session.metadata?.plan || null;
      const checkoutToken = session.metadata?.checkoutToken || null;

      if (!email || !plan || !checkoutToken) {
        console.error("❌ WEBHOOK MISSING DATA", { email, plan, checkoutToken });
        return res.json({ received: true });
      }

      const users = req.app.locals.db.collection("users");
      const checkoutLinks = req.app.locals.db.collection("checkout_links");

      const modulesAllowed = planToModules(plan);
      const vipExpiresAt = addDaysISO(planDurationDays(plan));
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpires = Date.now() + 1000 * 60 * 60 * 24; // 24h

      await users.updateOne(
        { email: email.trim().toLowerCase() },
        {
          $set: {
            email: email.trim().toLowerCase(),
            plan,
            modulesAllowed,
            vip: true,
            status: "active",
            emailVerified: true,
            vipExpiresAt,
            updatedAt: new Date(),
            resetToken,
            resetTokenExpires,
            stripe: {
              checkoutSessionId: session.id,
              customerId: session.customer || null,
              paymentStatus: session.payment_status || null
            }
          },
          $setOnInsert: {
            createdAt: new Date(),
            passwordHash: null
          }
        },
        { upsert: true }
      );

      await checkoutLinks.updateOne(
        { checkoutToken },
        {
          $set: {
            checkoutToken,
            email: email.trim().toLowerCase(),
            resetToken,
            used: false,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
          }
        },
        { upsert: true }
      );

      console.log("✅ WEBHOOK OK:", {
        email,
        plan,
        checkoutToken
      });
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err);
    return res.status(500).json({ received: false });
  }
}

export default stripeWebhookHandler;
