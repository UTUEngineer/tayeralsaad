import dns from 'node:dns';
import mongoose from 'mongoose';
import type { Logger } from 'pino';

import { env } from './env.js';

// Resolve MongoDB SRV records via public DNS if local resolver fails/blocks SRV
if (env.MONGODB_URI.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {
    /* ignore */
  }
}

/** Default driver settings so local dev fails fast with a clear timeout instead of hanging. */
const clientOptions = {
  serverSelectionTimeoutMS: 12_000,
  socketTimeoutMS: 45_000,
};

export async function connectDb(logger?: Logger): Promise<void> {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.MONGODB_URI, clientOptions);
  } catch (err: unknown) {
    const wrapped = new Error(
      `MongoDB could not connect to ${maskMongoUri(env.MONGODB_URI)}. Is mongod running, or Docker up (pnpm services)? On Windows prefer 127.0.0.1 in MONGODB_URI (not localhost) to avoid IPv6 issues.`,
      { cause: err },
    );
    (logger ?? console).error({ err }, wrapped.message);
    throw wrapped;
  }
  (logger ?? console).info('MongoDB connected');
}

/** Avoid leaking credentials into thrown messages and logs. */
function maskMongoUri(uri: string): string {
  try {
    const u = new URL(uri);
    const hostPart = u.port ? `${u.hostname}:${u.port}` : u.hostname;
    return `${u.protocol}//${hostPart}${u.pathname || '/'}${u.search}`;
  } catch {
    return uri.includes('@') ? uri.replace(/(^mongodb(?:\+srv)?:\/\/)[^@\s]+@/i, '$1') : uri;
  }
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
