import { z } from "zod";

/**
 * Application environment configuration and fallback handlers.
 */

const DEFAULT_PROD_API_URL = "https://tayeralsaad2-n8sq37t1.b4a.run/api/v1";
const DEFAULT_PROD_WS_URL = "wss://tayeralsaad2-n8sq37t1.b4a.run";

function defaultWsUrl(apiUrl: string): string {
  try {
    const parsed = new URL(apiUrl);
    // تحويل البروتوكول إلى آمن أو غير آمن بناءً على الـ API
    parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
    // تفريغ المسار والبحث والـ hash لضمان الاتصال بالجذر (Root Socket.IO Namespace)
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    // Fallback احتياطي في حال فشل تحليل الرابط
    return DEFAULT_PROD_WS_URL;
  }
}

const envSchema = z.object({
  VITE_API_URL: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() ? v : DEFAULT_PROD_API_URL),
      z.string().url(),
    ),
  VITE_WS_URL: z.string().optional(),
  VITE_MAPBOX_TOKEN: z.string().optional(),
  VITE_USE_MOCKS: z.enum(["true", "false"]).optional(),
});

const raw = {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_WS_URL: import.meta.env.VITE_WS_URL,
  VITE_MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN,
  VITE_USE_MOCKS: import.meta.env.VITE_USE_MOCKS,
};

const parsed = envSchema.safeParse(raw);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error(`Invalid environment: ${parsed.error.message}`);
}

const apiUrl = parsed.data.VITE_API_URL.replace(/\/$/, "");
const wsUrl = (parsed.data.VITE_WS_URL ?? defaultWsUrl(parsed.data.VITE_API_URL)).replace(/\/$/, "");
const isMock = parsed.data.VITE_USE_MOCKS === "true";

export const env = {
  ...parsed.data,
  VITE_API_URL: apiUrl,
  VITE_WS_URL: wsUrl,
  VITE_USE_MOCKS: isMock,
  // User convenience aliases
  API_URL: apiUrl,
  WS_URL: wsUrl,
  IS_MOCK: isMock,
};
