/**
 * Signs in as the seeded administrator, then requests every administration page
 * and reports its status. Catches the runtime failures a type check cannot: a
 * bad Prisma include, a "use server" export violation, a missing relation.
 *
 * Run against a dev server with: node scripts/smoke-admin.mjs
 */
import { readFile } from "node:fs/promises";

const BASE = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3210";
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@mysteriesinmotion.com";
const SERVER_LOG = process.env.SMOKE_SERVER_LOG;

/**
 * The local database serves one connection at a time, which the dev server
 * holds, so the session is obtained through the real sign-in flow rather than by
 * writing a session row directly. Without a delivery provider the code is
 * written to the server log, which is where this reads it from.
 */
async function readLatestCode(after) {
  if (!SERVER_LOG) {
    throw new Error("Set SMOKE_SERVER_LOG to the dev server's output file.");
  }
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const log = await readFile(SERVER_LOG, "utf8").catch(() => "");
    const codes = [...log.matchAll(/sign-in code is: (\d{6})/g)];
    const latest = codes.at(-1)?.[1];
    if (latest && latest !== after) return latest;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("No new sign-in code appeared in the server log.");
}

async function signIn() {
  const previous = await readLatestCode(null).catch(() => null);

  const requested = await fetch(`${BASE}/api/auth/request-code`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL }),
  });
  if (!requested.ok) {
    throw new Error(
      `Requesting a code failed: ${requested.status} ${await requested.text()}`,
    );
  }

  const code = await readLatestCode(previous);
  const verified = await fetch(`${BASE}/api/auth/verify-code`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, code }),
    redirect: "manual",
  });

  const session = (verified.headers.getSetCookie?.() ?? [])
    .map((entry) => entry.split(";")[0])
    .find((entry) => entry.startsWith("mim_session="));
  if (!session) {
    throw new Error(
      `Verifying the code returned no session: ${verified.status} ${await verified.text()}`,
    );
  }
  return session;
}

const PATHS = [
  "/admin",
  "/admin/catalog",
  "/admin/catalog/new",
  "/admin/catalog/murder-at-the-manor",
  "/admin/applications",
  "/admin/applications?status=ALL",
  "/admin/show-dates",
  "/admin/show-dates/new",
  "/admin/casting",
  "/admin/calendar",
  "/admin/bookings",
  "/admin/bookings?status=ALL",
  "/admin/performers",
  "/admin/online",
  "/admin/customers",
  "/admin/business",
  "/admin/troupe",
  "/troupe",
  "/troupe/shows",
  "/troupe/casting",
  "/troupe/calendar",
  "/troupe/profile",
  "/",
  "/about",
  "/shows",
  "/book",
  "/broadcast",
  "/mysteries",
  "/sign-in",
  "/troupe/sign-in",
];

const session = await signIn();

/** Discovers the seeded show date so the per-date screens get exercised too. */
async function discover(path, pattern) {
  const response = await fetch(`${BASE}${path}`, { headers: { cookie: session } });
  const html = await response.text();
  return pattern.exec(html)?.[1] ?? null;
}

const showDateId = await discover("/admin/show-dates", /admin\/casting\/([a-z0-9]+)/);
const performerId = await discover("/admin/performers", /admin\/performers\/([a-z0-9]+)/);

const paths = [...PATHS];
if (showDateId) {
  paths.push(
    `/admin/casting/${showDateId}`,
    `/admin/show-dates/${showDateId}`,
    `/troupe/casting/${showDateId}`,
  );
}
if (performerId) paths.push(`/admin/performers/${performerId}`);

let failures = 0;
for (const path of paths) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { cookie: session },
    redirect: "manual",
  });
  const ok = response.status < 400;
  if (!ok) failures += 1;
  const suffix = response.status === 307 || response.status === 308
    ? ` -> ${response.headers.get("location")}`
    : "";
  console.log(`${ok ? "ok  " : "FAIL"} ${response.status} ${path}${suffix}`);
}

console.log(
  failures ? `\n${failures} of ${paths.length} failed.` : `\nAll ${paths.length} passed.`,
);
process.exit(failures ? 1 : 0);
