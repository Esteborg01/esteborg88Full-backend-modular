import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default function authRoutes(db){

const router = express.Router();
const users = db.collection("users");

router.post("/login", async (req,res)=>{

 try{

 const {email,password}=req.body;

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

 const token = jwt.sign(
 {
  uid:user._id,
  email:user.email,
  vip:true
 },
 process.env.JWT_SECRET,
 {expiresIn:"7d"}
 );

 res.json({ok:true,token});

 }catch(e){

 res.status(500).json({ok:false});

 }

});

return router;

}
