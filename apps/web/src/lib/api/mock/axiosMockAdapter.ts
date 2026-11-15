import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { env } from "@/config/env";

export let currentMockUser: {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: string;
  preferredLanguage: string;
  defaultAddresses: unknown[];
  createdAt: string;
} = {
  id: "u_admin_1",
  name: "مسؤول النظام",
  email: "admin@tayralsaad.iq",
  phone: "+964779000099",
  role: "admin",
  preferredLanguage: "ar",
  defaultAddresses: [],
  createdAt: new Date().toISOString(),
};

export function setMockUserRole(role: string, name?: string, phone?: string, email?: string) {
  const norm = role.toLowerCase();
  currentMockUser = {
    id: `u_${norm}_1`,
    name: name || (norm === "admin" ? "مسؤول النظام" : norm === "driver" ? "سائق تجريبي" : "مرسل تجريبي"),
    email: email || (norm === "admin" ? "admin@tayralsaad.iq" : undefined),
    phone: phone || (norm === "admin" ? "+964779000099" : norm === "driver" ? "+964772222201" : "+964771111101"),
    role: norm,
    preferredLanguage: "ar",
    defaultAddresses: [],
    createdAt: new Date().toISOString(),
  };
}

function parseJsonBody(data: unknown): Record<string, unknown> {
  if (!data) return {};
  if (typeof data === "object") return data as Record<string, unknown>;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

export function handleMockRequest(
  config: InternalAxiosRequestConfig | AxiosRequestConfig,
): AxiosResponse | null {
  const url = (config.url ?? "").replace(/\/$/, "");
  const method = (config.method ?? "get").toUpperCase();
  const body = parseJsonBody(config.data);

  // Normalize path by stripping base URL prefix if present
  let path = url;
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const u = new URL(url);
      path = u.pathname;
    }
  } catch {
    /* ignore */
  }

  // Strip leading /api/v1 if present for uniform routing
  const normPath = path.replace(/^\/api\/v1/, "") || "/";

  const makeRes = (data: unknown, status = 200): AxiosResponse => ({
    data,
    status,
    statusText: status === 201 ? "Created" : "OK",
    headers: { "content-type": "application/json" },
    config: config as InternalAxiosRequestConfig,
  });

  const ok = (data: unknown) => makeRes({ ok: true, data });

  // 1. Health check
  if (normPath === "/health" || path === "/health") {
    return makeRes({ ok: true, service: "tayralsaad-api", db: "up", uptime: 1 });
  }

  // 2. Cities
  if (normPath === "/cities") {
    return ok({
      cities: [
        { key: "baghdad", nameAr: "بغداد", nameEn: "Baghdad" },
        { key: "basra", nameAr: "البصرة", nameEn: "Basra" },
        { key: "erbil", nameAr: "أربيل", nameEn: "Erbil" },
      ],
    });
  }

  // 3. Admin Login
  if (method === "POST" && normPath === "/auth/admin/login") {
    setMockUserRole("admin", "مسؤول النظام", "+964779000099", String(body.email || "admin@tayralsaad.iq"));
    return ok({
      user: currentMockUser,
      accessToken: "mock.admin.access.token",
      refreshToken: "mock.admin.refresh.token",
      expiresIn: 900,
    });
  }

  // 4. OTP Request
  if (method === "POST" && normPath === "/auth/otp/request") {
    return ok({ expiresIn: 300, devCode: "1234" });
  }

  // 5. OTP Verify (Detects role from phone, name, or role param)
  if (method === "POST" && normPath === "/auth/otp/verify") {
    const phone = String(body.phone ?? "").trim();
    let detectedRole = "sender";
    if (body.role && ["sender", "driver", "admin"].includes(String(body.role).toLowerCase())) {
      detectedRole = String(body.role).toLowerCase();
    } else if (phone.includes("779000099") || phone.includes("admin")) {
      detectedRole = "admin";
    } else if (phone.includes("77222220") || phone.includes("driver")) {
      detectedRole = "driver";
    }
    setMockUserRole(detectedRole, typeof body.name === "string" ? body.name : undefined, phone);
    return ok({
      user: currentMockUser,
      accessToken: `mock.${detectedRole}.access.token`,
      refreshToken: `mock.${detectedRole}.refresh.token`,
      expiresIn: 900,
    });
  }

  // 6. Refresh tokens
  if (method === "POST" && normPath === "/auth/refresh") {
    return ok({
      accessToken: `mock.${currentMockUser.role}.refreshed.token`,
      refreshToken: `mock.${currentMockUser.role}.refreshed.refresh.token`,
    });
  }

  // 7. Me
  if (method === "GET" && normPath === "/me") {
    return ok(currentMockUser);
  }

  // 8. Shipments Mine
  if (method === "GET" && normPath === "/shipments/mine") {
    return ok({ items: [], total: 0 });
  }

  // 9. Shipments Quote
  if (method === "POST" && normPath === "/shipments/quote") {
    return ok({
      pricing: { base: 3000, distance: 2000, surcharge: 0, surge: 118, total: 6000, driverPayout: 4800 },
      etaMinutes: 25,
    });
  }

  // 10. Shipments Create
  if (method === "POST" && normPath === "/shipments") {
    const now = new Date().toISOString();
    const pkg = (body.package ?? {}) as Record<string, unknown>;
    const receiver = (body.receiver ?? {}) as Record<string, unknown>;
    const trackingCode = `TS-${Math.floor(100000 + Math.random() * 900000)}`;
    return makeRes(
      {
        ok: true,
        data: {
          _id: `s_mock_${Date.now()}`,
          trackingCode,
          status: "pending",
          senderId: currentMockUser.id,
          driverId: null,
          pickup: body.pickup ?? {},
          dropoff: body.dropoff ?? {},
          receiver: { name: receiver.name ?? "", phone: receiver.phone ?? "" },
          package: { type: pkg.type ?? "small", weightTier: pkg.weightTier ?? "light" },
          service: body.service ?? "standard",
          scheduledFor: body.scheduledFor ?? null,
          pricing: { base: 3000, distance: 2000, surcharge: 0, surge: 118, total: 6000, driverPayout: 4800 },
          payment: { method: body.paymentMethod ?? "cash_on_delivery", status: "pending" },
          statusHistory: [{ status: "pending", at: now }],
          proofs: {},
          etaMinutes: 25,
          createdAt: now,
          updatedAt: now,
        },
      },
      201,
    );
  }

  // 11. Admin Overview
  if (method === "GET" && normPath === "/admin/overview") {
    return ok({
      totalUsers: 142,
      totalDrivers: 28,
      pendingDrivers: 3,
      pendingShipments: 12,
      onlineDrivers: 15,
      openDisputes: 1,
      shipmentsInFlight: 9,
      completedToday: 34,
      gmvToday: 245000,
      recentShipments: [],
    });
  }

  // 12. Generic /admin/ collections fallback
  if (method === "GET" && normPath.startsWith("/admin/")) {
    return ok({ items: [], total: 0 });
  }

  // 13. Shipments ID single view / rate / cancel
  if (normPath.startsWith("/shipments/")) {
    return ok({
      _id: "s_mock_1",
      trackingCode: "TS-MOCK-01",
      status: "pending",
      senderId: currentMockUser.id,
      pickup: { city: "baghdad", area: "Karrada", location: { lat: 33.3152, lng: 44.3661 } },
      dropoff: { city: "baghdad", area: "Mansour", location: { lat: 33.325, lng: 44.33 } },
      receiver: { name: "Mock Receiver", phone: "+9647700000000" },
      package: { type: "small", weightTier: "light" },
      service: "standard",
      pricing: { total: 6000 },
      payment: { method: "cash_on_delivery", status: "pending" },
      statusHistory: [{ status: "pending", at: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
    });
  }

  return null;
}
