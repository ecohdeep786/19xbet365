import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const now = new Date("2026-11-24T12:40:00.000Z");
const iso = (mins) => new Date(now.getTime() + mins * 60000).toISOString();

const sports = [
  { slug: "football", name: "Football", icon: "football", count: 1568 },
  { slug: "cricket", name: "Cricket", icon: "cricket", count: 55 },
  { slug: "basketball", name: "Basketball", icon: "basketball", count: 180 },
  { slug: "tennis", name: "Tennis", icon: "tennis", count: 454 },
  { slug: "esports", name: "Esports", icon: "gamepad", count: 110 },
  { slug: "ice-hockey", name: "Ice Hockey", icon: "hockey", count: 276 },
  { slug: "volleyball", name: "Volleyball", icon: "volleyball", count: 77 },
  { slug: "table-tennis", name: "Table Tennis", icon: "tabletennis", count: 619 },
  { slug: "badminton", name: "Badminton", icon: "badminton", count: 38 },
  { slug: "mma", name: "MMA", icon: "mma", count: 52 },
  { slug: "baseball", name: "Baseball", icon: "baseball", count: 44 },
  { slug: "horse-racing", name: "Horse Racing", icon: "horse", count: 84 }
];

const matchSeed = [
  ["football", "UEFA Champions League", "Northbridge FC", "Real Valera", -38, "live", "2", "1", "64'", 2.15, 3.4, 3.1],
  ["football", "UEFA Champions League", "Atletico Meridian", "Dortmund 09", 46, "upcoming", null, null, null, 2.6, 3.25, 2.55],
  ["football", "Premier Division", "Harbour City", "Blackthorn Rovers", 130, "upcoming", null, null, null, 1.72, 3.9, 4.6],
  ["football", "Serie Aurora", "AC Verona", "Torino Nova", -12, "live", "0", "0", "18'", 2.05, 3.1, 3.9],
  ["football", "La Cumbre", "Real Alicante", "FC Sevilla Nueva", 260, "upcoming", null, null, null, 2.3, 3.35, 3.05],
  ["football", "Bundes Arena", "Berlin Union", "Rhein FC", 980, "upcoming", null, null, null, 2.8, 3.6, 2.4],
  ["cricket", "19X T20 League", "Mumbai Mariners", "Delhi Dynamos", -26, "live", "156/4", "132/6", "17.2 ov", 1.66, null, 2.22],
  ["cricket", "19X T20 League", "Bengaluru Blaze", "Chennai Kings", -70, "live", "201/3", "98/7", "12.4 ov", 1.28, null, 3.6],
  ["cricket", "19X T20 League", "Kolkata Tigers", "Punjab Panthers", 240, "upcoming", null, null, null, 1.9, null, 1.9],
  ["cricket", "Global Test Series", "Australia", "England", 120, "upcoming", null, null, null, 1.86, 24, 1.96],
  ["cricket", "Global Test Series", "South Africa", "New Zealand", 720, "upcoming", null, null, null, 2.05, 22, 1.8],
  ["cricket", "Women's Premier Cup", "Northern Stars", "Central Sparks", 340, "upcoming", null, null, null, 1.74, null, 2.05],
  ["basketball", "EuroLeague", "Athens BC", "Madrid Vitae", -24, "live", "58", "54", "Q3 04:12", 1.95, null, 1.88],
  ["basketball", "EuroLeague", "Istanbul Giants", "Munich 55", 58, "upcoming", null, null, null, 2.4, null, 1.58],
  ["basketball", "Nova Basketball League", "Coast Comets", "Peak City", 195, "upcoming", null, null, null, 1.7, null, 2.15],
  ["basketball", "Nova Basketball League", "Desert Suns", "Lakeside Storm", 430, "upcoming", null, null, null, 2.02, null, 1.82],
  ["tennis", "19X Masters", "E. Navarro", "K. Sato", -55, "live", "1", "0", "Set 3", 1.44, null, 2.8],
  ["tennis", "19X Masters", "M. Kovac", "L. Bernard", 35, "upcoming", null, null, null, 1.66, null, 2.25],
  ["tennis", "Challenger Tour", "A. Petrov", "J. Wilson", 150, "upcoming", null, null, null, 2.1, null, 1.75],
  ["tennis", "Women's Open", "S. Kim", "R. Alvarez", 380, "upcoming", null, null, null, 1.57, null, 2.4],
  ["esports", "CS2 — Nova Masters", "Vortex Esports", "Ironclad", -18, "live", "12", "9", "Map 2", 1.74, null, 2.1],
  ["esports", "Dota 2 — Aurora Cup", "Team Zenith", "Nightfall", 90, "upcoming", null, null, null, 1.92, null, 1.9],
  ["esports", "LoL — Rift Series", "Crimson Wolves", "Nova Five", 210, "upcoming", null, null, null, 2.3, null, 1.62],
  ["esports", "Valorant — 19X Invite", "Sentinel Prime", "Orbit", 315, "upcoming", null, null, null, 1.55, null, 2.45],
  ["esports", "CS2 — Nova Masters", "Polaris", "Blacksite", 465, "upcoming", null, null, null, 1.8, null, 2.0],
  ["esports", "Dota 2 — Aurora Cup", "Aegis", "Tempo Storm", 600, "upcoming", null, null, null, 2.05, null, 1.78],
  ["ice-hockey", "Northern Ice League", "Oslo Fjords", "Helsinki Frost", -9, "live", "2", "2", "P2 08:31", 2.15, null, 1.88],
  ["ice-hockey", "Northern Ice League", "Stockholm Royals", "Prague Lions", 82, "upcoming", null, null, null, 1.9, null, 2.0],
  ["ice-hockey", "Champions Ice Cup", "Zurich Peaks", "Vienna Stars", 500, "upcoming", null, null, null, 2.35, null, 1.7],
  ["volleyball", "CEV Champions", "Perugia Volley", "Warsaw Eagles", 15, "upcoming", null, null, null, 1.6, null, 2.4],
  ["volleyball", "CEV Champions", "Ankara Spor", "Milano Azzurri", 270, "upcoming", null, null, null, 2.2, null, 1.68],
  ["table-tennis", "19X TT Series", "Lin Wei", "Dmitri Sokolov", -6, "live", "2", "1", "Set 4", 1.72, null, 2.05],
  ["table-tennis", "19X TT Series", "Hugo Laurent", "Kenta Mori", 42, "upcoming", null, null, null, 1.95, null, 1.85],
  ["badminton", "Asia Open", "P. V. Nair", "Yuki Tanaka", 72, "upcoming", null, null, null, 1.55, null, 2.35],
  ["mma", "Nova Fight Night", "K. Okafor", "D. Reyes", 660, "upcoming", null, null, null, 1.62, null, 2.3],
  ["mma", "Nova Fight Night", "M. Lindqvist", "S. Almeida", 780, "upcoming", null, null, null, 2.1, null, 1.72],
  ["baseball", "Pacific Series", "Tokyo Waves", "Seoul Comets", 300, "upcoming", null, null, null, 1.78, null, 2.02],
  ["horse-racing", "19X Derby — Race 7", "Silver Comet", "Field of 12", 25, "upcoming", null, null, null, 3.4, null, 2.1],
  ["football", "Premier Division", "Kingsport United", "Westgate Athletic", -2880, "finished", "3", "1", "FT", 2.1, 3.3, 3.4],
  ["cricket", "19X T20 League", "Coastal Chargers", "Highland Hawks", -2640, "finished", "178/5", "164/8", "FT", 1.72, null, 2.15],
  ["basketball", "Nova Basketball League", "Metro Kings", "Harbour Heat", -2400, "finished", "96", "88", "FT", 1.88, null, 1.96],
  ["tennis", "Challenger Tour", "N. Petrov", "D. Marin", -2160, "finished", "2", "1", "FT", 1.65, null, 2.3]
];

