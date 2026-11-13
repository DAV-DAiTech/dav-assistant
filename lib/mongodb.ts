import { MongoClient, type Db } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
  mongoIndexesPromise?: Promise<void>;
};

function getClientPromise() {
  if (globalForMongo.mongoClientPromise) return globalForMongo.mongoClientPromise;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");
  globalForMongo.mongoClientPromise = new MongoClient(uri).connect();
  return globalForMongo.mongoClientPromise;
}

export async function getDatabase(): Promise<Db> {
  const client = await getClientPromise();
  const db = client.db(process.env.MONGODB_DB || "dav_assistant");

  globalForMongo.mongoIndexesPromise ??= Promise.all([
    db.collection("conversations").createIndex({ visitorId: 1, updatedAt: -1 }),
    db.collection("messages").createIndex({ conversationId: 1, createdAt: -1 }),
  ]).then(() => undefined);

  await globalForMongo.mongoIndexesPromise;
  return db;
}
