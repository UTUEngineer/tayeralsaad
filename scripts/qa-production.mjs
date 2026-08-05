/**
 * Production readiness QA — API integration suite.
 * Usage: node scripts/qa-production.mjs
 * Requires: API on PORT (default 4000), MongoDB seeded (pnpm db:seed).
 */

import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnv({ path: path.join(root, '.env') });

const BASE = `http://127.0.0.1:${process.env.PORT ?? 4000}/api/v1`;
const PHOTO = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';

const results = [];

function record(section, name, pass, detail = '') {
  const isNa = detail.startsWith('N/A');
  const effectivePass = isNa ? true : pass;
  results.push({ section, name, pass: effectivePass, detail, na: isNa });
  const mark = isNa ? 'N/A' : effectivePass ? 'PASS' : 'FAIL';
  process.stdout.write(`${mark} [${section}] ${name}${detail ? ` — ${detail}` : ''}\n`);
  if (!effectivePass) process.exitCode = 1;
}

async function post(url, body, token) {
  const res = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, ok: res.ok };
}

async function patch(url, body, token) {
  const res = await fetch(`${BASE}${url}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, ok: res.ok };
}

async function get(url, token) {
  const res = await fetch(`${BASE}${url}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, ok: res.ok };
}

async function otpLogin(phone, opts = {}) {
  const req = await post('/auth/otp/request', { phone });
  const code = req.json?.data?.devCode;
  if (!code) return null;
  const body = { phone, code, ...(opts.name ? { name: opts.name } : {}), ...(opts.role ? { role: opts.role } : {}) };
  const ver = await post('/auth/otp/verify', body);
  return ver.ok ? ver.json?.data ?? null : null;
}

const pickup = {
  label: 'QA Pickup',
  city: 'baghdad',
  area: 'الكرادة',
  street: 'QA St',
  location: { lat: 33.3152, lng: 44.3661 },
};
const dropoff = {
  label: 'QA Dropoff',
  city: 'baghdad',
  area: 'المنصور',
  street: 'QA Ave',
  location: { lat: 33.3041, lng: 44.3455 },
};