const matches = matchSeed.map((m, i) => {
  const [sport, league, home, away, offset, status, scoreHome, scoreAway, minute, oh, od, oa] = m;
  return {
    id: `m${String(i + 1).padStart(3, "0")}`,
    sport, league,
    homeTeam: home, awayTeam: away,
    startTime: iso(offset),
    status,
    scoreHome, scoreAway, minute,
    oddsHome: oh, oddsDraw: od, oddsAway: oa,
    featured: i < 12,
    demo: true
  };
});

const themes = [
  { from: "#102a56", to: "#0a1730", accent: "#5ee7ff", icon: "orbit" },
  { from: "#3b1d69", to: "#160d2f", accent: "#b18cff", icon: "gem" },
  { from: "#123f3a", to: "#071f22", accent: "#6fffc4", icon: "bolt" },
  { from: "#5a1a2c", to: "#220914", accent: "#ff8d8d", icon: "flame" },
  { from: "#4e360c", to: "#201604", accent: "#ffd166", icon: "crown" },
  { from: "#0c3555", to: "#061b2e", accent: "#5cc8ff", icon: "waves" },
  { from: "#3e2d0e", to: "#1b1407", accent: "#ffc857", icon: "coins" },
  { from: "#2b1b4e", to: "#120d24", accent: "#ff7ae0", icon: "sparkles" }
];

const G = (id, name, category, provider, playable, rtp, volatility, tagline, description, theme, extra = {}) => ({
  id, name, category, provider,
  playable,
  integrationStatus: playable ? "playable_demo" : "provider_required",
  rtp, volatility,
  tagline, description,
  howTo: playable ? [
    "Set your coin stake using the controls on the right.",
    "Start the round and follow the on-screen action.",
    "Cash out or let the round complete, then review the result in your activity.",
    "Use the history panel to see your last rounds. Coins have no cash value."
  ] : [
    "This title is presented as an integration-ready interface.",
    "A licensed provider connection is required before play can be enabled.",
    "No live dealer feed, real wager, or payout is active in this environment.",
    "Contact platform operations to complete provider certification."
  ],
  features: extra.features || ["Server-authoritative rounds", "Responsive game canvas", "Detailed round history", "Responsible-play controls"],
  theme,
  badge: extra.badge || null,
  featured: !!extra.featured,
  players: extra.players || Math.floor(1200 + Math.random() * 9500),
  sortOrder: extra.sortOrder || 100,
  maxWin: extra.maxWin || "5,000x"
});

