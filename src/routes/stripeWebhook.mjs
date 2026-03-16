import express from "express";
import Stripe from "stripe";

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default function stripeWebhook(db){

const users = db.collection("users");

router.post("/webhook",express.raw({type:"application/json"}),async(req,res)=>{

 let event;

 try{

 event = stripe.webhooks.constructEvent(
  req.body,
  req.headers["stripe-signature"],
  process.env.STRIPE_WEBHOOK_SECRET
 );

 }catch(err){

 return res.status(400).send(`Webhook error ${err.message}`);

 }

 if(event.type === "checkout.session.completed"){

 const session = event.data.object;

 const email = session.customer_details.email;

 await users.updateOne(
 {email},
 {
  $set:{
   email,
   vip:true,
   emailVerified:true,
   stripeCustomerId:session.customer,
   updatedAt:new Date()
  }
 },
 {upsert:true}
 );

 }

 res.json({received:true});

});

return router;

}
