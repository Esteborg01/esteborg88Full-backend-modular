import { MongoClient } from "mongodb";

let cachedClient = null;

export async function getMongoClient() {
  if (cachedClient) return cachedClient;

  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is missing");

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 10,
  });

  await client.connect();
  console.log("✅ MongoDB connected (mongoClient)");

  cachedClient = client;
  return cachedClient;
}

export async function getDb() {
  const client = await getMongoClient();

  // Si no pones DB en el URI, usa esta variable. (Pero tú sí ya la pusiste.)
  const dbName = process.env.MONGO_DB_NAME || undefined;

  return dbName ? client.db(dbName) : client.db();
}
