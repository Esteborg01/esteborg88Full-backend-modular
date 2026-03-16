import express from "express";
import { MongoClient } from "mongodb";

const router = express.Router();

let client;
let db;

async function getDb(){

 if(db) return db;

 client = new MongoClient(process.env.MONGO_URI);
 await client.connect();

 db = client.db();

 return db;
}

router.get("/admin/users", async (req,res)=>{

 const database = await getDb();
 const users = database.collection("users");

 const list = await users.find({})
 .project({password:0})
 .toArray();

 res.json(list);

});

router.post("/admin/revoke", async (req,res)=>{

 const {email} = req.body;

 const database = await getDb();
 const users = database.collection("users");

 await users.updateOne(
  {email},
  {
   $set:{
    vip:false,
    vipExpiresAt:null
   }
  }
 );

 res.json({ok:true});

});

export default router;
