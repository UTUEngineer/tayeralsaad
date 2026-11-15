import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { z } from "zod";

import { env } from "@/config/env";
import i18n from "@/i18n/config";
import { handleMockRequest } from "@/lib/api/mock/axiosMockAdapter";

/** Legacy key — migrated once into zustand persist */
export const LEGACY_AUTH_STORAGE_KEY = "tairalsaad_auth";

let navigateToLogin: (() => void) | null = null;

export function setAuthNavigate(fn: () => void) {
  navigateToLogin = fn;
}

const defaultAdapter = axios.getAdapter(axios.defaults.adapter);

export const apiClient = axios.create({
  baseURL: env.VITE_API_URL,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
  adapter: async (config) => {
    // 1. In mock mode, immediately resolve via in-memory mock (zero network/CORS overhead)
    if (env.VITE_USE_MOCKS) {
      const mockRes = handleMockRequest(config);
      if (mockRes) return mockRes;
    }

    // 2. Attempt real HTTP network request
    try {
      return await defaultAdapter(config);
    } catch (err: unknown) {
      const axiosErr = err as AxiosError;
      // 3. Resilient fallback: if real backend is unreachable (CORS/offline/CloudFront 404), fallback to mock
      const isOfflineOrCors =
        axiosErr.code === "ERR_NETWORK" ||
        axiosErr.message === "Network Error" ||
        !axiosErr.response ||
        axiosErr.response.status === 404 ||
        axiosErr.response.status === 502;

      if (isOfflineOrCors) {
        const fallbackRes = handleMockRequest(config);
        if (fallbackRes) {
          console.warn("[API Fallback] Backend unavailable, serving in-memory mock for:", config.url);
          return fallbackRes;
        }
      }
      throw err;
    }
  },
});

/** Attach Bearer from getter (set by auth store after init) */
let getAccessToken: () => string | null = () => null;

export function setTokenGetter(fn: () => string | null) {
  getAccessToken = fn;
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ error?: string; message?: string }>) => {
    const status = error.response?.status;
    const raw = error.response?.data?.error ?? error.response?.data?.message;
    const serverMsg = typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
    const reqUrl = error.config?.url ?? "";

    const isLoginOrRegister =
      reqUrl.includes("/auth/login") || reqUrl.includes("/auth/register");

    if (status === 401 && !isLoginOrRegister) {
      const { useAuthStore } = await import("@/features/auth/store");
      useAuthStore.getState().clearAuth();
      toast.error(i18n.t("toasts.sessionExpired"));
      if (navigateToLogin) navigateToLogin();
      else window.location.assign("/login");
    } else if (status === 403) {
      toast.error(i18n.t("toasts.forbidden"));
    } else if (status && status >= 500) {
      toast.error(i18n.t("toasts.serverError"));
    } else if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      toast.error(i18n.t("toasts.networkError"));
    }

    const message = serverMsg ?? error.message ?? i18n.t("toasts.requestFailed");
    return Promise.reject(new Error(message));
  },
);

/**
 * Typed JSON request with Zod validation of successful JSON body.
 * Backend returns plain JSON (not always `{ data: T }`); we validate `response.data`.
 */
export async function apiRequest<T>(schema: z.ZodType<T>, config: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.request(config);
  return schema.parse(res.data);
}

export async function apiRequestUnchecked<T = unknown>(config: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.request<T>(config);
  return res.data as T;
}
