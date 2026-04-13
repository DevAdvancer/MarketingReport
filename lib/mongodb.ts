import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI. Add it to .env.local.");
}

const globalForMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

const client = new MongoClient(uri);
const clientPromise = globalForMongo._mongoClientPromise ?? client.connect();

if (process.env.NODE_ENV !== "production") {
  globalForMongo._mongoClientPromise = clientPromise;
}

export async function getDb() {
  const connectedClient = await clientPromise;
  return connectedClient.db(process.env.MONGODB_DB || "vizva-marketing");
}
