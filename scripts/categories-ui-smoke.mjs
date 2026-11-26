import { mkdirSync } from "node:fs";
import { chromium } from "file:///C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
mkdirSync("capture/categories", { recursive: true });

await page.goto("http://127.0.0.1:4000/#/login", { waitUntil: "networkidle" });
await page.getByPlaceholder("you@example.com").fill("player@19xbet365.test");
await page.getByPlaceholder("Your password").fill("19X#2026");
await page.getByRole("button", { name: /^Sign in/i }).click();
await page.waitForTimeout(700);

const routes = [
  ["/bingo", "Bingo"],
  ["/poker", "Poker"],
  ["/tv-games", "TV Games"],
  ["/lotto", "Lotto"],
  ["/toto", "Toto"],
  ["/scratch-cards", "Scratch Cards"],
  ["/hunting-fishing", "Hunting & Fishing"],
  ["/other-games", "Other Games"],
  ["/quick-play", "Quick Play"],
  ["/results", "Results"],
  ["/statistics", "Statistics"]
];
const results = [];
for (const [route, name] of routes) {
  await page.goto(`http://127.0.0.1:4000/#${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => ({
    h1: document.querySelector("h1")?.textContent?.trim() || "",
    cards: document.querySelectorAll(".game-card, .result-row, .statistic-card").length,
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth
  }));
  await page.screenshot({ path: `capture/categories/${route.slice(1)}-1440.jpeg`, type: "jpeg", quality: 88, fullPage: false });
  results.push({ route, name, ...state, overflow: state.scroll - state.client, pass: Boolean(state.h1) && state.scroll <= state.client + 1 });
}
console.log(JSON.stringify({ results, consoleErrors: errors, pass: results.every((item) => item.pass) && errors.length === 0 }, null, 2));
await browser.close();
if (results.some((item) => !item.pass) || errors.length) process.exitCode = 1;