const games = [
  G("crash-orbit", "Crash Orbit", "crash", "19X Originals", true, 98, "High", "Ride the curve. Cash out before orbit breaks.", "A live multiplier curve climbs from 1.00x. Cash out at any moment to bank your stake multiplied by the current value — wait too long and the round ends at zero. Every crash point is generated server-side and recorded.", themes[0], { badge: "ORIGINAL", featured: true, maxWin: "1,000x", sortOrder: 1, features: ["Live multiplier graph", "Manual and auto cash-out", "Server-generated crash points", "Instant round history"] }),
  G("mines-vault", "Mines Vault", "mines", "19X Originals", true, 97, "Medium", "Reveal gems, dodge the mines, take the profit.", "A 5×5 vault hides between one and twenty-four mines. Every safe tile raises your multiplier. Cash out whenever you like — or clear the board for the maximum win.", themes[1], { badge: "ORIGINAL", featured: true, maxWin: "2,231x", sortOrder: 2 }),
  G("plinko-drop", "Plinko Drop", "plinko", "19X Originals", true, 99, "Medium", "Drop the ball. Follow the path. Find your multiplier.", "Choose a risk profile and number of rows, then send a ball through the peg field. The landing bucket determines your payout. Paths are generated on our servers and shown after each drop.", themes[2], { badge: "ORIGINAL", featured: true, maxWin: "170x", sortOrder: 3 }),
  G("dice-roll", "Dice Roll", "dice", "19X Originals", true, 99, "Low", "Set your target. Roll above or below. Simple by design.", "Roll a number between 0 and 100. Choose your target and direction to set the win chance and multiplier. The result is generated with a cryptographically secure server RNG.", themes[3], { badge: "ORIGINAL", featured: true, maxWin: "49.5x", sortOrder: 4 }),
  G("wheel-of-astra", "Wheel of 19X", "wheel", "19X Originals", true, 97.9, "High", "One spin. Twenty-four sectors. Endless possibility.", "Spin the 19X wheel and land on a multiplier from 0x to 5x. Every result is settled by the server and stored with its round identifier.", themes[4], { badge: "ORIGINAL", featured: true, maxWin: "5x", sortOrder: 5 }),
  G("coin-flip", "Coinflip", "coinflip", "19X Originals", true, 98, "Low", "Heads or tails. One call, instant result.", "Call the coin and let it fly. A winning call returns 1.96x your stake. Rounds resolve instantly and are recorded for your activity history.", themes[5], { badge: "ORIGINAL", featured: true, maxWin: "1.96x", sortOrder: 6 }),
  G("hi-lo", "Hi-Lo", "cards", "19X Originals", true, 97, "Medium", "Higher or lower? Read the card, trust your call.", "A card is drawn and revealed. Predict whether the next card will be higher or lower. Ties lose. Volatility changes with the rank on the table.", themes[6], { badge: "ORIGINAL", featured: true, maxWin: "12x", sortOrder: 7 }),
  G("lucky-ten", "Lucky Ten", "lucky", "19X Originals", true, 90, "High", "Pick a number. Ten possibilities. One golden draw.", "Choose one number from zero to nine. If the draw lands on your number, the round pays 9x. Results are generated on the server and immediately auditable in your history.", themes[7], { badge: "ORIGINAL", featured: false, maxWin: "9x", sortOrder: 8 }),
  G("nova-fruits", "Nova Fruits", "slots", "19X Originals", true, 96, "Medium", "Classic fruit energy with three reels and three paylines.", "A three-reel, three-row original slot with three paylines. Match three symbols across any row. Simple to learn, quick to play, and built with responsible coin limits.", themes[4], { badge: "ORIGINAL", featured: true, maxWin: "180x", sortOrder: 9 }),
  G("velocity-derby", "Velocity Derby", "virtuals", "19X Originals", true, 96.2, "Medium", "Six runners. One finish line. Pick your champion.", "A fully simulated six-horse race with fixed virtual odds. Pick a runner, watch the simulated race, and see the official order in your results history. No real horses or live events are involved.", themes[2], { badge: "ORIGINAL", featured: true, maxWin: "25x", sortOrder: 10 }),
  G("keno-blitz", "Keno Blitz", "instant", "Novaline Studios", false, 96.2, "Medium", "Fast numbers, bright lights, instant draws.", "A licensed Keno title prepared for provider integration. The interface is wired to the provider adapter contract; real play remains disabled until certification.", themes[3], { players: 7432, sortOrder: 20, maxWin: "10,000x" }),
  G("scratch-nova", "Scratch Nova", "instant", "Lumen Gaming", false, 95.8, "Low", "Scratch the surface. Reveal a tiny constellation of wins.", "A scratch-card mechanic prepared for integration. The demo layout, loading state, and session guard are complete; the provider renderer is pending.", themes[5], { players: 3221, sortOrder: 21 }),
  G("limbo-velocity", "Limbo Velocity", "instant", "Velocity Works", false, 99, "High", "Set a target multiplier. Beat it to win.", "A multiplier-target game prepared for provider integration. The API adapter and responsible-play cap are specified but not enabled in this environment.", themes[0], { players: 5644, sortOrder: 22 }),
  G("airball-crash", "Airball", "crash", "Novaline Studios", false, 97, "High", "A second crash title, awaiting provider certification.", "An integration-ready crash interface from Novaline Studios. The game logic and outcome engine belong to the licensed provider and are not simulated here.", themes[1], { players: 2891, sortOrder: 23 }),
  G("tower-climb", "Tower Climb", "instant", "Lumen Gaming", false, 97, "Medium", "Climb the tower, collect along the way.", "An integration-ready step-based game. Card artwork, information architecture, and session guards are complete; provider certification is pending.", themes[2], { players: 1876, sortOrder: 24 }),
  G("neon-fortune", "Neon Fortune", "slots", "Cobalt Play", false, 96.4, "High", "A neon-lit five-reel journey through the city that never sleeps.", "A provider slot stage prepared for integration. Provider: Cobalt Play. Volatility: high. The launch button is disabled until the certified provider session is configured.", themes[1], { badge: "NEW", players: 9321, sortOrder: 30, maxWin: "12,500x" }),
  G("starlight-lines", "Starlight Lines", "slots", "Novaline Studios", false, 96.1, "Medium", "Twenty-five lines of starlit wins.", "A five-reel, 25-line slot interface. Artwork and information panels are in place; provider connectivity and outcome reporting are pending certification.", themes[0], { players: 8120, sortOrder: 31, maxWin: "5,000x" }),
  G("golden-nova", "Golden Nova", "slots", "Helios Interactive", false, 95.9, "High", "Chase the golden nova across five reels.", "An integration-ready slot with a hold-and-win bonus concept. All play and outcome logic remain with the licensed provider.", themes[4], { badge: "HOT", players: 11980, sortOrder: 32, maxWin: "8,000x" }),
  G("mystic-temple", "Mystic Temple", "slots", "Enigma Labs", false, 96.3, "Medium", "Enter the temple. Follow the fireflies.", "A five-reel adventure slot prepared for provider integration, with original artwork and a responsive information panel.", themes[2], { players: 6742, sortOrder: 33, maxWin: "7,500x" }),
  G("sakura-fortune", "Sakura Fortune", "slots", "Aurora Live", false, 96.0, "Medium", "A calm, blossom-filled reel set.", "An integration-ready slot from Aurora Live. The provider session contract is defined; demo spins are not available for third-party titles.", themes[7], { badge: "NEW", players: 4550, sortOrder: 34, maxWin: "4,000x" }),
  G("cyber-heist", "Cyber Heist", "slots", "Cobalt Play", false, 95.7, "High", "Break the vault across five reels.", "A high-volatility heist-themed slot interface. Provider integration is required before this title can be launched.", themes[1], { players: 7211, sortOrder: 35, maxWin: "9,000x" }),
  G("dragons-vault", "Dragon's Vault", "slots", "Helios Interactive", false, 96.2, "High", "The vault breathes fire.", "A dragon-themed slot stage with original artwork. The certified provider game session is not connected in this environment.", themes[3], { players: 6320, sortOrder: 36, maxWin: "10,000x" }),
  G("frost-queen", "Frost Queen", "slots", "Novaline Studios", false, 96.5, "Medium", "An icy realm of expanding wilds.", "A winter-themed slot prepared for integration. Interface and content panels complete; provider renderer pending.", themes[5], { players: 3812, sortOrder: 37, maxWin: "6,000x" }),
  G("cairo-nights", "Cairo Nights", "slots", "Lumen Gaming", false, 95.8, "Medium", "Lanterns, spice markets, and golden reels.", "A richly themed slot awaiting provider certification. The interface is fully described and ready for a certified launch URL.", themes[6], { players: 2934, sortOrder: 38, maxWin: "5,500x" }),
  G("jungle-spirit", "Jungle Spirit", "slots", "Enigma Labs", false, 96.1, "Medium", "Deep in the emerald canopy, the reels awaken.", "A jungle adventure slot interface prepared for integration. Third-party play and outcomes are disabled.", themes[2], { players: 5123, sortOrder: 39, maxWin: "5,000x" }),
  G("aztec-eclipse", "Aztec Eclipse", "slots", "Aurora Live", false, 96.4, "High", "When the sun hides, the temple pays.", "An Aztec-themed, high-volatility slot prepared for provider integration. No third-party outcome or wager is simulated here.", themes[6], { players: 6631, sortOrder: 40, maxWin: "11,000x" }),
  G("neon-reels", "Neon Reels", "slots", "Velocity Works", false, 96.0, "Low", "A quick-hit, low-volatility reel set.", "A low-volatility slot interface ready for a certified provider launch. Artwork is original 19xbet365 studio work.", themes[3], { players: 4408, sortOrder: 41, maxWin: "2,500x" }),
  G("gilded-crown", "Gilded Crown", "slots", "Helios Interactive", false, 96.6, "Medium", "Royal reels with a gilded edge.", "A regal slot interface prepared for integration. Provider connectivity and regulatory certification are required before activation.", themes[4], { players: 9902, sortOrder: 42, maxWin: "7,000x" }),
  G("titans-gate", "Titan's Gate", "slots", "Cobalt Play", false, 95.6, "High", "Open the gate. Face the titan.", "A high-volatility slot interface with original art direction. The title remains in integration-ready status.", themes[0], { players: 5721, sortOrder: 43, maxWin: "15,000x" }),
  G("lucky-lanterns", "Lucky Lanterns", "slots", "Lumen Gaming", false, 96.2, "Medium", "Lanterns rise, wins follow.", "A festival-themed slot prepared for certified provider integration. Play remains disabled in this foundation build.", themes[3], { players: 3340, sortOrder: 44, maxWin: "5,000x" }),
  G("crystal-cavern", "Crystal Cavern", "slots", "Novaline Studios", false, 96.3, "Medium", "Find the light beneath the mountain.", "A crystal-themed slot interface awaiting provider certification. The game detail page documents integration requirements.", themes[2], { players: 2205, sortOrder: 45, maxWin: "6,000x" }),
  G("phoenix-fire", "Phoenix Fire", "slots", "Enigma Labs", false, 95.9, "High", "Rise again with expanding flame wilds.", "A phoenix-themed slot stage prepared for integration. All gameplay remains with the licensed provider.", themes[3], { players: 8104, sortOrder: 46, maxWin: "9,500x" }),
  G("astra-roulette-live", "19X Roulette Live", "live-casino", "Aurora Live", false, 97.3, "Low", "A cinematic roulette table with a live dealer feed.", "An integration-ready live dealer roulette lobby. A certified live-stream provider, dealer studio, and real-wager license are required; none are active here.", themes[4], { badge: "LIVE SOON", players: 13800, sortOrder: 50, features: ["Live dealer video", "Betting timer", "Full spin history", "Provider studio controls"], maxWin: "36x" }),
  G("blackjack-azure", "Blackjack Azure", "live-casino", "Aurora Live", false, 99.5, "Low", "Seven seats. One elegant table.", "A live blackjack table interface prepared for provider integration. The demo can display the table shell and rules, but no dealer feed or real-money play is active.", themes[0], { players: 8420, sortOrder: 51, maxWin: "2.5x" }),
  G("baccarat-royale", "Baccarat Royale", "live-casino", "Aurora Live", false, 98.9, "Low", "The classic card game, presented in full evening dress.", "A baccarat table interface prepared for live provider integration. Provider stream and wagering are not connected.", themes[3], { players: 6321, sortOrder: 52, maxWin: "9x" }),
  G("dream-wheel-live", "Dream Wheel Live", "live-casino", "Aurora Live", false, 96.8, "High", "A game-show wheel with a live host.", "A live game-show interface prepared for integration. Host video, game engine, and real-wager settlement require a certified provider.", themes[7], { badge: "POPULAR", players: 17720, sortOrder: 53, maxWin: "1,000x" }),
  G("holdem-prime", "Texas Hold'em Prime", "live-casino", "Aurora Live", false, 97.5, "Medium", "Tournament tables with a studio presentation.", "A poker lobby interface ready for provider integration. Real-money tables are not available in this foundation build.", themes[2], { players: 4720, sortOrder: 54, maxWin: "Pot" }),
  G("sicbo-nova", "Sic Bo Nova", "live-casino", "Aurora Live", false, 97.2, "Medium", "Three dice, a live table, and 50 ways to play.", "A live Sic Bo table shell prepared for provider integration. Stake ranges and dealer controls are illustrative only.", themes[1], { players: 2910, sortOrder: 55, maxWin: "180x" }),
  G("speed-baccarat", "Speed Baccarat", "live-casino", "Aurora Live", false, 98.8, "Low", "A faster cadence for the classic table game.", "A speed baccarat table interface awaiting provider certification. No live dealer feed is connected.", themes[5], { players: 5102, sortOrder: 56, maxWin: "9x" }),
  G("virtual-football", "Virtual Football League", "virtuals", "Velocity Works", false, 95.5, "Medium", "A full simulated league, every few minutes.", "An integration-ready virtual football product. Match simulation, league schedules, and provider odds require the certified Velocity Works feed.", themes[1], { players: 9150, sortOrder: 60, maxWin: "50x" }),
  G("speed-derby", "Speed Derby", "virtuals", "19X Originals", true, 95, "High", "Eight lanes. One electric finish.", "A second 19X virtual racing product with a speedway theme. Choose a lane, watch the simulation, and review the official order.", themes[5], { badge: "ORIGINAL", players: 4320, sortOrder: 61, maxWin: "14x" }),
  G("greyhound-sprint", "Greyhound Sprint", "virtuals", "Velocity Works", false, 94.8, "High", "Six hounds, one short dash.", "A virtual greyhound racing interface prepared for provider integration. No real animals or live races are involved.", themes[3], { players: 3220, sortOrder: 62, maxWin: "14x" }),
  G("virtual-basketball", "Virtual Basketball", "virtuals", "Velocity Works", false, 95.2, "Medium", "A simulated court clash with live-style stats.", "An integration-ready virtual basketball product. The provider simulation engine is not connected.", themes[0], { players: 2100, sortOrder: 63, maxWin: "20x" }),
  G("virtual-tennis", "Virtual Tennis Open", "virtuals", "Velocity Works", false, 95.4, "Medium", "A simulated tennis tournament.", "A virtual tennis interface awaiting provider integration. All simulated event data is illustrative.", themes[2], { players: 1900, sortOrder: 64, maxWin: "18x" }),
  G("bingo-bonanza", "Bingo Bonanza", "bingo", "19X Originals", true, 96.5, "Medium", "Three by three. Twelve calls. One quick bingo hit.", "A fast 3×3 bingo card with a 12-number draw. Complete any row, column or diagonal for a line prize, or mark the full card for the top payout. Every ticket and draw is generated by the 19X server.", themes[3], { badge: "ORIGINAL", featured: false, players: 6400, sortOrder: 70, maxWin: "5,000x", features: ["3×3 quick bingo card", "12-number server draw", "Line and full-house prizes", "Round history"] }),
  G("bingo-neon", "Neon Bingo", "bingo", "19X Originals", true, 96.5, "Medium", "A neon bingo card with a midnight pulse.", "A second 19X bingo room with the same fast 3×3 card and server-generated 12-ball draw. Line prizes and a 5,000x full-house prize.", themes[1], { badge: "NEW", featured: false, players: 3100, sortOrder: 71, maxWin: "5,000x", features: ["3×3 quick bingo card", "12-number server draw", "Line and full-house prizes", "Round history"] }),
  G("video-poker-deluxe", "Video Poker Deluxe", "poker", "19X Originals", true, 98.0, "Low", "Five cards. Hold what matters. Draw for the paytable.", "A single-hand Jacks or Better video poker game. Receive five cards, choose which to hold, then draw replacements. Jacks or better returns the stake; premium hands pay up to 250x.", themes[0], { badge: "ORIGINAL", featured: false, players: 5200, sortOrder: 72, maxWin: "250x", features: ["Five-card draw", "Hold any card", "9/6 Jacks or Better paytable", "Server shoe and round history"] }),
  G("tv-wheelbet", "WheelBet", "tv", "19X Originals", true, 97.3, "Low", "Call a colour. Watch the wheel settle.", "A TV-style colour wheel with 36 numbers plus zero. Red and black pay 2x; the green zero pays 36x. The wheel result is generated on the server.", themes[2], { badge: "ORIGINAL", featured: false, players: 4300, sortOrder: 73, maxWin: "36x", features: ["36-number colour wheel", "Red/black and zero bets", "Server-generated result", "Round history"] }),
  G("war-of-elements", "War of Elements", "tv", "19X Originals", true, 97.7, "High", "Fire, water, earth or air. Choose your force.", "Four elemental forces with different payouts. Pick one; the server draws the winning force from calibrated weights. Earth pays 3.5x, air pays 25x.", themes[5], { badge: "ORIGINAL", featured: false, players: 2900, sortOrder: 74, maxWin: "25x", features: ["Four elemental picks", "Calibrated payouts", "Server-generated result", "Round history"] }),
  G("toto-fifteen", "Toto 15", "toto", "19X Originals", true, 82.0, "High", "Fifteen fixtures. Three outcomes each. One pool ticket.", "A simulated 15-fixture Toto pool. Select home, draw or away for every fixture; the server generates the 15 results and pays the correct-score tiers. A 15/15 ticket pays 120,000x.", themes[4], { badge: "ORIGINAL", featured: false, players: 3800, sortOrder: 75, maxWin: "120,000x", features: ["15-fixture pool ticket", "1/X/2 selections", "Tiered correct-score prizes", "Server-generated results"] }),
  G("lotto-636", "Lotto 6/36", "lotto", "19X Originals", true, 81.1, "High", "Six numbers. Thirty-six choices. One draw.", "Choose six numbers from 1–36. The server draws six winning numbers; matching two or more pays a tiered prize, with a 50,000x top prize for all six.", themes[6], { badge: "ORIGINAL", featured: false, players: 4100, sortOrder: 76, maxWin: "50,000x", features: ["6/36 number draw", "Tiered prizes from 2 matches", "Server-generated draw", "Round history"] }),
  G("scratch-gold", "Scratch Gold", "scratch", "19X Originals", true, 95.5, "Low", "Scratch the gold. Reveal a trio of wins.", "A 9-cell scratch card with three matching symbols paying a prize. Three stars pays 20x, three sevens pays 5x, and any other trio returns the stake. All cards are server-generated.", themes[4], { badge: "ORIGINAL", featured: false, players: 2700, sortOrder: 77, maxWin: "20x", features: ["9-cell scratch card", "Tiered symbol prizes", "Server-generated card", "Round history"] }),
  G("scratch-lucky", "Scratch Lucky", "scratch", "19X Originals", true, 95.5, "Low", "A lucky little scratch card with a bright trio prize.", "A second 9-cell scratch card theme. Three stars pays 20x, three sevens pays 5x, and any other trio returns the stake.", themes[7], { badge: "NEW", featured: false, players: 2300, sortOrder: 78, maxWin: "20x", features: ["9-cell scratch card", "Tiered symbol prizes", "Server-generated card", "Round history"] }),
  G("reef-hunter", "Reef Hunter", "fishing", "19X Originals", true, 96.5, "High", "Aim for the rarest catch on the reef.", "Six reef creatures carry different payouts. Pick one; the server selects the catch from calibrated weights. Match the catch to win its multiplier, up to 50x.", themes[2], { badge: "ORIGINAL", featured: false, players: 2100, sortOrder: 79, maxWin: "50x", features: ["Six reef targets", "Calibrated catches", "Server-generated result", "Round history"] }),
  G("shadow-hunt", "Shadow Hunt", "fishing", "19X Originals", true, 96.5, "High", "Track the rarest creature through the night woods.", "A six-target hunting game. Choose your quarry; the server reveals the catch from calibrated weights. Match it to win up to 50x.", themes[3], { badge: "NEW", featured: false, players: 1800, sortOrder: 80, maxWin: "50x", features: ["Six woodland targets", "Calibrated catches", "Server-generated result", "Round history"] })
];

