import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { loadSession } from "./middleware/auth.js";
import { errorHandler, rateLimit } from "./middleware/common.js";
import { attachWebSocket } from "./ws.js";
import { pool } from "./db.js";
import authRoutes from "./routes/auth.js";
import publicRoutes from "./routes/public.js";
import playerRoutes from "./routes/player.js";
import betRoutes from "./routes/bets.js";
import gameRoutes from "./routes/games.js";
import depositRoutes from "./routes/deposits.js";
import fantasyRoutes from "./routes/fantasy.js";
import adminFantasyRoutes from "./routes/adminFantasy.js";
import verificationRoutes from "./routes/verification.js";
import withdrawalRoutes from "./routes/withdrawals.js";
import adminComplianceRoutes from "./routes/adminCompliance.js";
import adminRoutes from "./routes/admin.js";
import { startDemoSettlementWorker } from "./services/sportsbook.js";
import { startFantasyWorker } from "./services/fantasy.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const frontendRoot = join(root, "frontend");
const distRoot = join(frontendRoot, "dist");
const PORT = Number(process.env.PORT || 4000);

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(express.json({ limit: "256kb" }));
app.use(cookieParser());

app.use("/api", rateLimit({ windowMs: 60_000, max: 600 }));
app.use("/api", async (req, res, next) => {
  try {
    const session = await loadSession(req);
    req.account = session?.account || null;
    req.blocked = session?.blocked || null;
    if (req.blocked && req.path !== "/auth/logout") {
      return res.status(403).json({
        error: "account_unavailable",
        message: "This account is not available. Contact support for assistance."
      });
    }
    return next();
  } catch (error) {
    return next(error);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/player", playerRoutes);
app.use("/api/bets", betRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/deposits", depositRoutes);
app.use("/api/fantasy", fantasyRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/admin/fantasy", adminFantasyRoutes);
app.use("/api/admin/compliance", adminComplianceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", publicRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "not_found", message: "That API route does not exist." });
});

if (existsSync(distRoot)) {
  app.use(express.static(distRoot, {
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
    setHeaders: (res, path) => {
      if (path.endsWith("index.html")) res.setHeader("Cache-Control", "no-cache");
    }
  }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/ws")) return next();
    const indexFile = join(distRoot, "index.html");
    if (!existsSync(indexFile)) return next();
    return res.sendFile(indexFile);
  });
} else {
  app.get("/", (req, res) => {
    res.type("html").send(`<!doctype html><html><body style="font-family:system-ui;background:#07111f;color:#eaf6ff;padding:40px">
      <h1>19xbet365 API is running</h1>
      <p>The frontend build was not found at <code>${distRoot}</code>.</p>
      <p>API health: <a style="color:#66f6e3" href="/api/health">/api/health</a></p>
    </body></html>`);
  });
}

app.use(errorHandler);

const server = createServer(app);
attachWebSocket(server);

server.listen(PORT, () => {
  console.log(`19xbet365 API listening on http://127.0.0.1:${PORT}`);
  console.log(`Static frontend: ${distRoot}`);
  startDemoSettlementWorker();
  startFantasyWorker();
});

async function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down`);
  server.close(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 8000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (error) => {
  console.error("[unhandledRejection]", error);
});
