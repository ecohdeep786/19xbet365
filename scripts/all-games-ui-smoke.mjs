import { chromium } from "file:///C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
const b = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
p.on("pageerror", (e) => errors.push(e.message));
await p.goto("http://127.0.0.1:4000/#/login", { waitUntil: "networkidle" });
await p.getByPlaceholder("you@example.com").fill("player@19xbet365.test");
await p.getByPlaceholder("Your password").fill("19X#2026");
await p.getByRole("button", { name: /^Sign in/i }).click();
await p.waitForTimeout(700);
const games = await p.evaluate(async () => (await (await fetch("/api/games")).json()).games.filter((g) => g.playable));
const loaded = [];
const failed = [];
for (const game of games) {
  await p.goto(`http://127.0.0.1:4000/#/game/${game.id}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(250);
  const state = await p.evaluate(() => ({
    stage: !!document.querySelector(".game-stage-panel"),
    providerGate: /Provider session not configured/i.test(document.body.innerText),
    action: [...document.querySelectorAll("button")].some((button) => /play|spin|launch|deal|race|start|reveal/i.test(button.textContent || "")),
    title: document.querySelector("h1")?.textContent
  }));
  if (state.stage && !state.providerGate) loaded.push(game.id); else failed.push({ id: game.id, ...state });
}
const samples = ["neon-fortune", "virtual-football", "keno-blitz", "scratch-gold", "limbo-velocity", "tower-climb", "astra-roulette-live", "baccarat-royale", "blackjack-azure", "video-poker-deluxe", "holdem-prime", "sicbo-nova", "dream-wheel-live", "airball-crash", "bingo-bonanza", "tv-wheelbet", "war-of-elements", "toto-fifteen", "lotto-636", "reef-hunter", "shadow-hunt"];
const played = [];
for (const id of samples) {
  await p.goto(`http://127.0.0.1:4000/#/game/${id}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(300);
  try {
    if (id === "airball-crash") {
      await p.locator(".crash-action").first().click();
      await p.waitForTimeout(450);
      const cash = p.locator(".crash-action").filter({ hasText: /Cash out/i }).first();
      if (await cash.count()) await cash.click();
    } else if (id === "blackjack-azure") {
      await p.locator(".game-action").filter({ hasText: /Deal/i }).first().click();
      await p.waitForTimeout(500);
      const stand = p.locator(".game-action").filter({ hasText: /Stand/i }).first();
      if (await stand.count()) await stand.click();
    } else if (id === "video-poker-deluxe") {
      await p.locator(".game-action").filter({ hasText: /Deal/i }).first().click();
      await p.waitForTimeout(500);
      const draw = p.locator(".game-action").filter({ hasText: /Draw/i }).first();
      if (await draw.count()) await draw.click();
    } else if (id === "lotto-636") {
      for (let i = 0; i < 6; i += 1) await p.locator(".lotto-number").nth(i).click();
      await p.locator(".game-action").first().click();
    } else {
      await p.locator(".game-action").first().click();
    }
    await p.waitForTimeout(id.startsWith("virtual") ? 2400 : 1000);
    const text = await p.locator(".game-stage-panel").innerText();
    played.push({ id, result: /win|no win|push|settled|target|floors|matched|credits|coins/i.test(text), text: text.slice(-180).replace(/\n/g, " | ") });
  } catch (error) {
    played.push({ id, result: false, error: String(error).slice(0, 160) });
  }
}
console.log(JSON.stringify({ total: games.length, loaded: loaded.length, failed, played, errors: errors.slice(0, 6) }, null, 2));
await b.close();