const promotions = [
  { id: "p1", title: "The 19X Welcome Haul", kicker: "NEW PLAYERS", description: "Start with 10,000 coins and a 500-coin gameplay boost. No deposit, no wagering, no cash value.", type: "welcome", badge: "COINS", theme: "lime", endsAt: null, cta: "Create an account", terms: "One welcome allocation per verified player. Coins cannot be withdrawn or exchanged. This is not a real-money bonus.", prize: "10,500 coins" },
  { id: "p2", title: "Crash Orbit: Altitude Week", kicker: "TOURNAMENT · LIVE", description: "The ten highest cash-out multipliers this week share a 250,000 coin prize pool.", type: "tournament", badge: "25 HOURS LEFT", theme: "cyan", endsAt: iso(25 * 60), cta: "View tournament", terms: "Open to registered players aged 18+. Minimum qualifying stake 50 coins. Leaderboard is based on the highest completed cash-out multiplier.", prize: "250,000 coins" },
  { id: "p3", title: "Weekend Multiplier", kicker: "CASINO", description: "Play any 19X Originals game on Saturday or Sunday and collect a 10% coin top-up on net losses.", type: "casino", badge: "SAT & SUN", theme: "violet", endsAt: iso(96 * 60), cta: "Explore originals", terms: "Maximum top-up 1,000 coins per day. Coins only. Bonus terms apply.", prize: "10% back" },
  { id: "p4", title: "Prediction Points", kicker: "SPORTS", description: "Build a five-selection football accumulator and earn double loyalty points when all five settle as winners.", type: "sports", badge: "DOUBLE XP", theme: "gold", endsAt: iso(7 * 24 * 60), cta: "View football", terms: "Minimum combined odds 3.00. Coin bets only. Loyalty points have no cash value.", prize: "2× XP" },
  { id: "p5", title: "Mines Vault: Deep Run", kicker: "TOURNAMENT · STARTS SOON", description: "Clear the most tiles without a bust. The top 50 vault runners win from a 100,000 coin pool.", type: "tournament", badge: "STARTS FRIDAY", theme: "emerald", endsAt: iso(2 * 24 * 60), cta: "Open Mines Vault", terms: "Each round is recorded. Leaderboard ranks by total tiles cleared across qualifying rounds.", prize: "100,000 coins" },
  { id: "p6", title: "Bring a Friend", kicker: "REFERRALS", description: "Invite a friend to 19xbet365. You both receive 1,000 coins after their first game round.", type: "referral", badge: "BOTH WIN", theme: "rose", endsAt: null, cta: "Get your invite code", terms: "Referrals do not grant administrative access. One reward per verified new account. Coins only.", prize: "1,000 coins each" }
];

