import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

import authRoutes from "./routes/authRoutes.mjs";
import stripeWebhook from "./routes/stripeWebhook.mjs";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI);

await client.connect();

const db = client.db();

app.use("/api/auth",authRoutes(db));
app.use("/api/stripe",stripeWebhook(db));

app.get("/health",(req,res)=>{
 res.json({status:"ok"});
});

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
 console.log("Esteborg backend running on",PORT);
});
