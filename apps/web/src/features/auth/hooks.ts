import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import i18n from "@/i18n/config";
import { adminLoginApi, fetchMeApi, loginApi, refreshTokens, registerApi } from "@/features/auth/api";
import type { LoginInput, MeUser, RegisterInput } from "@/features/auth/schemas";
import { useAuthStore } from "@/features/auth/store";
import { ME_KEY } from "@/features/auth/keys";
import { disconnectRealtime } from "@/lib/realtime/socket";
import { toDashboardRole } from "@/lib/role";

function dashboardPathForRole(role: string): string {
  switch (toDashboardRole(role)) {
    case "ADMIN":
      return "/dashboard/admin";
    case "DRIVER":
      return "/dashboard/driver";
    case "SENDER":
    default:
      return "/dashboard/sender";
  }
}

export function useMe(enabled: boolean) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: [...ME_KEY],
    enabled: enabled && !!accessToken,
    queryFn: async (): Promise<MeUser> => {
      const user = await fetchMeApi();
      setUser(user);
      return user;
    },
    staleTime: 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    // An email in the identifier field means the single admin credential login
    // (email + password). Anything else is the phone OTP flow.
    mutationFn: (input: LoginInput) =>
      input.phone.includes("@")
        ? adminLoginApi(input.phone, input.password)
        : loginApi(input),
    onSuccess: async (data) => {
      setSession(data);
      await qc.invalidateQueries({ queryKey: ME_KEY });
      toast.success(i18n.t("toasts.signedIn"));
      navigate(dashboardPathForRole(data.user.role), { replace: true });
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (input: RegisterInput) => registerApi(input),
    onSuccess: async (data) => {
      setSession(data);
      await qc.invalidateQueries({ queryKey: ME_KEY });
      toast.success(i18n.t("toasts.accountCreated"));
      navigate(dashboardPathForRole(data.user.role), { replace: true });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useMutation({
    mutationFn: async () => {
      clearAuth();
      disconnectRealtime();
      qc.clear();
    },
    onSuccess: () => {
      toast.message(i18n.t("toasts.signedOut"));
    },
  });
}

export async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken, setTokens, clearAuth } = useAuthStore.getState();
  if (!refreshToken) return false;
  try {
    const t = await refreshTokens(refreshToken);
    setTokens(t.accessToken, t.refreshToken);
    return true;
  } catch {
    clearAuth();
    return false;
  }
}