const tournaments = [
  { id: "t1", name: "Crash Orbit: Altitude Week", gameId: "crash-orbit", prizePool: 250000, startsAt: iso(-3 * 24 * 60), endsAt: iso(25 * 60), status: "live", participants: 18427, leaderboard: [["Kairo_88", 949.2], ["NovaRider", 712.8], ["mellowfox", 603.4], ["TaraTakesOff", 558.1], ["A1pha", 441.7]] },
  { id: "t2", name: "Mines Vault: Deep Run", gameId: "mines-vault", prizePool: 100000, startsAt: iso(2 * 24 * 60), endsAt: iso(5 * 24 * 60), status: "upcoming", participants: 9320, leaderboard: [] },
  { id: "t3", name: "Nova Fruits Harvest", gameId: "nova-fruits", prizePool: 75000, startsAt: iso(-5 * 24 * 60), endsAt: iso(10 * 24 * 60), status: "live", participants: 6120, leaderboard: [["fruitbat", 88], ["SunnyD", 74], ["Rell", 69], ["Kiko", 62], ["plumbob", 58]] },
  { id: "t4", name: "19X Sports Predictor", gameId: null, prizePool: 500000, startsAt: iso(-24 * 60), endsAt: iso(12 * 24 * 60), status: "live", participants: 42321, leaderboard: [["TheGaffer", 1420], ["CornerFlag", 1310], ["xGuru", 1288], ["AwayDay", 1199], ["TikiTaka", 1150]] }
];

