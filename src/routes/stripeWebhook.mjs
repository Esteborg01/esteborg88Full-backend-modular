import Stripe from "stripe";
import { MongoClient } from "mongodb";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

let client;
let db;

async function getDb(){

 if(db) return db;

 client = new MongoClient(process.env.MONGO_URI);
 await client.connect();

 db = client.db();

 return db;
}

export const stripeWebhookHandler = async (req,res)=>{

 const sig = req.headers["stripe-signature"];

 let event;

 try{

 event = stripe.webhooks.constructEvent(
  req.body,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
 );

 }catch(err){

 console.error("Stripe signature error:",err.message);
 return res.status(400).send(err.message);

 }

 const database = await getDb();
 const users = database.collection("users");

 if(event.type === "checkout.session.completed"){

 const session = event.data.object;

 const email =
 session.customer_details?.email ||
 session.customer_email ||
 session.metadata?.email;

 if(!email){

  console.error("Stripe session without email");
  return res.json({received:true});

 }

 const expiresAt = new Date();
 expiresAt.setMonth(expiresAt.getMonth() + 1);

 await users.updateOne(
  {email},
  {
   $set:{
    email,
    vip:true,
    emailVerified:true,
    vipExpiresAt:expiresAt,
    stripeCustomerId:session.customer,
    vipActivatedAt:new Date(),
    updatedAt:new Date()
   }
  },
  {upsert:true}
 );

 console.log("VIP activado:",email);

 }

 res.json({received:true});

};
