import { chromium } from "file:///C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

await page.goto("http://127.0.0.1:4000/#/login", { waitUntil: "networkidle" });
await page.getByPlaceholder("you@example.com").fill("player@19xbet365.test");
await page.getByPlaceholder("Your password").fill("19X#2026");
await page.getByRole("button", { name: /^Sign in/i }).click();
await page.waitForTimeout(700);

const games = await page.evaluate(async () => (await (await fetch("/api/games")).json()).games.filter((game) => game.playable).map((game) => game.id));
const failures = [];
async function check(route, width) {
  await page.setViewportSize({ width, height: width <= 430 ? 844 : 900 });
  await page.goto(`http://127.0.0.1:4000/#${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(180);
  const metrics = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth
  }));
  if (metrics.scroll > metrics.client + 1) failures.push({ route, width, ...metrics, overflow: metrics.scroll - metrics.client });
}

const routes = ["/", "/casino", "/instant", "/live-casino", "/virtuals", "/bingo", "/poker", "/tv-games", "/lotto", "/toto", "/scratch-cards", "/hunting-fishing", "/other-games", "/quick-play", "/results", "/statistics", "/game/blackjack-azure", "/game/astra-roulette-live", "/game/baccarat-royale"];
for (const width of [320, 390, 768, 1440, 2560]) {
  for (const route of routes) {
    await check(route, width);
  }
}
for (const width of [320, 1440]) {
  for (const game of games) await check(`/game/${game}`, width);
}

console.log(JSON.stringify({ games: games.length, checks: 5 * routes.length + games.length * 2, failures, consoleErrors: errors.slice(0, 5), pass: failures.length === 0 && errors.length === 0 }, null, 2));
await browser.close();
if (failures.length || errors.length) process.exitCode = 1;