async function main() {
  process.stdout.write(`\n=== Tayr Al-Saad Production QA ===\n${BASE}\n\n`);

  // ── 1. Authentication ─────────────────────────────────────────────
  const SECTION = 'Auth';

  const unauthMe = await get('/me');
  record(SECTION, 'Block unauthenticated /me', unauthMe.status === 401, `status=${unauthMe.status}`);

  const newPhone = `+96477${String(Date.now()).slice(-8)}`;
  const registered = await otpLogin(newPhone, { name: 'QA New User', role: 'sender' });
  record(SECTION, 'Register new account (OTP)', Boolean(registered?.accessToken && registered?.user?.role === 'sender'));

  const sender = await otpLogin('+964771111101');
  record(SECTION, 'Login existing sender', Boolean(sender?.accessToken));

  const refresh = await post('/auth/refresh', { refreshToken: sender?.refreshToken });
  record(
    SECTION,
    'Refresh token rotation',
    refresh.ok && Boolean(refresh.json?.data?.accessToken),
    `status=${refresh.status}`,
  );

  const logout = await post('/auth/logout', undefined, sender?.accessToken);
  record(SECTION, 'Logout (server revoke)', logout.status === 204, `status=${logout.status}`);

  const afterLogout = await get('/me', sender?.accessToken);
  record(SECTION, 'Session invalid after logout', afterLogout.status === 401, `status=${afterLogout.status}`);

  // Re-login sender for remaining tests
  const sender2 = await otpLogin('+964771111101');
  record(SECTION, 'Re-login after logout', Boolean(sender2?.accessToken));

  record(SECTION, 'Password reset', false, 'N/A — phone OTP auth only (by design)');

  // ── 2. Roles ──────────────────────────────────────────────────────
  const ROLE = 'Roles';
  const driver = await otpLogin('+964772222201');
  const admin = await otpLogin('+964779000099');
  const customer = await otpLogin('+964780001000', { name: 'QA Receiver', role: 'sender' });

  record(ROLE, 'Login driver role', Boolean(driver?.user?.role === 'driver'));
  record(ROLE, 'Login admin role', Boolean(admin?.user?.role === 'admin'));
  record(ROLE, 'Login customer/receiver phone', Boolean(customer?.accessToken));

  const senderOnAdmin = await get('/admin/overview', sender2?.accessToken);
  record(ROLE, 'Sender blocked from admin API', senderOnAdmin.status === 403, `status=${senderOnAdmin.status}`);

  const driverOnMine = await get('/shipments/mine?page=1', driver?.accessToken);
  record(ROLE, 'Driver blocked from sender mine', driverOnMine.status === 403, `status=${driverOnMine.status}`);

  const adminOverview = await get('/admin/overview', admin?.accessToken);
  record(ROLE, 'Admin dashboard API', adminOverview.ok);

  const incoming = await get('/shipments/incoming?page=1&limit=5', customer?.accessToken);
  const incomingItems = incoming.json?.data?.items ?? [];
  record(ROLE, 'Customer incoming shipments', incoming.ok && incomingItems.length > 0, `count=${incomingItems.length}`);
  if (incomingItems[0]) {
    record(ROLE, 'Incoming senderPhone enrichment', Boolean(incomingItems[0].senderPhone));
  }

  // ── 3–5. Orders lifecycle ─────────────────────────────────────────
  const ORD = 'Orders';

  const quote = await post(
    '/shipments/quote',
    {
      pickup,
      dropoff,
      package: { type: 'small', weightTier: 'light' },
      service: 'standard',
    },
    sender2?.accessToken,
  );
  record(ORD, 'Quote shipment', quote.ok);

  const created = await post(
    '/shipments',
    {
      pickup,
      dropoff,
      package: { type: 'small', weightTier: 'light' },
      service: 'standard',
      receiver: { name: 'مستلم QA', phone: '+964780009999' },
      paymentMethod: 'cash_on_delivery',
    },
    sender2?.accessToken,
  );
  const newId = created.json?.data?._id ?? created.json?.data?.id;
  record(ORD, 'Create shipment', created.ok && Boolean(newId), `id=${newId ?? 'none'}`);

  record(ORD, 'Edit shipment', false, 'N/A — no PATCH /shipments/:id endpoint');

  // Separate shipment for cancel test (must belong to sender)
  const forCancel = await post(
    '/shipments',
    {
      pickup,
      dropoff,
      package: { type: 'small', weightTier: 'light' },
      service: 'standard',
      receiver: { name: 'إلغاء', phone: '+964780009998' },
      paymentMethod: 'cash_on_delivery',
    },
    sender2?.accessToken,
  );
  const cancelId = forCancel.json?.data?._id ?? forCancel.json?.data?.id;
  if (cancelId) {
    const cancelled = await post(`/shipments/${cancelId}/cancel`, { reason: 'QA test cancel' }, sender2?.accessToken);
    record(ORD, 'Cancel shipment', cancelled.ok, `status=${cancelled.status}`);
  } else {
    record(ORD, 'Cancel shipment', false, 'no shipment to cancel');
  }

  // Lifecycle shipment owned by sender2 (not cancelled)
  let lifecycleId = newId;
  if (!lifecycleId) {
    const fallback = await post(
      '/shipments',
      {
        pickup,
        dropoff,
        package: { type: 'small', weightTier: 'light' },
        service: 'standard',
        receiver: { name: 'دورة كاملة', phone: '+964780009997' },
        paymentMethod: 'cash_on_delivery',
      },
      sender2?.accessToken,
    );
    lifecycleId = fallback.json?.data?._id ?? fallback.json?.data?.id;
  }

  const feed = await get('/shipments/feed?lat=33.3152&lng=44.3661&radius=50', driver?.accessToken);
  const pending =
    lifecycleId && (feed.json?.data ?? []).find((s) => (s._id ?? s.id) === lifecycleId)
      ? (feed.json?.data ?? []).find((s) => (s._id ?? s.id) === lifecycleId)
      : (feed.json?.data ?? []).find((s) => s.status === 'pending');
  record(ORD, 'Driver sees pending orders', feed.ok);

  if (pending) {
    const pid = pending._id ?? pending.id;
    const accepted = await post(`/shipments/${pid}/accept`, {}, driver?.accessToken);
    record(ORD, 'Driver accept order', accepted.ok, `status=${accepted.status}`);

    const arrivedPu = await post(`/shipments/${pid}/arrived-pickup`, {}, driver?.accessToken);
    record(ORD, 'Driver arrived pickup', arrivedPu.ok);

    const pickupOtp = accepted.json?.data?.pickupOtp ?? '4821';
    const picked = await post(
      `/shipments/${pid}/pickup`,
      { otp: pickupOtp, photoUrl: PHOTO },
      driver?.accessToken,
    );
    record(ORD, 'Driver confirm pickup → in_transit', picked.ok && picked.json?.data?.status === 'in_transit');

    const arrivedDo = await post(`/shipments/${pid}/arrived-dropoff`, {}, driver?.accessToken);
    record(ORD, 'Driver arrived dropoff', arrivedDo.ok);

    const deliveryOtp = accepted.json?.data?.deliveryOtp ?? '7395';
    const delivered = await post(
      `/shipments/${pid}/deliver`,
      { otp: deliveryOtp, photoUrl: PHOTO },
      driver?.accessToken,
    );
    record(ORD, 'Driver deliver order', delivered.ok && delivered.json?.data?.status === 'delivered');

    const rated = await post(`/shipments/${pid}/rate`, { stars: 5, comment: 'QA' }, sender2?.accessToken);
    record(ORD, 'Sender rate delivered', rated.ok || rated.status === 409, `status=${rated.status}`);
  } else {
    record(ORD, 'Driver accept order', false, 'no pending shipment in feed');
  }

  record(ORD, 'Driver reject/decline order', false, 'N/A — no decline endpoint');

  // ── 6. Driver online ───────────────────────────────────────────────
  const DRV = 'Driver';
  const online = await patch('/driver/online', { isOnline: true }, driver?.accessToken);
  record(DRV, 'Driver go online', online.ok);
  const offline = await patch('/driver/online', { isOnline: false }, driver?.accessToken);
  record(DRV, 'Driver go offline', offline.ok);
  const driverMe = await get('/driver/me', driver?.accessToken);
  record(DRV, 'Driver profile', driverMe.ok);

  // ── 8. Admin ───────────────────────────────────────────────────────
  const ADM = 'Admin';
  record(ADM, 'Admin list users', (await get('/admin/users?page=1', admin?.accessToken)).ok);
  record(ADM, 'Admin list drivers', (await get('/admin/drivers?page=1', admin?.accessToken)).ok);
  record(ADM, 'Admin list shipments', (await get('/admin/shipments?page=1', admin?.accessToken)).ok);
  record(ADM, 'Admin list disputes', (await get('/admin/disputes?page=1', admin?.accessToken)).ok);
  record(ADM, 'Admin delete user', false, 'N/A — not implemented (manageUserSoon)');
  record(ADM, 'Admin edit user role', false, 'N/A — not implemented');

  // ── 11. Network health ─────────────────────────────────────────────
  const NET = 'Network';
  const healthEndpoints = [
    ['/cities', null],
    ['/me', sender2?.accessToken],
  ];
  let any5xx = false;
  for (const [ep, tok] of healthEndpoints) {
    const r = await get(ep, tok);
    if (r.status >= 500) any5xx = true;
  }
  record(NET, 'No 5xx on sampled endpoints', !any5xx);

  // ── Summary ────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.pass && !r.na).length;
  const failed = results.filter((r) => !r.pass).length;
  const na = results.filter((r) => r.na).length;

  process.stdout.write(`\n=== SUMMARY ===\n`);
  process.stdout.write(`PASS: ${passed} | FAIL: ${failed} | N/A noted: ${na} | TOTAL: ${results.length}\n\n`);

  if (failed > 0) {
    process.stdout.write('BLOCKERS (must fix before deploy):\n');
    for (const r of results.filter((x) => !x.pass)) {
      process.stdout.write(`  - [${r.section}] ${r.name}: ${r.detail}\n`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
