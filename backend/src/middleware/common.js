const buckets = new Map();

export function rateLimit({ windowMs = 60_000, max = 60, key = (req) => req.ip, message = "Too many requests. Try again shortly." } = {}) {
  return (req, res, next) => {
    const bucketKey = key(req) || "global";
    const now = Date.now();
    let bucket = buckets.get(bucketKey);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(bucketKey, bucket);
    }
    bucket.count += 1;
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - bucket.count));
    if (bucket.count > max) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ error: "rate_limited", message });
    }
    return next();
  };
}

export function loginRateLimit() {
  const attempts = new Map();
  return (req, res, next) => {
    const email = String(req.body?.email || "").toLowerCase();
    const ip = req.ip || "unknown";
    const key = `${ip}:${email}`;
    const now = Date.now();
    const record = attempts.get(key);
    if (record && record.resetAt > now && record.count >= 8) {
      return res.status(429).json({
        error: "login_rate_limited",
        message: "Too many sign-in attempts. Wait 15 minutes before trying again."
      });
    }
    if (record && record.resetAt <= now) attempts.delete(key);
    req.recordFailedLogin = () => {
      const current = attempts.get(key) || { count: 0, resetAt: now + 15 * 60 * 1000 };
      current.count += 1;
      attempts.set(key, current);
    };
    req.clearFailedLogins = () => attempts.delete(key);
    return next();
  };
}

export function jsonError(status, code, message, details = undefined) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

export function errorHandler(error, req, res, _next) {
  const status = error.status || 500;
  if (status >= 500) console.error("[api]", error);
  res.status(status).json({
    error: error.code || "server_error",
    message: status >= 500 ? "Something went wrong. Please try again." : error.message,
    ...(error.details ? { details: error.details } : {})
  });
}
