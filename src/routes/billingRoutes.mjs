import express from "express";
import Stripe from "stripe";

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
 apiVersion: "2024-06-20"
});

/* =========================
PRICE MAP
========================= */

let PRICE_MAP = {};

try {
 PRICE_MAP = JSON.parse(process.env.STRIPE_PRICE_MAP || "{}");
} catch (e) {
 console.error("Invalid STRIPE_PRICE_MAP");
}

/* =========================
CREATE CHECKOUT SESSION
========================= */

router.post("/billing/create-checkout", async (req, res) => {

 try {

 const { plan, email } = req.body;

 if (!plan) {
  return res.status(400).json({
   ok: false,
   error: "missing_plan"
  });
 }

 const priceId = PRICE_MAP[plan];

 if (!priceId) {
  return res.status(400).json({
   ok: false,
   error: "invalid_plan"
  });
 }

 const session = await stripe.checkout.sessions.create({

  mode: "payment",

  payment_method_types: ["card"],

  line_items: [
   {
    price: priceId,
    quantity: 1
   }
  ],

  success_url: process.env.STRIPE_SUCCESS_URL,
  cancel_url: process.env.STRIPE_CANCEL_URL,

  customer_email: email,

  metadata: {
   email: email,
   plan: plan
  }

 });

 res.json({
  ok: true,
  url: session.url
 });

 } catch (err) {

 console.error("Stripe checkout error:", err);

 res.status(500).json({
  ok: false,
  error: "stripe_checkout_failed"
 });

 }

});

export default router;
