import mongoose from "mongoose";
import dns from "dns";

// Atlas "mongodb+srv://" URIs need a DNS SRV/TXT lookup. The system resolver can
// time out on these ("queryTxt ETIMEOUT") even when normal browsing works, which
// crashes the whole server. Force reliable public resolvers (Google + Cloudflare)
// so the SRV lookup succeeds regardless of the local DNS configuration.
try {
  const current = dns.getServers();
  dns.setServers([...new Set(["8.8.8.8", "1.1.1.1", ...current])]);
} catch {
  /* best-effort */
}

// Cache the connection across serverless invocations (Vercel) so we don't
// open a new connection on every request.
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = global as unknown as { _mongoose?: MongooseCache };
const cache: MongooseCache = globalForMongoose._mongoose || { conn: null, promise: null };
globalForMongoose._mongoose = cache;

export const connectDB = async (): Promise<typeof mongoose | null> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("⚠️  MONGODB_URI not set in environment.");
    return null;
  }

  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, { bufferCommands: false, serverSelectionTimeoutMS: 15000 })
      .then((m) => {
        console.log("✅ MongoDB connected");
        return m;
      })
      .catch((error) => {
        cache.promise = null;
        console.error("❌ MongoDB connection error:", error);
        throw error;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
};
