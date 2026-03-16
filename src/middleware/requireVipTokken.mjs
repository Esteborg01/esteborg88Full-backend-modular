import jwt from "jsonwebtoken";
import { MongoClient } from "mongodb";

let client;
let db;

async function getDb(){

 if(db) return db;

 client = new MongoClient(process.env.MONGO_URI);
 await client.connect();

 db = client.db();

 return db;
}

export async function requireVipToken(req,res,next){

 const auth = req.headers.authorization;

 if(!auth){
  return res.status(401).json({error:"token_required"});
 }

 const token = auth.replace("Bearer ","");

 try{

 const decoded = jwt.verify(token,process.env.JWT_SECRET);

 const database = await getDb();
 const users = database.collection("users");

 const user = await users.findOne({email:decoded.email});

 if(!user){
  return res.status(401).json({error:"user_not_found"});
 }

 if(!user.vip){
  return res.status(403).json({error:"vip_required"});
 }

 if(user.vipExpiresAt && new Date() > new Date(user.vipExpiresAt)){
  return res.status(403).json({error:"membership_expired"});
 }

 req.user = user;

 next();

 }catch(err){

 res.status(401).json({error:"invalid_token"});

 }

}
