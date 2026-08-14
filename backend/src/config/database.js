import mongoose from 'mongoose';
import dns from 'node:dns';
import env from './env.js';

let connectionPromise = null;

const FALLBACK_RESOLVERS = ['8.8.8.8', '1.1.1.1'];

/**
 * Opens the MongoDB connection exactly once and reuses the same promise,
 * so concurrent requests never trigger duplicate connection attempts.
 * Retries with public DNS resolvers when the system resolver drops the
 * Atlas SRV records (querySrv ECONNREFUSED / empty SRV targets).
 */
export function connectDatabase() {
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(env.MONGO_URI, {
        serverSelectionTimeoutMS: 5_000,
      })
      .catch((err) => {
        const unreachable =
          /querySrv|ENOTFOUND|ECONNREFUSED|EAI_AGAIN/i.test(err?.message ?? '') &&
          /mongodb|srv/i.test(err?.message ?? '');
        if (!unreachable) throw err;
        console.warn('[db] System DNS failed for Mongo URI, retrying with public resolvers');
        dns.setServers(FALLBACK_RESOLVERS);
        return mongoose.connect(env.MONGO_URI, {
          serverSelectionTimeoutMS: 15_000,
        });
      });
  }
  return connectionPromise;
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

mongoose.connection.on('error', (err) => {
  if (mongoose.connection.readyState !== 0 || /querySrv|ECONNREFUSED/.test(err.message)) return;
  console.error('[db] MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[db] MongoDB disconnected');
});

export async function closeDatabase() {
  if (connectionPromise) {
    await mongoose.disconnect();
    connectionPromise = null;
  }
}