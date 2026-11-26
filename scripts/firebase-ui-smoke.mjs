import { mkdirSync } from "node:fs";
import { chromium } from "file:///C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const firebaseKey = "AIzaSyDwOe2YCKvrhzuxwQnSD_XEF7g23_8iOf8";
const stamp = Date.now();
const email = `firebase.ui.${stamp}@qa.19xbet365.com`;
const password = "Firebase#2026";
let firebaseUser = null;
const checks = [];
const consoleErrors = [];
const pageErrors = [];
const evidenceDir = "capture/firebase-audit";
mkdirSync(evidenceDir, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox"] });

function check(name, pass, detail) {
  checks.push({ name, pass, detail });
  if (!pass) throw new Error(`${name}: ${detail}`);
}

try {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  firebaseUser = await res.json();
  check("Firebase UI test identity created", res.status === 200, res.status);

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("http://127.0.0.1:4000/#/login", { waitUntil: "networkidle" });
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("Your password").fill(password);
  await page.getByRole("button", { name: /^Sign in/i }).click();
  await page.waitForURL(/#\/account/, { timeout: 15000 });
  await page.waitForTimeout(800);
  const accountText = await page.locator(".account-page").innerText();
  check("Firebase email/password signs into the player app", /player dashboard/i.test(accountText), accountText.slice(0, 120));
  check("Unverified email banner is visible", /Verify your email to unlock money flows/.test(accountText), "banner");
  check("Welcome coins are shown", /10,500/.test(accountText), accountText.match(/10,500[^\n]*/)?.[0] || "");
  await page.screenshot({ path: `${evidenceDir}/01-firebase-account.jpeg`, type: "jpeg", quality: 86 });

  await page.evaluate(() => fetch("/api/auth/logout", { method: "POST" }));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const restoredText = await page.locator(".account-page").innerText();
  check("Firebase session restores after the server session ends", /player dashboard/i.test(restoredText), restoredText.slice(0, 90));

  await page.getByRole("button", { name: /I have verified/i }).click();
  await page.waitForTimeout(600);
  check("Verification check reports pending state", /not verified yet/i.test(await page.locator(".verify-banner").innerText()), "pending");
  await page.screenshot({ path: `${evidenceDir}/02-firebase-verification-pending.jpeg`, type: "jpeg", quality: 86 });

  await page.goto("http://127.0.0.1:4000/#/account/deposit", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const depositText = await page.locator("body").innerText();
  check("Deposit page keeps the verification banner", /Verify your email to unlock money flows/.test(depositText), "deposit banner");
  await page.screenshot({ path: `${evidenceDir}/03-firebase-deposit-gate.jpeg`, type: "jpeg", quality: 86 });
  await context.close();

  const signupEmail = `firebase.signup.${stamp}@qa.19xbet365.com`;
  const signupPassword = "Firebase#2026";
  const signupContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const signupPage = await signupContext.newPage();
  signupPage.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  signupPage.on("pageerror", (error) => pageErrors.push(error.message));
  await signupPage.goto("http://127.0.0.1:4000/#/register", { waitUntil: "networkidle" });
  await signupPage.getByPlaceholder("How should we call you?").fill("Firebase Signup QA");
  await signupPage.getByPlaceholder("you@example.com").fill(signupEmail);
  await signupPage.getByPlaceholder("Create password").fill(signupPassword);
  await signupPage.getByPlaceholder("Repeat password").fill(signupPassword);
  await signupPage.getByLabel(/I am 18 or older/i).check();
  await signupPage.getByRole("button", { name: /Create account/i }).click();
  await signupPage.waitForURL(/#\/account/, { timeout: 20000 });
  await signupPage.waitForTimeout(800);
  const signupText = await signupPage.locator(".account-page").innerText();
  check("Firebase registration creates a player session", /Firebase Signup QA/.test(signupText), signupText.slice(0, 100));
  check("New Firebase registration shows verification gate", /Verify your email to unlock money flows/.test(signupText), "signup banner");
  await signupPage.screenshot({ path: `${evidenceDir}/04-firebase-signup.jpeg`, type: "jpeg", quality: 86 });
  await signupContext.close();
  const cleanup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: signupEmail, password: signupPassword, returnSecureToken: true })
  });
  const cleanupUser = await cleanup.json();
  if (cleanup.ok && cleanupUser.idToken) {
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${firebaseKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: cleanupUser.idToken })
    });
  }

  const legacy = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const legacyPage = await legacy.newPage();
  legacyPage.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  legacyPage.on("pageerror", (error) => pageErrors.push(error.message));
  await legacyPage.goto("http://127.0.0.1:4000/#/login", { waitUntil: "networkidle" });
  await legacyPage.getByPlaceholder("you@example.com").fill("player@19xbet365.test");
  await legacyPage.getByPlaceholder("Your password").fill("19X#2026");
  await legacyPage.getByRole("button", { name: /^Sign in/i }).click();
  await legacyPage.waitForURL(/#\/account/, { timeout: 15000 });
  await legacyPage.waitForTimeout(700);
  const legacyText = await legacyPage.locator(".account-page").innerText();
  check("Seeded password login still works", /player dashboard/i.test(legacyText), legacyText.slice(0, 80));
  check("Verified seeded account has no verification banner", !/Verify your email to unlock money flows/.test(legacyText), "no banner");
  await legacy.close();

  const pass = checks.every((item) => item.pass) && consoleErrors.length === 0 && pageErrors.length === 0;
  console.log(JSON.stringify({ checks, consoleErrors, pageErrors, pass }, null, 2));
  if (!pass) process.exitCode = 1;
} catch (error) {
  console.log(JSON.stringify({ checks, consoleErrors, pageErrors, pass: false, error: String(error) }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
  if (firebaseUser?.idToken) {
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${firebaseKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: firebaseUser.idToken })
    }).catch(() => {});
  }
}
