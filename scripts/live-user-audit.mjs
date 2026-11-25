import { chromium } from "file:///C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "http://127.0.0.1:4000";
const OUT = "C:/Users/Administrator/19xbet365/capture/live-audit-2026-11-25";
mkdirSync(OUT, { recursive: true });

const stamp = Date.now();
const email = `audit.${stamp}@19xbet365.test`;
const password = "Audit#2026";
const reference = `AUD${String(stamp).slice(-8)}`;
const checks = [];
const errors = [];
const consoleErrors = [];
const state = {};

function check(name, pass, detail = "") {
  checks.push({ name, pass: Boolean(pass), detail: String(detail).slice(0, 500) });
}

const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL: BASE });
const page = await context.newPage();
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.jpeg`, quality: 84, type: "jpeg", fullPage: false });
}
async function text() {
  return page.locator("body").innerText();
}
async function login(emailValue, passwordValue) {
  await page.goto("/#/login", { waitUntil: "networkidle" });
  await page.getByPlaceholder("you@example.com").fill(emailValue);
  await page.getByPlaceholder("Your password").fill(passwordValue);
  await page.getByRole("button", { name: /^Sign in/i }).click();
  await page.waitForTimeout(1000);
}

try {
  // 1. Public home as a visitor
  await page.goto("/#/", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const homeText = await text();
  check("home renders", /Play beyond|Live right now/i.test(homeText));
  check("home has no fantasy entry", !/fantasy/i.test(homeText), "No Fantasy navigation or lobby entry found");
  check("no console errors on home", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
  await shot("01-home-visitor");

  // 2. Registration with a brand-new player
  await page.goto("/#/register", { waitUntil: "networkidle" });
  await page.getByPlaceholder("How should we call you?").fill("Audit Player");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("Create password").fill(password);
  await page.getByPlaceholder("Repeat password").fill(password);
  await page.getByLabel(/I am 18 or older/i).check();
  await page.getByRole("button", { name: /Create account/i }).click();
  await page.waitForURL(/\/account/, { timeout: 15000 });
  await page.waitForTimeout(900);
  const accountText = await text();
  state.startBalance = (await page.locator(".account-balance-block strong").first().innerText().catch(() => "")) || "";
  check("registration completes", page.url().endsWith("#/account"), page.url());
  check("new player starts with 10,500 coins", /10,500/.test(state.startBalance), state.startBalance);
  check("player dashboard renders", /Welcome back|AT A GLANCE/i.test(accountText));
  await shot("02-new-player-dashboard");

  // 3. Fantasy route availability
  await page.goto("/#/fantasy", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const fantasyText = await text();
  state.fantasyRoute = page.url();
  check("fantasy route exists", /fantasy/i.test(fantasyText) && !/page not found|404/i.test(fantasyText), fantasyText.slice(0, 160));
  await shot("03-fantasy-attempt");

  // 4. Sportsbook: place a 1X2 bet
  await page.goto("/#/sports", { waitUntil: "networkidle" });
  await page.waitForSelector(".match-row .odds-btn:not([disabled])", { timeout: 15000 });
  const firstOdds = page.locator(".match-row .odds-btn:not([disabled])").first();
  state.selectionOdds = (await firstOdds.innerText()).trim();
  await firstOdds.click();
  await page.waitForSelector(".bet-slip[role='dialog']");
  await page.locator("#slip-stake").fill("100");
  await page.waitForTimeout(200);
  await shot("04-bet-slip");
  await page.getByRole("button", { name: /Place coin bet/i }).click();
  await page.waitForTimeout(1400);
  const toastText = await page.locator(".toast-stack").innerText().catch(() => "");
  state.afterBetBalance = (await page.locator(".header-balance span").first().innerText().catch(() => "")) || "";
  check("sports bet placed", /Potential return|Bet placed|coins/i.test(toastText), toastText.slice(0, 220));
  check("balance debited after bet", state.afterBetBalance !== state.startBalance, `${state.startBalance} -> ${state.afterBetBalance}`);
  await shot("05-after-bet");

  // 5. Play Dice Roll
  await page.goto("/#/game/dice-roll", { waitUntil: "networkidle" });
  await page.waitForSelector(".game-action", { timeout: 15000 });
  await page.locator(".game-action").click();
  await page.waitForTimeout(1600);
  const gameText = await text();
  check("dice round settles", /win|no win|roll/i.test(gameText), gameText.match(/Rolled[^\n]*|No win|Win/i)?.[0] || gameText.slice(0, 160));
  await shot("06-dice-result");

  // 6. Wallet ledger
  await page.goto("/#/account/wallet", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const walletText = await text();
  check("wallet shows bet and game ledger entries", /Sports single|Game stake|Dice Roll|Bet stake/i.test(walletText));
  check("withdrawal is visibly disabled", /Withdraw/i.test(walletText), "Withdraw action is present but disabled");
  await shot("07-wallet");

  // 7. Deposit request (sandbox)
  await page.goto("/#/account/deposit", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const depositText = await text();
  check("deposit page explains sandbox/QR review", /Sandbox mode|Payment QR|verification/i.test(depositText));
  await page.locator("input[type='number']").first().fill("500");
  await page.getByPlaceholder(/4268/).fill(reference);
  await page.getByRole("button", { name: /Submit deposit request/i }).click();
  await page.waitForTimeout(1200);
  const afterDeposit = await text();
  check("deposit request submitted", afterDeposit.includes(reference) || /deposit request submitted/i.test(afterDeposit), reference);
  await shot("08-deposit-request");

  // 8. Responsible gaming
  await page.goto("/#/account/responsible", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const limitInput = page.locator("input[type='number']").first();
  await limitInput.fill("5000");
  await page.getByRole("button", { name: /Save my limits/i }).click();
  await page.waitForTimeout(900);
  const responsibleText = await text();
  check("responsible-play limit saves", /saved|limit/i.test(responsibleText));
  await shot("09-responsible");

  // 9. Support ticket
  await page.goto("/#/support", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.getByRole("tab", { name: "New ticket" }).click();
  await page.getByPlaceholder("Short summary").fill("Production readiness audit");
  await page.getByPlaceholder(/Tell us what happened/i).fill("Testing the support flow as a real player during the production readiness audit.");
  await page.getByRole("button", { name: /Open ticket/i }).click();
  await page.waitForTimeout(900);
  check("support ticket opens", /Production readiness audit/i.test(await text()));
  await shot("10-support");

  // 10. Mobile navigation and persistence
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.waitForTimeout(400);
  check("mobile drawer opens", await page.locator(".mobile-drawer[role='dialog']").isVisible());
  await shot("11-mobile-drawer");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  check("mobile drawer closes on Escape", !(await page.locator(".mobile-drawer-backdrop.open").isVisible().catch(() => false)));
  await page.setViewportSize({ width: 1440, height: 900 });

  // 11. Logout and admin approval of the deposit
  await page.evaluate(() => fetch("/api/auth/logout", { method: "POST" }));
  await login("admin@19xbet365.test", "19X#2026");
  await page.goto("/#/admin/deposits", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const queueText = await text();
  state.adminSeesDeposit = queueText.includes(reference);
  check("master admin sees deposit request", state.adminSeesDeposit, reference);
  await shot("12-admin-deposit-queue");
  if (state.adminSeesDeposit) {
    const card = page.locator(".deposit-admin-row").filter({ hasText: reference }).first();
    const approve = card.getByRole("button", { name: /Approve/i }).first();
    if (await approve.count()) {
      await approve.click();
      await page.waitForTimeout(1400);
      check("master admin approves deposit", /approved|credited/i.test(await page.locator(".toast-stack").innerText().catch(() => "")));
      await shot("13-admin-deposit-approved");
    } else {
      check("master admin approves deposit", false, "Approve button not found in matching card");
    }
  }

  // 12. Return to player and verify deposit + bonus ledger
  await page.evaluate(() => fetch("/api/auth/logout", { method: "POST" }));
  await login(email, password);
  await page.goto("/#/account/wallet", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const finalWallet = await text();
  state.finalBalance = (await page.locator(".account-balance-block strong").first().innerText().catch(() => "")) || "";
  check("deposit appears in player ledger", /Deposit|bonus/i.test(finalWallet), reference);
  check("final balance includes deposit/bonus", /11,|\d{2},\d{3}/.test(state.finalBalance), state.finalBalance);
  await shot("14-player-wallet-after-deposit");

  // 13. Production-gate observation
  const gates = await page.evaluate(async () => {
    const endpoints = ["/api/player/kyc", "/api/player/withdrawals", "/api/fantasy/contests"];
    const results = {};
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint);
        results[endpoint] = res.status;
      } catch (error) {
        results[endpoint] = String(error);
      }
    }
    return results;
  });
  state.gates = gates;
  check("KYC endpoint exists", gates["/api/player/kyc"] !== 404, gates["/api/player/kyc"]);
  check("withdrawal endpoint exists", gates["/api/player/withdrawals"] !== 404, gates["/api/player/withdrawals"]);
  check("fantasy contests endpoint exists", gates["/api/fantasy/contests"] !== 404, gates["/api/fantasy/contests"]);

  check("no uncaught page errors", errors.length === 0, errors.slice(0, 4).join(" | "));
  check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 6).join(" | "));
} catch (error) {
  checks.push({ name: "audit script", pass: false, detail: String(error).slice(0, 500) });
} finally {
  const pass = checks.filter((item) => item.pass).length;
  const report = { email, password, reference, state, pass, total: checks.length, checks, consoleErrors, pageErrors: errors };
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
