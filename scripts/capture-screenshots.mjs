import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = "http://127.0.0.1:4000";
const OUT = join(process.cwd(), "capture", "product");
const PORT = 9333;
const profile = join(tmpdir(), `19x-capture-${Date.now()}`);
mkdirSync(OUT, { recursive: true });
mkdirSync(profile, { recursive: true });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const proc = spawn(EDGE, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank"
], { stdio: "ignore" });

async function waitForBrowser() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) return (await res.json()).find((tab) => tab.type === "page");
    } catch { /* starting */ }
    await delay(200);
  }
  throw new Error("Edge did not expose a debugging target.");
}

const target = await waitForBrowser();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

let nextId = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`));
    else resolve(message.result);
  }
};
function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Page evaluation failed.");
  return result.result.value;
}
async function stylesReady() {
  return evaluate(`(() => {
    const hasAssetSheet = [...document.styleSheets].some((sheet) => sheet.href && sheet.href.includes('/assets/'));
    const styled = getComputedStyle(document.body).fontFamily.includes('Roboto');
    return hasAssetSheet && styled;
  })()`);
}
async function waitReady(extra = 900) {
  await delay(extra);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await stylesReady()) break;
    await send("Page.reload", { ignoreCache: true });
    await delay(1100);
  }
  if (!(await stylesReady())) throw new Error("Production stylesheet did not load.");
  await evaluate("document.fonts.ready.then(() => true)");
}
async function goto(hash, extra = 900) {
  await evaluate(`location.hash = ${JSON.stringify(hash)}; true`);
  await waitReady(extra);
}
async function viewport(width, height, mobile) {
  await send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile, screenWidth: width, screenHeight: height
  });
}
async function shot(name) {
  const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality: 88, fromSurface: true });
  writeFileSync(join(OUT, `${name}.jpeg`), Buffer.from(data, "base64"));
  console.log(`captured ${name}.jpeg`);
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await viewport(1440, 900, false);
  await send("Page.navigate", { url: `${BASE}/` });
  await waitReady(1600);

  const login = await evaluate(`(async () => {
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'player@19xbet365.test', password: '19X#2026' }) });
    return { status: res.status, body: await res.json() };
  })()`);
  if (login.status !== 200) throw new Error(`Player login failed: ${JSON.stringify(login.body)}`);
  await send("Page.reload", { ignoreCache: true });
  await waitReady(1800);

  const routes = [
    ["", "home-1440"],
    ["/sports", "sports-1440"],
    ["/live", "live-1440"],
    ["/casino", "casino-1440"],
    ["/instant", "instant-1440"],
    ["/game/dice-roll", "dice-1440"],
    ["/account", "account-1440"],
    ["/account/wallet", "wallet-1440"],
    ["/account/deposit", "deposit-1440"],
    ["/account/bets", "bets-1440"],
    ["/promotions", "promotions-1440"],
    ["/tournaments", "tournaments-1440"],
    ["/help", "help-1440"],
    ["/support", "support-1440"]
  ];
  for (const [route, name] of routes) {
    await goto(route, 900);
    await evaluate("window.scrollTo(0,0); true");
    await delay(250);
    await shot(name);
  }

  await viewport(390, 844, true);
  await send("Page.reload", { ignoreCache: true });
  await waitReady(1800);
  for (const [route, name] of [
    ["", "home-390"],
    ["/sports", "sports-390"],
    ["/casino", "casino-390"],
    ["/game/dice-roll", "dice-390"],
    ["/account/wallet", "wallet-390"],
    ["/account/deposit", "deposit-390"],
    ["/login", "login-390"]
  ]) {
    await goto(route, 900);
    await evaluate("window.scrollTo(0,0); true");
    await delay(250);
    await shot(name);
  }

  await viewport(1440, 900, false);
  await send("Page.reload", { ignoreCache: true });
  await waitReady(1400);
  await evaluate(`fetch('/api/auth/logout', { method: 'POST' })`);
  await goto("/login", 1100);
  await shot("login-1440");
  await goto("/register", 900);
  await shot("register-1440");

  const adminLogin = await evaluate(`(async () => {
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@19xbet365.test', password: '19X#2026' }) });
    return { status: res.status, body: await res.json() };
  })()`);
  if (adminLogin.status !== 200) throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.body)}`);
  await send("Page.reload", { ignoreCache: true });
  await waitReady(1400);
  await goto("/admin", 1600);
  await shot("admin-dashboard-1440");
  await goto("/admin/accounts", 1200);
  await shot("admin-accounts-1440");
  await goto("/admin/deposits", 1200);
  await shot("admin-deposits-1440");

  await viewport(390, 844, true);
  await goto("/admin", 1100);
  await shot("admin-dashboard-390");
  console.log("done");
} finally {
  try { ws.close(); } catch { /* closed */ }
  proc.kill();
  await delay(400);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ }
}
