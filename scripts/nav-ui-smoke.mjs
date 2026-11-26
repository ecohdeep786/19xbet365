import { mkdirSync } from "node:fs";
import { chromium } from "file:///C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
mkdirSync("capture/categories", { recursive: true });

await page.goto("http://127.0.0.1:4000/#/login", { waitUntil: "networkidle" });
await page.getByPlaceholder("you@example.com").fill("player@19xbet365.test");
await page.getByPlaceholder("Your password").fill("19X#2026");
await page.getByRole("button", { name: /^Sign in/i }).click();
await page.waitForTimeout(700);
await page.goto("http://127.0.0.1:4000/#/", { waitUntil: "networkidle" });
await page.waitForTimeout(500);

const gamesGroup = page.locator(".nav-group").filter({ hasText: "1xGames" }).first();
await gamesGroup.hover();
await page.waitForTimeout(350);
const gamesPanel = gamesGroup.locator(".nav-panel");
const gamesLinks = await gamesPanel.locator("a").allTextContents();
const gamesPanelVisible = await gamesPanel.isVisible();
await page.screenshot({ path: "capture/categories/nav-games-1440.jpeg", type: "jpeg", quality: 88 });

const moreGroup = page.locator(".nav-group").filter({ hasText: "More" }).first();
await moreGroup.hover();
await page.waitForTimeout(350);
const moreLinks = await moreGroup.locator(".nav-panel a").allTextContents();
await page.screenshot({ path: "capture/categories/nav-more-1440.jpeg", type: "jpeg", quality: 88 });

await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.locator(".mobile-menu-btn").click();
await page.waitForTimeout(400);
const drawerText = await page.locator(".mobile-drawer").innerText();
await page.screenshot({ path: "capture/categories/nav-mobile-390.jpeg", type: "jpeg", quality: 88 });

const required = ["Bingo", "Poker", "TV Games", "Lotto", "Toto 15", "Scratch Cards", "Hunting & Fishing", "Other Games", "Quick Play", "Results", "Statistics"];
const checks = {
  gamesPanelVisible,
  gamesLinks: gamesLinks.filter((text) => required.some((name) => text.includes(name))).length,
  moreHasResults: moreLinks.some((text) => text.includes("Results")),
  moreHasStatistics: moreLinks.some((text) => text.includes("Statistics")),
  mobileHasNewCategories: required.filter((name) => drawerText.includes(name)).length,
  overflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
};
const pass = checks.gamesPanelVisible && checks.gamesLinks >= 8 && checks.moreHasResults && checks.moreHasStatistics && checks.mobileHasNewCategories >= 10 && checks.overflow <= 1 && errors.length === 0;
console.log(JSON.stringify({ checks, errors, pass }, null, 2));
await browser.close();
if (!pass) process.exitCode = 1;
