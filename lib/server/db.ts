import { MongoClient, type Collection, type Db, type ObjectId } from "mongodb";
import type { Lang, Source } from "@/lib/shared/chat-types";

export const RETENTION_DAYS = 90;

export interface ConversationDoc {
  _id: ObjectId;
  clientId: string;
  title: string;
  pinned: boolean;
  lang: Lang;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

export interface MessageDoc {
  _id: ObjectId;
  conversationId: ObjectId;
  clientId: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[];
  suggestions: string[];
  feedback: "up" | "down" | null;
  createdAt: Date;
}

interface MongoCache {
  client?: Promise<MongoClient>;
  indexes?: Promise<void>;
}
// Reused across invocations of a warm serverless instance.
const globalCache = globalThis as typeof globalThis & { __davMongo?: MongoCache };
const cache = (globalCache.__davMongo ??= {});

async function ensureIndexes(db: Db) {
  const ttl = RETENTION_DAYS * 24 * 60 * 60;
  await Promise.all([
    db.collection("conversations").createIndexes([
      { key: { clientId: 1, updatedAt: -1 } },
      { key: { clientId: 1, pinned: -1, updatedAt: -1, _id: -1 } },
      { key: { updatedAt: 1 }, expireAfterSeconds: ttl, name: "ttl_updatedAt" },
    ]),
    db.collection("messages").createIndexes([
      { key: { conversationId: 1, createdAt: 1 } },
      { key: { clientId: 1 } },
      { key: { createdAt: 1 }, expireAfterSeconds: ttl, name: "ttl_createdAt" },
    ]),
  ]);
}

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw Object.assign(new Error("MONGODB_URI missing"), { name: "MongoConfigError" });
  cache.client ??= new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
    appName: "dav-assistant",
  })
    .connect()
    .catch((error) => {
      cache.client = undefined;
      throw error;
    });
  const db = (await cache.client).db(process.env.MONGODB_DB || "dav_assistant");
  cache.indexes ??= ensureIndexes(db).catch((error) => {
    cache.indexes = undefined;
    throw error;
  });
  await cache.indexes;
  return db;
}

export async function collections(): Promise<{
  conversations: Collection<ConversationDoc>;
  messages: Collection<MessageDoc>;
}> {
  const db = await getDb();
  return {
    conversations: db.collection<ConversationDoc>("conversations"),
    messages: db.collection<MessageDoc>("messages"),
  };
}

export async function pingDb(timeoutMs = 5000) {
  const db = await Promise.race([
    getDb(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
  ]);
  await db.command({ ping: 1 });
}

export function makeTitle(message: string) {
  const clean = message.replace(/\s+/g, " ").trim();
  return clean.length > 60 ? `${clean.slice(0, 59).trimEnd()}…` : clean;
}
