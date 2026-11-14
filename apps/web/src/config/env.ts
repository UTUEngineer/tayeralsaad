import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z
    .preprocess((v) => (typeof v === "string" && v.trim() ? v : "http://127.0.0.1:4000/api/v1"), z.string().url()),
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

function defaultWsUrl(apiUrl: string): string {
  try {
    const u = new URL(apiUrl);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = "";
    u.search = "";
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return "ws://127.0.0.1:4000";
  }
}

export const env = {
  ...parsed.data,
  VITE_API_URL: parsed.data.VITE_API_URL.replace(/\/$/, ""),
  VITE_WS_URL: (parsed.data.VITE_WS_URL ?? defaultWsUrl(parsed.data.VITE_API_URL)).replace(/\/$/, ""),
  VITE_USE_MOCKS: parsed.data.VITE_USE_MOCKS === "true",
};