const helpArticles = [
  { slug: "getting-started", title: "Getting started with 19xbet365", category: "Account", body: "19xbet365 is a free-to-play demonstration platform. Create an account, explore the sportsbook and games, and use coins to try every interaction. Coins have no cash value and cannot be purchased, withdrawn, or exchanged." },
  { slug: "coins", title: "How coins work", category: "Wallet", body: "Coins are the only balance used on 19xbet365. They are granted for demonstration and cannot be bought or redeemed. Every stake, payout, and adjustment is recorded in your wallet history. Real-money deposits and withdrawals are disabled." },
  { slug: "placing-a-bet", title: "Placing a sports bet", category: "Sports", body: "Open any sport, choose a match, then tap one of the odds buttons to add a selection to your bet slip. Enter a stake and confirm. A single selection creates a single bet; two or more create an accumulator. All bets use coins and are limited to demo fixtures." },
  { slug: "cash-out", title: "Cashing out in Crash Orbit", category: "Games", body: "After launching a Crash Orbit round, the multiplier starts at 1.00x and climbs. Press Cash Out before the round ends to bank your stake multiplied by the current value. If the round ends first, the stake is lost. Auto cash-out can be set before launch." },
  { slug: "provably-fair", title: "How outcomes are generated", category: "Fairness", body: "Playable 19X Originals rounds are generated on the server using cryptographically secure random values. The client never decides an outcome. Completed rounds are recorded in your activity history. No third-party provider session or certified live-dealer feed is connected." },
  { slug: "responsible-play", title: "Responsible play tools", category: "Safety", body: "Use Responsible Gaming in your account to set a daily coin limit, a session reminder, a cool-off period, or a self-exclusion. These controls apply to this demo and are recorded for transparency." },
  { slug: "verification", title: "Account verification and security", category: "Security", body: "Keep your password private. 19xbet365 staff will never ask for your password or a one-time code. You can review active sessions and sign out other devices from Security settings. Two-factor authentication is available as a demonstration control." },
  { slug: "referrals", title: "Inviting friends", category: "Account", body: "Share your referral code from your profile. A referred player receives the standard welcome allocation and you receive a referral reward once they complete their first round. Referring a player never grants administrative access." },
  { slug: "providers", title: "19X Originals and certified providers", category: "Games", body: "All 55 catalogue games are 19X Originals: slots, crash, instant, bingo, video poker, TV games, Toto, Lotto, scratch cards, fishing and RNG table games. They are generated and settled by the 19xbet365 server and can be played with coins. No third-party provider session, live-dealer feed, or independently certified game maths is connected. Game pages state this plainly and never present an original RNG title as a certified provider game." },
  { slug: "support", title: "Contacting support", category: "Support", body: "Open a support ticket from the Help Centre with your account email and a clear description. For security, never include your password. Response times shown in the support centre are illustrative for this foundation build." }
];

