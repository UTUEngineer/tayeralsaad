import { http, HttpResponse } from "msw";

/**
 * MSW handlers mirror the REAL Tayr Al-Saad API (apps/api) exactly:
 *  - /health lives at the ROOT and returns { ok, service, db, uptime }.
 *  - Everything under /api/v1 uses the success envelope { ok: true, data: T }.
 * Path wildcards (`*`) keep these host/port agnostic.
 */

const ok = <T,>(data: T) => HttpResponse.json({ ok: true, data });

let currentMockUser: {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: string;
  preferredLanguage: string;
  defaultAddresses: unknown[];
  createdAt: string;
} = {
  id: "u_mock_1",
  name: "Mock User",
  email: "admin@tayralsaad.iq",
  phone: "+9647700000000",
  role: "admin",
  preferredLanguage: "ar",
  defaultAddresses: [],
  createdAt: new Date().toISOString(),
};

export const handlers = [
  // Root health (NOT under /api/v1). Matches app.ts GET /health.
  http.get("*/health", () =>
    HttpResponse.json({ ok: true, service: "tayralsaad-api", db: "up", uptime: 1 }),
  ),

  // GET /api/v1/cities -> { ok, data: { cities: [{ key, nameAr, nameEn }] } }
  http.get("*/api/v1/cities", () =>
    ok({
      cities: [
        { key: "baghdad", nameAr: "بغداد", nameEn: "Baghdad" },
        { key: "basra", nameAr: "البصرة", nameEn: "Basra" },
        { key: "erbil", nameAr: "أربيل", nameEn: "Erbil" },
      ],
    }),
  ),

  // POST /api/v1/auth/otp/request -> { ok, data: { expiresIn, devCode? } }
  http.post("*/api/v1/auth/otp/request", () => ok({ expiresIn: 300, devCode: "1234" })),

  // POST /api/v1/auth/admin/login -> { ok, data: { user, accessToken, refreshToken, expiresIn } }
  http.post("*/api/v1/auth/admin/login", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };
    currentMockUser = {
      id: "u_admin_1",
      name: "مسؤول النظام",
      email: body.email || "admin@tayralsaad.iq",
      phone: "+964779000099",
      role: "admin",
      preferredLanguage: "ar",
      defaultAddresses: [],
      createdAt: new Date().toISOString(),
    };
    return ok({
      user: currentMockUser,
      accessToken: "mock.admin.access.token",
      refreshToken: "mock.admin.refresh.token",
      expiresIn: 900,
    });
  }),

  // POST /api/v1/auth/otp/verify -> { ok, data: { user, accessToken, refreshToken, expiresIn } }
  http.post("*/api/v1/auth/otp/verify", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      phone?: string;
      name?: string;
      role?: string;
    };
    const phone = String(body.phone ?? "").trim();
    let detectedRole = "sender";
    if (body.role && ["sender", "driver", "admin"].includes(String(body.role).toLowerCase())) {
      detectedRole = String(body.role).toLowerCase();
    } else if (phone.includes("779000099") || phone.includes("admin")) {
      detectedRole = "admin";
    } else if (phone.includes("77222220") || phone.includes("driver")) {
      detectedRole = "driver";
    }

    currentMockUser = {
      id: `u_${detectedRole}_1`,
      name: body.name ?? (detectedRole === "admin" ? "مسؤول النظام" : detectedRole === "driver" ? "سائق تجريبي" : "مرسل تجريبي"),
      email: detectedRole === "admin" ? "admin@tayralsaad.iq" : undefined,
      phone: phone || "+9647700000000",
      role: detectedRole,
      preferredLanguage: "ar",
      defaultAddresses: [],
      createdAt: new Date().toISOString(),
    };

    return ok({
      user: currentMockUser,
      accessToken: `mock.${detectedRole}.access.token`,
      refreshToken: `mock.${detectedRole}.refresh.token`,
      expiresIn: 900,
    });
  }),

  // GET /api/v1/me -> { ok, data: user }
  http.get("*/api/v1/me", () => ok(currentMockUser)),

  // GET /api/v1/shipments/mine -> { ok, data: { items, total } }
  http.get("*/api/v1/shipments/mine", () => ok({ items: [], total: 0 })),

  // POST /api/v1/shipments/quote -> { ok, data: { pricing, etaMinutes } }
  // Mirrors pricingService.quoteShipment output shape.
  http.post("*/api/v1/shipments/quote", () =>
    ok({
      pricing: { base: 3000, distance: 2000, surcharge: 0, surge: 118, total: 6000, driverPayout: 4800 },
      etaMinutes: 25,
    }),
  ),

  // POST /api/v1/shipments -> 201 { ok, data: <shipment doc> }
  http.post("*/api/v1/shipments", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const now = new Date().toISOString();
    const pkg = (body.package ?? {}) as Record<string, unknown>;
    const receiver = (body.receiver ?? {}) as Record<string, unknown>;
    const payment = { method: body.paymentMethod ?? "cash_on_delivery", status: "pending" };
    return HttpResponse.json(
      {
        ok: true,
        data: {
          _id: "s_mock_1",
          trackingCode: "TS-MOCK-01",
          status: "pending",
          senderId: "u_mock_1",
          driverId: null,
          pickup: body.pickup ?? {},
          dropoff: body.dropoff ?? {},
          receiver: { name: receiver.name ?? "", phone: receiver.phone ?? "" },
          package: { type: pkg.type ?? "small", weightTier: pkg.weightTier ?? "light" },
          service: body.service ?? "standard",
          scheduledFor: body.scheduledFor ?? null,
          pricing: { base: 3000, distance: 2000, surcharge: 0, surge: 118, total: 6000, driverPayout: 4800 },
          payment,
          statusHistory: [{ status: "pending", at: now }],
          proofs: {},
          etaMinutes: 25,
          createdAt: now,
          updatedAt: now,
        },
      },
      { status: 201 },
    );
  }),

  // GET /api/v1/shipments/:id
  http.get("*/api/v1/shipments/:id", ({ params }) =>
    ok({
      _id: String(params.id),
      trackingCode: "TS-MOCK-01",
      status: "pending",
      senderId: "u_mock_1",
      pickup: { city: "baghdad", area: "Karrada", location: { lat: 33.3152, lng: 44.3661 } },
      dropoff: { city: "baghdad", area: "Mansour", location: { lat: 33.325, lng: 44.33 } },
      receiver: { name: "Mock Receiver", phone: "+9647700000000" },
      package: { type: "small", weightTier: "light" },
      service: "standard",
      pricing: { total: 6000 },
      payment: { method: "cash_on_delivery", status: "pending" },
      statusHistory: [{ status: "pending", at: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
    }),
  ),

  // POST /api/v1/shipments/:id/cancel
  http.post("*/api/v1/shipments/:id/cancel", ({ params }) =>
    ok({
      _id: String(params.id),
      trackingCode: "TS-MOCK-01",
      status: "cancelled",
      pricing: { total: 6000 },
      payment: { method: "cash_on_delivery", status: "pending" },
    }),
  ),

  // POST /api/v1/shipments/:id/rate
  http.post("*/api/v1/shipments/:id/rate", ({ params }) =>
    ok({
      _id: String(params.id),
      trackingCode: "TS-MOCK-01",
      status: "delivered",
      rating: { stars: 5, comment: "Great" },
      pricing: { total: 6000 },
    }),
  ),

  // POST /api/v1/shipments/:id/accept (driver)
  http.post("*/api/v1/shipments/:id/accept", ({ params }) =>
    ok({ _id: String(params.id), status: "assigned", trackingCode: "TS-MOCK-01" }),
  ),

  // GET /api/v1/admin/overview -> { ok, data: {...counters} }
  http.get("*/api/v1/admin/overview", () =>
    ok({
      totalUsers: 0,
      totalDrivers: 0,
      pendingDrivers: 0,
      pendingShipments: 0,
      onlineDrivers: 0,
      openDisputes: 0,
      shipmentsInFlight: 0,
      completedToday: 0,
      gmvToday: 0,
      recentShipments: [],
    }),
  ),

  // GET /api/v1/admin/shipments -> { ok, data: { items, total } }
  http.get("*/api/v1/admin/shipments", () => ok({ items: [], total: 0 })),
];
