import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../../docs/screenshots/analytics");
const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3100";
const API_BASE_URL = process.env.SCREENSHOT_API_BASE_URL ?? "http://localhost:8000/api";
const LOGIN_CODE = process.env.SCREENSHOT_LOGIN_CODE ?? "176076";
const VIEWPORT = { width: 1440, height: 900 };

const PAGES = [
  { name: "01-analytics-overview-full", path: "/analytics", marker: "Analytics Overview" },
  { name: "02-analytics-reading-full", path: "/analytics/reading", marker: "Reading Analytics" },
  { name: "03-analytics-listening-full", path: "/analytics/listening", marker: "Listening Analytics" },
  { name: "04-analytics-writing-full", path: "/analytics/writing", marker: "Writing Analytics" },
  { name: "05-analytics-speaking-full", path: "/analytics/speaking", marker: "Speaking Analytics" },
];

function buildAuthStorage(session) {
  const user = session.user;
  return {
    state: {
      userId: user.id,
      sessionId: session.session_id,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      name: [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.first_name || "User",
      phoneNumber: user.phone ?? user.username ?? null,
      avatarUrl: user.avatar_url ?? null,
      isPremium: Boolean(user.is_premium),
      premiumUntil: user.premium_until ?? null,
      createdAt: user.created_at ?? null,
      welcomeBonusDays: Number(session.welcome_bonus_days ?? 0),
      isAuthenticated: true,
    },
    version: 0,
  };
}

async function loginViaVerifyCodeApi() {
  const envAccess = process.env.SCREENSHOT_ACCESS_TOKEN;
  const envRefresh = process.env.SCREENSHOT_REFRESH_TOKEN;
  const envSessionId = process.env.SCREENSHOT_SESSION_ID;
  const envUserId = process.env.SCREENSHOT_USER_ID;

  if (envAccess && envRefresh && envSessionId && envUserId) {
    return {
      access_token: envAccess,
      refresh_token: envRefresh,
      session_id: envSessionId,
      welcome_bonus_days: 0,
      user: {
        id: envUserId,
        first_name: process.env.SCREENSHOT_USER_NAME ?? "User",
        last_name: "",
        username: null,
        phone: null,
        is_premium: true,
        premium_until: "2099-12-31T00:00:00.000Z",
        avatar_url: null,
        created_at: null,
      },
    };
  }

  const response = await fetch(`${API_BASE_URL}/auth/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: LOGIN_CODE, telegram_id: 0 }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Login code failed (${response.status}). Request a fresh Telegram code and rerun with SCREENSHOT_LOGIN_CODE=xxxxxx. ${errorBody}`,
    );
  }

  return response.json();
}

async function loginViaUi(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("button", { name: /already have a code/i }).click({ timeout: 20_000 });
  await page.locator('input[autocomplete="one-time-code"]').fill(LOGIN_CODE);
  await page.getByRole("button", { name: /Verify & Sign In/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 });
}

async function applySessionToContext(context, session, hostname) {
  const storagePayload = buildAuthStorage(session);

  await context.addCookies([
    {
      name: "primescore_user_access_token",
      value: session.access_token,
      domain: hostname,
      path: "/",
      sameSite: "Lax",
    },
    {
      name: "primescore_user_refresh_token",
      value: session.refresh_token,
      domain: hostname,
      path: "/",
      sameSite: "Lax",
    },
    {
      name: "primescore_user_session_id",
      value: session.session_id,
      domain: hostname,
      path: "/",
      sameSite: "Lax",
    },
  ]);

  await context.addInitScript((payload) => {
    window.localStorage.setItem("prime-auth-storage", JSON.stringify(payload));
  }, storagePayload);
}

async function ensureAuthenticated(page) {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2500);

  if (page.url().includes("/login")) {
    throw new Error("Still redirected to login after auth setup.");
  }

  await page.getByText("Welcome back", { exact: false }).first().waitFor({ state: "visible", timeout: 20_000 });
}

async function capture(page, item) {
  await page.goto(`${BASE_URL}${item.path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByText(item.marker, { exact: false }).first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1500);

  const output = path.join(OUT_DIR, `${item.name}.png`);
  await page.screenshot({ path: output, fullPage: true });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const hostname = new URL(BASE_URL).hostname;
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  let session = null;
  try {
    session = await loginViaVerifyCodeApi();
    await applySessionToContext(context, session, hostname);
    await ensureAuthenticated(page);
  } catch (apiError) {
    console.warn(`API login failed: ${apiError.message}`);
    console.warn("Trying UI login flow...");
    await loginViaUi(page);
  }

  for (const item of PAGES) {
    console.log(`Capturing ${item.name}...`);
    await capture(page, item);
  }

  await browser.close();
  console.log(`Saved ${PAGES.length} screenshots to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