// Every slot in the catalogue is now a first-party three-reel 19X game.
const SLOT_RTP = 95.6;
for (const game of games) {
  if (game.category !== "slots") continue;
  game.playable = true;
  game.provider = "19X Originals";
  game.integrationStatus = "playable_demo";
  game.rtp = SLOT_RTP;
  game.tagline = game.tagline.replace(/five-reel/gi, "three-reel");
  game.description = `An original 19X three-reel slot with three horizontal paylines. Set a coin stake, spin the reels, and settle matching symbols instantly. Every outcome is generated by the server and recorded in your game history.`;
  game.howTo = [
    "Set your coin stake in the game panel.",
    "Spin the three reels and watch the paylines settle.",
    "Three matching symbols on a line pay the top prize; pairs pay smaller returns.",
    "Review every settled spin in your game activity. Coins have no cash value."
  ];
  game.features = ["Three-reel, three-line slot", "Server-authoritative RNG", "Responsive reel stage", "Round history and responsible-play limits"];
  game.maxWin = "180x";
}

for (const game of games) {
  if (game.category === "virtuals") {
    game.playable = true;
    game.provider = "19X Originals";
    game.integrationStatus = "playable_demo";
    game.tagline = game.tagline.replace(/provider|licensed/gi, "simulated");
    game.description = "A simulated 19X virtual event with server-generated finishing order. Pick a competitor, watch the visual replay, and settle the result into your coin wallet. No real teams, animals or live events are involved.";
    game.howTo = [
      "Pick a competitor and set your coin stake.",
      "Start the event and watch the visual replay.",
      "The server-generated finishing order determines the payout.",
      "Review the result in your game activity. Coins have no cash value."
    ];
    game.features = ["Simulated event", "Server-generated finishing order", "Multiple competitors", "Responsive event stage"];
    game.maxWin = game.id === "speed-derby" ? "32x" : "25x";
    game.rtp = game.id === "speed-derby" ? 95.5 : 96.2;
    game.volatility = game.id === "speed-derby" ? "High" : "Medium";
  }
}

