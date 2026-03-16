import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

const router = express.Router();

export default function authRoutes(db){

const users = db.collection("users");

/* =========================
REGISTER (solo admin o pruebas)
========================= */

router.post("/register", async (req,res)=>{

 try{

 const { email, password } = req.body;

 if(!email || !password){
  return res.status(400).json({ok:false,error:"missing_fields"});
 }

 const existing = await users.findOne({email});

 if(existing){
  return res.status(409).json({ok:false,error:"user_exists"});
 }

 const hash = await bcrypt.hash(password,10);

 const user = {
  email,
  password:hash,
  vip:false,
  emailVerified:false,
  createdAt:new Date()
 };

 await users.insertOne(user);

 return res.json({ok:true});

 }catch(err){

 return res.status(500).json({ok:false,error:"register_error"});

 }

});


/* =========================
LOGIN
========================= */

router.post("/login", async (req,res)=>{

 try{

 const { email,password } = req.body;

 const user = await users.findOne({email});

 if(!user){
  return res.status(401).json({ok:false,error:"user_not_found"});
 }

 const valid = await bcrypt.compare(password,user.password);

 if(!valid){
  return res.status(401).json({ok:false,error:"invalid_password"});
 }

 if(!user.vip){
  return res.status(403).json({ok:false,error:"vip_required"});
 }

 if(!user.emailVerified){
  return res.status(403).json({ok:false,error:"email_not_verified"});
 }

 const token = jwt.sign(
 {
  uid:user._id,
  email:user.email,
  vip:true
 },
 process.env.JWT_SECRET,
 {expiresIn:"7d"}
 );

 return res.json({
  ok:true,
  token,
  email:user.email,
  vip:true
 });

 }catch(err){

 return res.status(500).json({ok:false,error:"login_error"});

 }

});


/* =========================
VERIFY TOKEN
========================= */

router.get("/verify",async(req,res)=>{

 const auth = req.headers.authorization;

 if(!auth){
  return res.status(401).json({ok:false});
 }

 const token = auth.replace("Bearer ","");

 try{

 const decoded = jwt.verify(token,process.env.JWT_SECRET);

 return res.json({ok:true,user:decoded});

 }catch(e){

 return res.status(401).json({ok:false});

 }

});

return router;

}
