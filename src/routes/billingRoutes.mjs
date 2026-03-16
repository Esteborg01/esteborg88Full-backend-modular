import express from "express";
import Stripe from "stripe";

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_MAP = JSON.parse(process.env.STRIPE_PRICE_MAP || "{}");

router.post("/billing/create-checkout", async (req,res)=>{

 try{

 const {plan,email} = req.body;

 const priceId = PRICE_MAP[plan];

 if(!priceId){
  return res.status(400).json({error:"invalid_plan"});
 }

 const session = await stripe.checkout.sessions.create({

  mode:"payment",

  payment_method_types:["card"],

  line_items:[
   {
    price:priceId,
    quantity:1
   }
  ],

  customer_email:email,

  success_url:process.env.STRIPE_SUCCESS_URL,
  cancel_url:process.env.STRIPE_CANCEL_URL,

  metadata:{
   email,
   plan
  }

 });

 res.json({
  ok:true,
  url:session.url
 });

 }catch(err){

 console.error("Stripe error:",err);
 res.status(500).json({error:"checkout_failed"});

 }

});

export default router;
