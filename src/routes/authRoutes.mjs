import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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

router.post("/auth/login", async (req,res)=>{

 try{

 const {email,password} = req.body;

 const database = await getDb();
 const users = database.collection("users");

 const user = await users.findOne({email});

 if(!user){
  return res.status(401).json({error:"user_not_found"});
 }

 const valid = await bcrypt.compare(password,user.password);

 if(!valid){
  return res.status(401).json({error:"invalid_password"});
 }

 if(!user.vip){
  return res.status(403).json({error:"vip_required"});
 }

 const token = jwt.sign({

  uid:user._id,
  email:user.email,
  vip:true

 },
 process.env.JWT_SECRET,
 {expiresIn:"7d"});

 res.json({
  ok:true,
  token
 });

 }catch(err){

 res.status(500).json({error:"login_failed"});

 }

});

export default router;
