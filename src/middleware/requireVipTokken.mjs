import jwt from "jsonwebtoken";

export default function requireVipToken(req,res,next){

 const auth = req.headers.authorization;

 if(!auth){
  return res.status(401).json({ok:false,error:"token_required"});
 }

 const token = auth.replace("Bearer ","");

 try{

 const decoded = jwt.verify(token,process.env.JWT_SECRET);

 if(!decoded.vip){
  return res.status(403).json({ok:false,error:"vip_required"});
 }

 req.user = decoded;

 next();

 }catch(err){

 return res.status(401).json({ok:false,error:"invalid_token"});

 }

}
