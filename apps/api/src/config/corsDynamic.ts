import type { CorsOptions } from 'cors';

import { env } from './env.js';

export const allowedOrigins = [
  'https://tayeralsaad.vercel.app',
  'http://localhost:3000', // للتطوير المحلي
  'http://localhost:5173',
];

/** Any localhost loopback origin with an optional dev port */
const localhostDev = /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/;

/**
 * RFC 1918-style LAN origins for dev (phone / another PC hitting Vite via machine IP).
 * Optional port so `http://192.168.x.x:5174` matches when Vite hops ports.
 */
const privateLanDev =
  /^https?:\/\/((10\.\d{1,3}\.\d{1,3}\.\d{1,3})|(192\.168\.\d{1,3}\.\d{1,3})|(172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}))(?::\d+)?$/;

function devOriginAllowed(origin: string): boolean {
  return localhostDev.test(origin) || privateLanDev.test(origin);
}

/** Vercel production + preview deploys (e.g. tayeralsaad.vercel.app, tair-alsaad-web.vercel.app). */
const vercelApp = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

/** Netlify production + hash-prefixed deploy previews. */
const netlifyApp = /^https:\/\/[a-z0-9-]+(?:--[a-z0-9-]+)?\.netlify\.app$/i;

/** Known static hosts for the web app — avoids manual CORS_ORIGIN updates per preview URL. */
function hostedWebOriginAllowed(origin: string): boolean {
  return vercelApp.test(origin) || netlifyApp.test(origin);
}

/** Parse the comma-separated CORS_ORIGIN allow-list into normalized origins. */
export function corsAllowList(): string[] {
  const envList = env.CORS_ORIGIN.split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return Array.from(new Set([...allowedOrigins, ...envList]));
}

/**
 * Production: locked to the CORS_ORIGIN allow-list (comma-separated web + admin domains).
 * Non-production: allow-list plus localhost / LAN IPs so Vite (`--host`) works from other devices.
 * Requests with no Origin header (native mobile app, curl, server-to-server) are always allowed.
 */
export function dynamicHttpCorsOrigin(): CorsOptions['origin'] {
  const allow = corsAllowList();
  const isProd = env.NODE_ENV === 'production';
  return (origin, cb) => {
    // السماح للطلبات بدون origin (مثل Postman أو تطبيقات الجوال) أو الدومينات المسموحة
    if (!origin) {
      cb(null, true);
      return;
    }
    const normalized = origin.replace(/\/$/, '');
    if (
      allow.includes(normalized) ||
      hostedWebOriginAllowed(normalized) ||
      (!isProd && devOriginAllowed(normalized))
    ) {
      cb(null, true);
      return;
    }
    cb(new Error('Not allowed by CORS'));
  };
}

/** Same rules as Express CORS for Socket.IO */
export function dynamicSocketIoCorsOrigin(): string | boolean | RegExp | (string | RegExp)[] {
  if (env.NODE_ENV === 'production') return [...corsAllowList(), vercelApp, netlifyApp];
  return [localhostDev, privateLanDev, ...corsAllowList(), vercelApp, netlifyApp];
}