for (const game of games) {
  if (game.category === "instant") {
    game.playable = true;
    game.provider = "19X Originals";
    game.integrationStatus = "playable_demo";
    game.tagline = game.tagline.replace(/provider|licensed/gi, "server-generated");
    game.description = "An original 19X instant game with a cryptographically random server outcome. Set a coin stake, start the round, and review the result in your activity history.";
    game.howTo = [
      "Set your coin stake.",
      "Start the round and reveal the server-generated result.",
      "Winning outcomes are credited to your coin balance.",
      "Review the result in game activity. Coins have no cash value."
    ];
    game.features = ["Server-generated outcome", "Instant settlement", "Responsive game stage", "Round history"];
    const instantMeta = {
      "keno-blitz": { maxWin: "25x", rtp: 96.1, volatility: "Medium" },
      "scratch-nova": { maxWin: "20x", rtp: 95.5, volatility: "Low" },
      "limbo-velocity": { maxWin: "100x", rtp: 99, volatility: "High" },
      "tower-climb": { maxWin: "5x", rtp: 97, volatility: "Medium" }
    }[game.id];
    if (instantMeta) Object.assign(game, instantMeta);
  }
  if (game.category === "live-casino") {
    game.playable = true;
    game.provider = "19X Originals";
    game.integrationStatus = "playable_demo";
    game.name = game.name.replace(/\s+Live$/i, "").replace("Dream Wheel Live", "Dream Wheel");
    game.tagline = "An RNG table game built for 19X. Not a live dealer feed.";
    game.description = "An original 19X RNG table game. Choose a bet, play the round, and receive a server-generated result. This is not a live dealer or certified provider table.";
    game.howTo = [
      "Choose a bet option and set your coin stake.",
      "Play the round and reveal the server-generated result.",
      "Winning bets are credited to your coin balance.",
      "Review the result in game activity. Coins have no cash value."
    ];
    game.features = ["Server-generated RNG table", "Instant settlement", "Responsive table stage", "Round history"];
    game.badge = null;
    const tableMeta = {
      "astra-roulette-live": { maxWin: "2x", rtp: 97.3, volatility: "Low" },
      "blackjack-azure": { maxWin: "2.5x", rtp: 95.7, volatility: "Low" },
      "baccarat-royale": { maxWin: "9x", rtp: 98.9, volatility: "Low" },
      "speed-baccarat": { maxWin: "9x", rtp: 98.9, volatility: "Low" },
      "dream-wheel-live": { maxWin: "5x", rtp: 97.9, volatility: "High" },
      "holdem-prime": { maxWin: "1.95x", rtp: 97.3, volatility: "Medium" },
      "sicbo-nova": { maxWin: "2x", rtp: 97.2, volatility: "Medium" }
    }[game.id];
    if (tableMeta) Object.assign(game, tableMeta);
    if (game.id === "blackjack-azure") {
      game.howTo = [
        "Set your coin stake and deal a hand. Dealer stands on soft 17.",
        "Hit to draw another card, or stand to let the dealer play.",
        "Blackjack pays 3:2; a winning hand pays even money; equal totals push.",
        "This table offers hit and stand only. Doubling and splitting are not available."
      ];
      game.features = ["Server-authoritative six-deck shoe", "Hit and stand decisions", "Blackjack pays 3:2", "Settled hands in round history"];
    }
  }
  if (game.id === "airball-crash") {
    game.playable = true;
    game.provider = "19X Originals";
    game.integrationStatus = "playable_demo";
    game.tagline = "A second crash curve. Cash out before it bursts.";
    game.description = "An original 19X crash game. The multiplier climbs from 1.00x and the server-generated crash point ends the round. Cash out at any time to bank the current multiplier.";
    game.howTo = [
      "Set your coin stake and optional auto cash-out.",
      "Launch the round and watch the multiplier climb.",
      "Cash out before the server-generated crash point.",
      "Review settled rounds in your activity. Coins have no cash value."
    ];
    game.features = ["Server-generated crash point", "Manual and auto cash-out", "Live multiplier curve", "Round history"];
    game.maxWin = "1,000x";
    game.rtp = 98;
    game.volatility = "High";
  }
}

const NEW_CATEGORY_HOWTO = {
  bingo: [
    "Set your coin stake and buy a 3×3 bingo card.",
    "The server draws 12 numbers from 30.",
    "Complete a row, column or diagonal for a line prize; mark the whole card for the top prize.",
    "Review the ticket and every call in your game activity. Coins have no cash value."
  ],
  poker: [
    "Set your coin stake and deal five cards.",
    "Choose the cards to hold, then draw replacements.",
    "Jacks or better returns your stake; stronger hands pay up to 250x.",
    "Review the settled hand in your game activity. Coins have no cash value."
  ],
  tv: [
    "Choose a bet and set your coin stake.",
    "Start the round and watch the server-generated result.",
    "Winning outcomes are credited to your coin balance.",
    "Review the result in game activity. Coins have no cash value."
  ],
  toto: [
    "Choose home, draw or away for all 15 fixtures.",
    "Set your coin stake and submit the pool ticket.",
    "The server generates the 15 results and counts your correct selections.",
    "Prizes follow the Toto 15 correct-score tiers. Coins have no cash value."
  ],
  lotto: [
    "Pick six different numbers from 1 to 36.",
    "Set your coin stake and start the draw.",
    "The server draws six winning numbers; two or more matches pay a tiered prize.",
    "Review the draw in your game activity. Coins have no cash value."
  ],
  scratch: [
    "Set your coin stake and reveal a server-generated scratch card.",
    "Three matching symbols pay the card's prize; some trios return your stake.",
    "Winning amounts are credited to your coin balance.",
    "Review the card in game activity. Coins have no cash value."
  ],
  fishing: [
    "Choose a reef creature and set your coin stake.",
    "The server selects the catch from calibrated weights.",
    "Match the catch to win its multiplier, up to 50x.",
    "Review the result in game activity. Coins have no cash value."
  ]
};
for (const game of games) {
  if (NEW_CATEGORY_HOWTO[game.category]) game.howTo = NEW_CATEGORY_HOWTO[game.category];
}

const data = { generatedAt: now.toISOString(), sports, matches, games, promotions, tournaments, helpArticles };
mkdirSync(join(root, "shared"), { recursive: true });
writeFileSync(join(root, "shared", "catalog.json"), JSON.stringify(data, null, 2));
mkdirSync(join(root, "frontend", "src", "data"), { recursive: true });
writeFileSync(join(root, "frontend", "src", "data", "catalog.json"), JSON.stringify(data, null, 2));
console.log(`catalog written: ${sports.length} sports, ${matches.length} matches, ${games.length} games, ${promotions.length} promos, ${tournaments.length} tournaments`);
