const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();
const Stripe = require("stripe");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const SERVER_STARTED_AT = Date.now();
let isShuttingDown = false;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getMissingEnvVars() {
  return [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
  ].filter((key) => !process.env[key]);
}

function logStartupDiagnostics() {
  const missing = getMissingEnvVars();
  if (missing.length) {
    console.warn("[BOOT] Variáveis ausentes:", missing.join(", "));
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("[BOOT] STRIPE_SECRET_KEY não configurada. Checkout ficará indisponível.");
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn("[BOOT] STRIPE_WEBHOOK_SECRET não configurada. Webhook não será validado.");
  }

  console.log("[BOOT] Origens permitidas:", getAllowedOrigins().join(", "));
}

function getAllowedOrigins() {
  const configured = String(process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const defaults = [APP_URL, `http://localhost:${PORT}`, "http://127.0.0.1:3000"];
  return Array.from(new Set([...defaults, ...configured]));
}

const allowedOrigins = getAllowedOrigins();

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));
app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  req.receivedAt = Date.now();
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
  res.setHeader("X-DNS-Prefetch-Control", "off");
  if (isShuttingDown) {
    res.setHeader("Connection", "close");
    return res.status(503).json({ error: "Servidor em reinicialização. Tente novamente em instantes." });
  }
  if (req.path.startsWith("/api/me") || req.path.startsWith("/api/admin") || req.path === "/api/create-checkout-session") {
    res.setHeader("Cache-Control", "no-store");
  }
  next();
});
app.use("/api/stripe/webhook", express.raw({ type: "application/json", limit: "2mb" }));
app.use(express.json({ limit: "200kb" }));
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "JSON inválido enviado para a API." });
  }
  next(err);
});
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/") || req.path === "/api/stripe/webhook") {
    return next();
  }

  const timeoutMs = 20000;
  res.setTimeout(timeoutMs, () => {
    if (!res.headersSent) {
      res.status(408).json({ error: "A requisição expirou no servidor." });
    }
  });

  next();
});
const publicDir = path.join(__dirname, "public");
const publicIndexFile = path.join(publicDir, "index.html");

app.use(express.static(publicDir, {
  etag: true,
  maxAge: "7d",
  setHeaders(res, filePath) {
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-store");
      return;
    }

    if (filePath.endsWith(".js") || filePath.endsWith(".css")) {
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      return;
    }

    res.setHeader("Cache-Control", "public, max-age=600, must-revalidate");
  }
}));

app.get("/", (req, res, next) => {
  res.sendFile(publicIndexFile, (error) => {
    if (!error) return;

    console.error("Falha ao servir index.html:", error.message);
    if (!res.headersSent) {
      res.status(error.statusCode || 500).send("index.html não encontrado na pasta public.");
    } else {
      next(error);
    }
  });
});

const apiCache = new Map();
const rateLimitStore = new Map();
const STORE_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

const CURATED_SYMBOLS = [
  { symbol: "AAPL", description: "Apple Inc.", type: "Stock", exchange: "NASDAQ", aliases: ["apple", "iphone"] },
  { symbol: "MSFT", description: "Microsoft Corporation", type: "Stock", exchange: "NASDAQ", aliases: ["microsoft", "windows", "azure"] },
  { symbol: "GOOGL", description: "Alphabet Inc. Class A", type: "Stock", exchange: "NASDAQ", aliases: ["google", "alphabet", "youtube"] },
  { symbol: "GOOG", description: "Alphabet Inc. Class C", type: "Stock", exchange: "NASDAQ", aliases: ["google", "alphabet"] },
  { symbol: "AMZN", description: "Amazon.com, Inc.", type: "Stock", exchange: "NASDAQ", aliases: ["amazon", "aws"] },
  { symbol: "META", description: "Meta Platforms, Inc.", type: "Stock", exchange: "NASDAQ", aliases: ["facebook", "instagram", "meta", "whatsapp"] },
  { symbol: "NVDA", description: "NVIDIA Corporation", type: "Stock", exchange: "NASDAQ", aliases: ["nvidia", "ai", "chip"] },
  { symbol: "TSLA", description: "Tesla, Inc.", type: "Stock", exchange: "NASDAQ", aliases: ["tesla", "elon"] },
  { symbol: "NFLX", description: "Netflix, Inc.", type: "Stock", exchange: "NASDAQ", aliases: ["netflix"] },
  { symbol: "AMD", description: "Advanced Micro Devices, Inc.", type: "Stock", exchange: "NASDAQ", aliases: ["amd", "chip"] },
  { symbol: "INTC", description: "Intel Corporation", type: "Stock", exchange: "NASDAQ", aliases: ["intel"] },
  { symbol: "BABA", description: "Alibaba Group Holding Limited", type: "Stock", exchange: "NYSE", aliases: ["alibaba"] },
  { symbol: "T", description: "AT&T Inc.", type: "Stock", exchange: "NYSE", aliases: ["at&t", "att"] },
  { symbol: "TM", description: "Toyota Motor Corporation", type: "Stock", exchange: "NYSE", aliases: ["toyota"] },
  { symbol: "TSM", description: "Taiwan Semiconductor Manufacturing Company", type: "Stock", exchange: "NYSE", aliases: ["tsmc", "taiwan semiconductor"] },
  { symbol: "TGT", description: "Target Corporation", type: "Stock", exchange: "NYSE", aliases: ["target"] },
  { symbol: "BAC", description: "Bank of America Corporation", type: "Stock", exchange: "NYSE", aliases: ["bank of america"] },
  { symbol: "WMT", description: "Walmart Inc.", type: "Stock", exchange: "NYSE", aliases: ["walmart"] },
  { symbol: "JNJ", description: "Johnson & Johnson", type: "Stock", exchange: "NYSE", aliases: ["johnson and johnson"] },
  { symbol: "XOM", description: "Exxon Mobil Corporation", type: "Stock", exchange: "NYSE", aliases: ["exxon"] },
  { symbol: "PETR4", description: "Petróleo Brasileiro S.A. Petrobras PN", type: "Stock", exchange: "B3", aliases: ["petrobras", "petr4"] },
  { symbol: "PETR3", description: "Petróleo Brasileiro S.A. Petrobras ON", type: "Stock", exchange: "B3", aliases: ["petrobras", "petr3"] },
  { symbol: "VALE3", description: "Vale S.A.", type: "Stock", exchange: "B3", aliases: ["vale"] },
  { symbol: "ITUB4", description: "Itaú Unibanco Holding S.A. PN", type: "Stock", exchange: "B3", aliases: ["itau", "itaú"] },
  { symbol: "BBDC4", description: "Banco Bradesco S.A. PN", type: "Stock", exchange: "B3", aliases: ["bradesco"] },
  { symbol: "BBAS3", description: "Banco do Brasil S.A.", type: "Stock", exchange: "B3", aliases: ["banco do brasil"] },
  { symbol: "ABEV3", description: "Ambev S.A.", type: "Stock", exchange: "B3", aliases: ["ambev"] },
  { symbol: "WEGE3", description: "WEG S.A.", type: "Stock", exchange: "B3", aliases: ["weg"] },
  { symbol: "MGLU3", description: "Magazine Luiza S.A.", type: "Stock", exchange: "B3", aliases: ["magalu", "magazine luiza"] },
  { symbol: "RENT3", description: "Localiza Rent a Car S.A.", type: "Stock", exchange: "B3", aliases: ["localiza"] },
  { symbol: "GGBR4", description: "Gerdau S.A. PN", type: "Stock", exchange: "B3", aliases: ["gerdau"] },
  { symbol: "SUZB3", description: "Suzano S.A.", type: "Stock", exchange: "B3", aliases: ["suzano"] }
];

function debugAuthLog(label, extra = {}) {
  try {
    console.log(`[AUTH DEBUG] ${label}`, extra);
  } catch {}
}

function normalizeSymbol(symbol) {
  let value = String(symbol || "").trim().toUpperCase();
  if (/^[A-Z]{4}\d$/.test(value)) value += ".SA";
  return value;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getUsageKey(userId) {
  return `${userId || "visitor"}_${getTodayKey()}`;
}

function getRequestIp(req) {
  return (
    req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req?.socket?.remoteAddress ||
    req?.ip ||
    "unknown-ip"
  );
}

function getVisitorKey(req) {
  const raw = `${getRequestIp(req)}|${req?.headers?.["user-agent"] || "unknown-ua"}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function getUsageIdentity(req) {
  if (req.user?.id) {
    return { user_id: req.user.id, visitor_key: null };
  }

  return { user_id: null, visitor_key: getVisitorKey(req) };
}

async function getUsageRow(req) {
  try {
    const today = getTodayKey();
    const identity = getUsageIdentity(req);

    let query = supabaseAdmin
      .from("usage_logs")
      .select("*")
      .eq("date", today)
      .limit(1);

    if (identity.user_id) {
      query = query.eq("user_id", identity.user_id);
    } else {
      query = query.eq("visitor_key", identity.visitor_key);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("Erro ao buscar uso diário:", error.message);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error("Erro ao buscar uso diário:", error?.message || error);
    return null;
  }
}

async function getUsageCount(req) {
  const row = await getUsageRow(req);
  return Number(row?.count || 0);
}

async function incrementUsage(req) {
  const today = getTodayKey();
  const identity = getUsageIdentity(req);

  const { data, error } = await supabaseAdmin.rpc("increment_usage_atomic", {
    p_user_id: identity.user_id,
    p_visitor_key: identity.visitor_key,
    p_date: today
  });

  if (error) {
    console.error("Erro ao incrementar uso diário:", error.message);
    return getUsageCount(req);
  }

  return Number(data || 0);
}

async function consumeUsageSlot(req, limit) {
  if (limit === Infinity) {
    return { allowed: true, used: await incrementUsage(req) };
  }

  const today = getTodayKey();
  const identity = getUsageIdentity(req);

  const { data, error } = await supabaseAdmin.rpc("consume_usage_slot", {
    p_user_id: identity.user_id,
    p_visitor_key: identity.visitor_key,
    p_date: today,
    p_limit: Number(limit || 0)
  });

  if (error) {
    console.error("Erro ao consumir slot de uso:", error.message);
    const used = await getUsageCount(req);
    return { allowed: used < limit, used };
  }

  const used = Number(data || 0);
  return {
    allowed: used > 0,
    used
  };
}

function getCheckoutPlanConfig(plan) {
  const normalizedPlan = String(plan || "").trim().toLowerCase();

  const plans = {
    starter: {
      plan: "starter",
      priceId: process.env.STRIPE_PRICE_STARTER || "",
      trialDays: Math.max(0, Number(process.env.STRIPE_TRIAL_DAYS_STARTER || 0))
    },
    pro: {
      plan: "pro",
      priceId: process.env.STRIPE_PRICE_PRO || "",
      trialDays: Math.max(0, Number(process.env.STRIPE_TRIAL_DAYS_PRO || 0))
    }
  };

  const selected = plans[normalizedPlan] || null;
  if (!selected?.priceId) return null;
  return selected;
}

async function upsertSubscriptionByUserId({
  userId,
  plan = "free",
  status = "inactive",
  stripeCustomerId = null,
  stripeSubscriptionId = null,
  currentPeriodEnd = null
}) {
  if (!userId) {
    return { error: new Error("userId é obrigatório para upsertSubscriptionByUserId") };
  }

  const payload = {
    user_id: userId,
    plan,
    status,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    current_period_end: currentPeriodEnd
  };

  const existing = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existing.error) {
    return { error: existing.error };
  }

  if (existing.data?.length) {
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .update(payload)
      .eq("user_id", userId)
      .select()
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return { data, error };
  }

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .insert(payload)
    .select()
    .maybeSingle();

  return { data, error };
}

async function reserveWebhookEvent(event) {
  const { error } = await supabaseAdmin
    .from("stripe_webhook_events")
    .insert({
      event_id: event.id,
      event_type: event.type,
      payload: event
    });

  if (!error) {
    return { inserted: true };
  }

  if (error.code === "23505" || String(error.message || "").toLowerCase().includes("duplicate")) {
    return { inserted: false };
  }

  throw error;
}

async function resetUsageByUserId(userId) {
  const today = getTodayKey();

  const { data, error } = await supabaseAdmin
    .from("usage_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("date", today)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erro ao localizar uso para reset:", error.message);
    return false;
  }

  if (!data?.id) {
    return true;
  }

  const { error: updateError } = await supabaseAdmin
    .from("usage_logs")
    .update({ count: 0 })
    .eq("id", data.id);

  if (updateError) {
    console.error("Erro ao resetar uso:", updateError.message);
    return false;
  }

  return true;
}

async function getUsageMapByUserIds(userIds = []) {
  const today = getTodayKey();
  const validUserIds = Array.from(new Set(userIds.filter(Boolean)));

  if (!validUserIds.length) {
    return new Map();
  }

  const { data, error } = await supabaseAdmin
    .from("usage_logs")
    .select("user_id,count")
    .eq("date", today)
    .in("user_id", validUserIds);

  if (error) {
    console.error("Erro ao buscar mapa de uso:", error.message);
    return new Map();
  }

  const map = new Map();
  (data || []).forEach((item) => {
    if (item.user_id) {
      map.set(item.user_id, Number(item.count || 0));
    }
  });

  return map;
}

function getCacheEntry(key) {
  const cached = apiCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    apiCache.delete(key);
    return null;
  }
  return cached.data;
}

function setCacheEntry(key, data, ttlMs = 60 * 1000) {
  apiCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs
  });
}

function clearApiCache() {
  apiCache.clear();
}

function cleanupExpiredStores() {
  const now = Date.now();

  for (const [key, entry] of apiCache.entries()) {
    if (!entry || now > Number(entry.expiresAt || 0)) {
      apiCache.delete(key);
    }
  }

  for (const [key, entry] of rateLimitStore.entries()) {
    if (!entry || now > Number(entry.resetAt || 0)) {
      rateLimitStore.delete(key);
    }
  }
}

const cleanupTimer = setInterval(cleanupExpiredStores, STORE_CLEANUP_INTERVAL_MS);
if (typeof cleanupTimer.unref === "function") cleanupTimer.unref();

function createRateLimiter({ windowMs = 60 * 1000, max = 30 } = {}) {
  return (req, res, next) => {
    const key = `${req.path}:${getRequestIp(req)}`;
    const now = Date.now();
    const current = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > current.resetAt) {
      current.count = 0;
      current.resetAt = now + windowMs;
    }

    current.count += 1;
    rateLimitStore.set(key, current);

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(max - current.count, 0)));

    if (current.count > max) {
      return res.status(429).json({ error: "Muitas requisições. Tente novamente em instantes." });
    }

    next();
  };
}

function normalizeTimeframe(value) {
  const timeframe = String(value || "5D").trim().toUpperCase();
  return ["1D", "5D", "1M", "3M", "1Y"].includes(timeframe) ? timeframe : "5D";
}

function validateSymbolInput(rawValue) {
  const normalized = normalizeSymbol(rawValue);
  if (!normalized) return null;
  if (!/^[A-Z0-9.-]{1,15}$/.test(normalized)) return null;
  return normalized;
}

async function fetchExternalJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 12000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json,text/plain,*/*",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        ...(options.headers || {})
      },
      signal: controller.signal
    });

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function getQuoteFinnhub(symbol) {
  try {
    const token = process.env.FINNHUB_API_KEY;
    if (!token) return null;

    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${token}`;
    const data = await fetchExternalJson(url, { timeoutMs: 10000 });

    const hasUsableQuote =
      data &&
      typeof data === "object" &&
      [data.c, data.o, data.h, data.l, data.pc].some((value) => value != null && !Number.isNaN(Number(value)));

    if (!hasUsableQuote) {
      return null;
    }

    return {
      c: Number.isFinite(Number(data.c)) ? Number(data.c) : null,
      d: Number.isFinite(Number(data.d)) ? Number(data.d) : null,
      dp: Number.isFinite(Number(data.dp)) ? Number(data.dp) : null,
      h: Number.isFinite(Number(data.h)) ? Number(data.h) : null,
      l: Number.isFinite(Number(data.l)) ? Number(data.l) : null,
      o: Number.isFinite(Number(data.o)) ? Number(data.o) : null,
      pc: Number.isFinite(Number(data.pc)) ? Number(data.pc) : null,
      source: "finnhub"
    };
  } catch (err) {
    console.log("Finnhub falhou:", err.message);
    return null;
  }
}

async function getQuoteTwelve(symbol) {
  try {
    const token = process.env.TWELVE_API_KEY;
    if (!token) return null;

    const url = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${token}`;
    const data = await fetchExternalJson(url, { timeoutMs: 10000 });

    if (!data || data.status === "error") throw new Error(data?.message || "Sem dados");

    const currentPrice = Number(data.close ?? data.price);
    const previousClose = Number(data.previous_close);
    const delta = Number(data.change);
    const deltaPercent = Number(data.percent_change);
    const high = Number(data.high);
    const low = Number(data.low);
    const open = Number(data.open);

    if (![currentPrice, previousClose, high, low, open].some(Number.isFinite)) {
      throw new Error("Sem preço utilizável");
    }

    return {
      c: Number.isFinite(currentPrice) ? currentPrice : null,
      d: Number.isFinite(delta) ? delta : null,
      dp: Number.isFinite(deltaPercent) ? deltaPercent : null,
      h: Number.isFinite(high) ? high : null,
      l: Number.isFinite(low) ? low : null,
      o: Number.isFinite(open) ? open : null,
      pc: Number.isFinite(previousClose) ? previousClose : null,
      source: "twelvedata"
    };
  } catch (err) {
    console.log("TwelveData falhou:", err.message);
    return null;
  }
}

function getCandlesProviderConfig(timeframe) {
  const normalized = normalizeTimeframe(timeframe);

  return {
    "1D": {
      finnhubResolution: "5",
      twelveInterval: "5min",
      outputsize: 120,
      fromSeconds: 2 * 24 * 60 * 60,
      minPoints: 12,
      maxPoints: 390,
      yahooRange: "1d",
      yahooInterval: "5m",
      yahooFallbackIntervals: ["15m", "30m"]
    },
    "5D": {
      finnhubResolution: "30",
      twelveInterval: "30min",
      outputsize: 200,
      fromSeconds: 7 * 24 * 60 * 60,
      minPoints: 10,
      maxPoints: 240,
      yahooRange: "5d",
      yahooInterval: "30m",
      yahooFallbackIntervals: ["60m", "1d"]
    },
    "1M": {
      finnhubResolution: "60",
      twelveInterval: "1h",
      outputsize: 260,
      fromSeconds: 35 * 24 * 60 * 60,
      minPoints: 10,
      maxPoints: 260,
      yahooRange: "1mo",
      yahooInterval: "60m",
      yahooFallbackIntervals: ["1d"]
    },
    "3M": {
      finnhubResolution: "D",
      twelveInterval: "1day",
      outputsize: 130,
      fromSeconds: 100 * 24 * 60 * 60,
      minPoints: 10,
      maxPoints: 130,
      yahooRange: "3mo",
      yahooInterval: "1d",
      yahooFallbackIntervals: ["1wk"]
    },
    "1Y": {
      finnhubResolution: "D",
      twelveInterval: "1day",
      outputsize: 260,
      fromSeconds: 370 * 24 * 60 * 60,
      minPoints: 10,
      maxPoints: 260,
      yahooRange: "1y",
      yahooInterval: "1d",
      yahooFallbackIntervals: ["1wk"]
    }
  }[normalized];
}

function normalizeCandlesPayload(payload, maxPoints = null) {
  const rows = [];
  const seen = new Set();

  for (let i = 0; i < payload.c.length; i += 1) {
    const time = Number(payload.t[i]);
    const open = Number(payload.o[i]);
    const high = Number(payload.h[i]);
    const low = Number(payload.l[i]);
    const close = Number(payload.c[i]);
    const volume = Number(payload.v?.[i]);

    if (![time, open, high, low, close].every(Number.isFinite)) continue;
    if (seen.has(time)) continue;

    seen.add(time);
    rows.push({
      time,
      open,
      high,
      low,
      close,
      volume: Number.isFinite(volume) ? volume : 0
    });
  }

  rows.sort((a, b) => a.time - b.time);

  const trimmed = Number.isFinite(maxPoints) && maxPoints > 0 && rows.length > maxPoints
    ? rows.slice(rows.length - maxPoints)
    : rows;

  return {
    t: trimmed.map((row) => row.time),
    o: trimmed.map((row) => row.open),
    h: trimmed.map((row) => row.high),
    l: trimmed.map((row) => row.low),
    c: trimmed.map((row) => row.close),
    v: trimmed.map((row) => row.volume)
  };
}

async function getCandlesFinnhub(symbol, timeframe) {
  try {
    const token = process.env.FINNHUB_API_KEY;
    if (!token) return null;

    const config = getCandlesProviderConfig(timeframe);
    const now = Math.floor(Date.now() / 1000);
    const from = now - config.fromSeconds;

    const url =
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}` +
      `&resolution=${config.finnhubResolution}&from=${from}&to=${now}&token=${token}`;

    const data = await fetchExternalJson(url, { timeoutMs: 12000 });

    if (!data || data.s !== "ok" || !Array.isArray(data.c) || data.c.length < config.minPoints) {
      return null;
    }

    const normalized = normalizeCandlesPayload({
      t: data.t || [],
      o: data.o || [],
      h: data.h || [],
      l: data.l || [],
      c: data.c || [],
      v: data.v || []
    }, config.maxPoints);

    if (normalized.c.length < config.minPoints) {
      return null;
    }

    return {
      s: "ok",
      t: normalized.t,
      o: normalized.o,
      h: normalized.h,
      l: normalized.l,
      c: normalized.c,
      v: normalized.v || [],
      timeframe: normalizeTimeframe(timeframe),
      interval: config.finnhubResolution,
      source: "finnhub",
      points: normalized.c.length
    };
  } catch (err) {
    console.log("Finnhub candles falhou:", err.message);
    return null;
  }
}

async function getCandlesTwelve(symbol, timeframe) {
  try {
    const token = process.env.TWELVE_API_KEY;
    if (!token) return null;

    const config = getCandlesProviderConfig(timeframe);
    const url =
      `https://api.twelvedata.com/time_series?symbol=${symbol}` +
      `&interval=${config.twelveInterval}&outputsize=${config.outputsize}&apikey=${token}`;

    const data = await fetchExternalJson(url, { timeoutMs: 12000 });
    const values = Array.isArray(data?.values) ? data.values : [];

    if (!values.length) {
      return null;
    }

    const payload = { t: [], o: [], h: [], l: [], c: [], v: [] };

    for (const item of values.slice().reverse()) {
      const epochMs = Date.parse(item.datetime);
      const time = Number.isFinite(epochMs) ? Math.floor(epochMs / 1000) : NaN;
      const open = Number(item.open);
      const high = Number(item.high);
      const low = Number(item.low);
      const close = Number(item.close);
      const volume = Number(item.volume);

      if (![time, open, high, low, close].every(Number.isFinite)) continue;

      payload.t.push(time);
      payload.o.push(open);
      payload.h.push(high);
      payload.l.push(low);
      payload.c.push(close);
      payload.v.push(Number.isFinite(volume) ? volume : 0);
    }

    const normalized = normalizeCandlesPayload(payload, config.maxPoints);
    if (normalized.c.length < config.minPoints) {
      return null;
    }

    return {
      s: "ok",
      t: normalized.t,
      o: normalized.o,
      h: normalized.h,
      l: normalized.l,
      c: normalized.c,
      v: normalized.v || [],
      timeframe: normalizeTimeframe(timeframe),
      interval: config.twelveInterval,
      source: "twelvedata",
      points: normalized.c.length
    };
  } catch (err) {
    console.log("TwelveData candles falhou:", err.message);
    return null;
  }
}

function getAdminEmails() {
  return String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isEmailAdmin(email) {
  if (!email) return false;
  return getAdminEmails().includes(String(email).trim().toLowerCase());
}

function isAdminTester(user) {
  return !!user && isEmailAdmin(user.email);
}

async function getUserFromToken(req, options = {}) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    if (!options.silentMissing) {
      debugAuthLog("TOKEN_MISSING", {
        path: req.path,
        hasAuthorizationHeader: !!authHeader
      });
    }
    return null;
  }

  const {
    data: { user },
    error
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    debugAuthLog("TOKEN_INVALID", {
      path: req.path,
      error: error?.message || "Usuário não encontrado"
    });
    return null;
  }

  debugAuthLog("TOKEN_OK", {
    path: req.path,
    userId: user.id,
    email: user.email || ""
  });

  return user;
}

async function getUserSubscription(userId) {
  if (!userId) {
    return { plan: "free", status: "inactive" };
  }

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { plan: "free", status: "inactive" };
  }

  return data;
}

function getEffectivePlan(user, subscription) {
  if (isAdminTester(user)) {
    return { plan: "pro", status: "active", adminTester: true };
  }

  return {
    plan: subscription?.plan || "free",
    status: subscription?.status || "inactive",
    adminTester: false
  };
}

function getDailyLimitByPlan(user, subscription) {
  if (isAdminTester(user)) return Infinity;
  if (!user) return 3;
  if (subscription?.plan === "pro" && subscription?.status === "active") return Infinity;
  if (subscription?.plan === "starter" && subscription?.status === "active") return 40;
  return 10;
}

async function requireUser(req, res, next) {
  const user = await getUserFromToken(req);
  if (!user) {
    debugAuthLog("REQUIRE_USER_FAILED", { path: req.path });
    return res.status(401).json({ error: "Usuário não autenticado." });
  }

  req.user = user;
  req.subscription = await getUserSubscription(user.id);
  req.effectivePlan = getEffectivePlan(user, req.subscription);
  next();
}

async function getOptionalUser(req, _res, next) {
  req.user = await getUserFromToken(req, { silentMissing: true });
  req.subscription = await getUserSubscription(req.user?.id);
  req.effectivePlan = getEffectivePlan(req.user, req.subscription);
  next();
}

async function requireAdmin(req, res, next) {
  const user = await getUserFromToken(req);
  if (!user) {
    debugAuthLog("REQUIRE_ADMIN_FAILED_NO_USER", { path: req.path });
    return res.status(401).json({ error: "Usuário não autenticado." });
  }

  if (!isEmailAdmin(user.email)) {
    debugAuthLog("REQUIRE_ADMIN_FAILED_NOT_ADMIN", {
      path: req.path,
      email: user.email || "",
      adminEmails: getAdminEmails()
    });
    return res.status(403).json({ error: "Acesso restrito ao administrador." });
  }

  req.user = user;
  req.subscription = await getUserSubscription(user.id);
  req.effectivePlan = getEffectivePlan(user, req.subscription);
  req.isAdmin = true;
  next();
}

async function enforceDailyLimit(req, res, next) {
  try {
    const used = await getUsageCount(req);
    const limit = getDailyLimitByPlan(req.user, req.subscription);

    if (limit !== Infinity && used >= limit) {
      return res.status(403).json({ error: "LIMIT_REACHED" });
    }

    next();
  } catch (error) {
    console.error("Falha ao validar limite diário:", error?.message || error);
    next();
  }
}

async function upsertPresence(user) {
  if (!user?.id) return;

  await supabaseAdmin
    .from("user_presence")
    .upsert(
      {
        user_id: user.id,
        email: user.email || "",
        last_seen: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );
}

async function trackEvent({
  req = null,
  user = null,
  eventType = "",
  eventData = {},
  targetUserId = null
}) {
  try {
    const payload = {
      user_id: user?.id || null,
      user_email: user?.email || null,
      target_user_id: targetUserId || null,
      event_type: eventType,
      event_data: eventData || {},
      created_at: new Date().toISOString(),
      ip_address: req?.headers?.["x-forwarded-for"] || req?.socket?.remoteAddress || null,
      user_agent: req?.headers?.["user-agent"] || null
    };

    await supabaseAdmin.from("events").insert(payload);
  } catch (error) {
    console.error("Falha ao registrar evento:", error.message);
  }
}

app.get("/api/health", (req, res) => {
  const missingEnv = getMissingEnvVars();
  res.json({
    ok: true,
    appUrl: APP_URL,
    cacheEntries: apiCache.size,
    rateLimitEntries: rateLimitStore.size,
    requestId: req.requestId,
    uptime: Math.round(process.uptime()),
    ready: !isShuttingDown,
    missingEnv,
    now: new Date().toISOString()
  });
});

app.get("/api/public-config", (req, res) => {
  res.json({
    appUrl: APP_URL,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    prices: {
      starter: process.env.STRIPE_PRICE_STARTER || "",
      pro: process.env.STRIPE_PRICE_PRO || ""
    }
  });
});

app.get("/api/me/usage", getOptionalUser, async (req, res) => {
  try {
    if (req.user) {
      await upsertPresence(req.user);
    }

    const used = await getUsageCount(req);
    const limit = getDailyLimitByPlan(req.user, req.subscription);
    const remaining = limit === Infinity ? "∞" : Math.max(limit - used, 0);

    res.json({
      used,
      limit,
      remaining,
      plan: req.effectivePlan.plan,
      status: req.effectivePlan.status,
      isAdmin: req.user ? isEmailAdmin(req.user.email) : false,
      adminTester: req.effectivePlan.adminTester
    });
  } catch (error) {
    console.error("Falha em /api/me/usage:", error?.message || error);
    const limit = getDailyLimitByPlan(req.user, req.subscription);
    res.json({
      used: 0,
      limit,
      remaining: limit === Infinity ? "∞" : limit,
      plan: req.effectivePlan?.plan || "free",
      status: req.effectivePlan?.status || "inactive",
      isAdmin: req.user ? isEmailAdmin(req.user.email) : false,
      adminTester: req.effectivePlan?.adminTester || false,
      fallback: true
    });
  }
});

app.post("/api/me/presence", requireUser, async (req, res) => {
  await upsertPresence(req.user);
  res.json({ ok: true });
});

app.post("/api/events", createRateLimiter({ windowMs: 60 * 1000, max: 25 }), getOptionalUser, async (req, res) => {
  const { eventType, eventData, targetUserId } = req.body || {};

  if (!eventType) {
    return res.status(400).json({ error: "eventType é obrigatório." });
  }

  if (req.user) {
    await upsertPresence(req.user);
  }

  await trackEvent({
    req,
    user: req.user,
    eventType,
    eventData,
    targetUserId
  });

  res.json({ ok: true });
});

app.get("/api/quote/:symbol", createRateLimiter({ windowMs: 60 * 1000, max: 80 }), getOptionalUser, async (req, res) => {
  try {
    if (req.user) {
      await upsertPresence(req.user);
    }

    const limit = getDailyLimitByPlan(req.user, req.subscription);
    const usageAttempt = await consumeUsageSlot(req, limit);

    if (!usageAttempt.allowed) {
      await trackEvent({
        req,
        user: req.user,
        eventType: "daily_limit_reached",
        eventData: { limit }
      });

      return res.status(403).json({ error: "LIMIT_REACHED" });
    }

    const symbol = validateSymbolInput(req.params.symbol);
    if (!symbol) {
      return res.status(400).json({ error: "Ticker inválido." });
    }

    const cacheKey = `quote:${symbol}`;
    const cached = getCacheEntry(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    function safeNumber(value) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    function buildQuotePayload(payload = {}) {
      return {
        c: safeNumber(payload.c),
        d: safeNumber(payload.d),
        dp: safeNumber(payload.dp),
        h: safeNumber(payload.h),
        l: safeNumber(payload.l),
        o: safeNumber(payload.o),
        pc: safeNumber(payload.pc),
        source: payload.source || "unknown"
      };
    }

    function hasUsableQuote(quote) {
      return !!quote && [quote.c, quote.o, quote.h, quote.l, quote.pc].some((value) => Number.isFinite(Number(value)));
    }

    function extractYahooQuoteFromChart(result) {
      const meta = result?.meta || {};
      const quote = result?.indicators?.quote?.[0] || {};
      const closes = Array.isArray(quote.close) ? quote.close : [];
      const opens = Array.isArray(quote.open) ? quote.open : [];
      const highs = Array.isArray(quote.high) ? quote.high : [];
      const lows = Array.isArray(quote.low) ? quote.low : [];

      let lastClose = null;
      let lastOpen = null;
      let lastHigh = null;
      let lastLow = null;
      let previousCloseFromSeries = null;

      for (let i = closes.length - 1; i >= 0; i -= 1) {
        const close = safeNumber(closes[i]);
        if (close == null) continue;

        if (lastClose == null) {
          lastClose = close;
          lastOpen = safeNumber(opens[i]) ?? close;
          lastHigh = safeNumber(highs[i]) ?? Math.max(lastOpen, close);
          lastLow = safeNumber(lows[i]) ?? Math.min(lastOpen, close);
          continue;
        }

        previousCloseFromSeries = close;
        break;
      }

      const currentPrice =
        safeNumber(meta.regularMarketPrice) ??
        safeNumber(meta.postMarketPrice) ??
        safeNumber(meta.preMarketPrice) ??
        lastClose;

      const previousClose =
        safeNumber(meta.chartPreviousClose) ??
        safeNumber(meta.previousClose) ??
        previousCloseFromSeries;

      const openPrice = safeNumber(meta.regularMarketOpen) ?? lastOpen;
      const highPrice = safeNumber(meta.regularMarketDayHigh) ?? lastHigh;
      const lowPrice = safeNumber(meta.regularMarketDayLow) ?? lastLow;

      const delta =
        currentPrice != null && previousClose != null
          ? Number((currentPrice - previousClose).toFixed(2))
          : null;

      const deltaPercent =
        currentPrice != null && previousClose != null && previousClose !== 0
          ? Number((((currentPrice - previousClose) / previousClose) * 100).toFixed(2))
          : null;

      const payload = buildQuotePayload({
        c: currentPrice,
        d: delta,
        dp: deltaPercent,
        h: highPrice,
        l: lowPrice,
        o: openPrice,
        pc: previousClose,
        source: "yahoo"
      });

      return hasUsableQuote(payload) ? payload : null;
    }

    async function fetchYahooChartQuote() {
      const intervalsToTry = ["1m", "2m", "5m", "15m"];

      for (const interval of intervalsToTry) {
        try {
          const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=1d&includePrePost=false&events=div,splits`;
          const yahooData = await fetchExternalJson(yahooUrl, { timeoutMs: 12000 });
          const result = yahooData?.chart?.result?.[0];
          const payload = extractYahooQuoteFromChart(result);
          if (payload) {
            payload.interval = interval;
            return payload;
          }
        } catch (error) {
          console.log(`Yahoo quote falhou para ${symbol} em ${interval}:`, error.message);
        }
      }

      return null;
    }

    let data = null;

    const finnhubQuote = await getQuoteFinnhub(symbol);
    if (finnhubQuote) {
      data = buildQuotePayload(finnhubQuote);
    }

    if (!data) {
      const twelveQuote = await getQuoteTwelve(symbol);
      if (twelveQuote) {
        data = buildQuotePayload(twelveQuote);
      }
    }

    if (!data) {
      data = await fetchYahooChartQuote();
    }

    if (!data) {
      data = {
        c: null,
        d: null,
        dp: null,
        h: null,
        l: null,
        o: null,
        pc: null,
        error: "QUOTE_UNAVAILABLE",
        source: "none"
      };
    }

    await trackEvent({
      req,
      user: req.user,
      eventType: "analyze_quote",
      eventData: { symbol, source: data.source || "unknown" }
    });

    console.log("====================================");
    console.log("📊 ANALISE REALTIME");
    console.log("Ativo:", symbol);
    console.log("Fonte usada:", data?.source);
    console.log("Preço:", data?.c);
    console.log("====================================");

    const cacheTtlMs = data?.source === "yahoo" ? 15 * 1000 : 30 * 1000;
    setCacheEntry(cacheKey, data, cacheTtlMs);
    return res.json(data);
  } catch (error) {
    console.error("Erro geral quote:", error.message);

    return res.json({
      c: null,
      d: null,
      dp: null,
      h: null,
      l: null,
      o: null,
      pc: null,
      error: "QUOTE_UNAVAILABLE",
      source: "route_fail"
    });
  }
});

app.get("/api/symbol-search", createRateLimiter({ windowMs: 60 * 1000, max: 60 }), async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    if (!query) {
      return res.json([]);
    }

    const cacheKey = `symbol-search:${query.toLowerCase()}`;
    const cached = getCacheEntry(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const token = process.env.FINNHUB_API_KEY;
    let items = [];

    if (token) {
      try {
        const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${token}`;
        const data = await fetchExternalJson(url, { timeoutMs: 10000 });
        items = Array.isArray(data?.result) ? data.result : [];
      } catch (error) {
        console.log("Finnhub symbol search falhou:", error.message);
      }
    }

    const normalizedItems = items
      .map((item) => ({
        symbol: item?.displaySymbol || item?.symbol || "",
        displaySymbol: item?.displaySymbol || item?.symbol || "",
        description: String(item?.description || item?.symbol || "").trim(),
        type: String(item?.type || "Stock").trim(),
        exchange: String(item?.exchange || item?.mic || item?.market || "").trim()
      }))
      .filter((item) => String(item.symbol || "").trim())
      .filter((item) => /^[A-Z]{1,6}\d?(\.SA)?$/i.test(String(item.symbol || "").trim()));

    const payload = rankSuggestions([...normalizedItems, ...CURATED_SYMBOLS], query);
    const finalPayload = payload.length ? payload : buildFallbackSuggestions(query);
    setCacheEntry(cacheKey, finalPayload, 10 * 60 * 1000);
    return res.json(finalPayload);

  } catch (error) {
    console.error("Erro ao buscar sugestões:", error.message);
    return res.json(buildFallbackSuggestions(req.query.q || ""));
  }
});


app.get("/api/profile/:symbol", async (req, res) => {
  try {
    const symbol = validateSymbolInput(req.params.symbol);
    if (!symbol) {
      return res.status(400).json({ error: "Ticker inválido." });
    }
    const cacheKey = `profile:${symbol}`;
    const cached = getCacheEntry(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const token = process.env.FINNHUB_API_KEY;
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${token}`;
    const data = await fetchExternalJson(url, { timeoutMs: 10000 });

    const safeData =
      data && typeof data === "object" && Object.keys(data).length
        ? data
        : { ticker: symbol, name: symbol.replace(".SA", ""), exchange: "Exchange" };

    setCacheEntry(cacheKey, safeData, 6 * 60 * 60 * 1000);
    res.json(safeData);
  } catch (error) {
    console.error("Erro ao buscar perfil:", error.message);

    const symbol = validateSymbolInput(req.params.symbol);
    if (!symbol) {
      return res.status(400).json({ error: "Ticker inválido." });
    }
    return res.json({
      ticker: symbol,
      name: symbol.replace(".SA", ""),
      exchange: "Exchange",
      error: "PROFILE_UNAVAILABLE"
    });
  }
});

app.get("/api/candles/:symbol", async (req, res) => {
  try {
    const symbol = validateSymbolInput(req.params.symbol);
    if (!symbol) {
      return res.status(400).json({ error: "Ticker inválido." });
    }
    const timeframe = normalizeTimeframe(req.query.timeframe);

    const cacheKey = `candles:${symbol}:${timeframe}`;
    const cached = getCacheEntry(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const selected = getCandlesProviderConfig(timeframe);
    const intervalsToTry = Array.from(
      new Set([selected.yahooInterval, ...(Array.isArray(selected.yahooFallbackIntervals) ? selected.yahooFallbackIntervals : [])].filter(Boolean))
    );

    function extractYahooCandles(result) {
      const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
      const quote = result?.indicators?.quote?.[0] || {};

      const opens = Array.isArray(quote.open) ? quote.open : [];
      const highs = Array.isArray(quote.high) ? quote.high : [];
      const lows = Array.isArray(quote.low) ? quote.low : [];
      const closes = Array.isArray(quote.close) ? quote.close : [];
      const volumes = Array.isArray(quote.volume) ? quote.volume : [];

      const payload = { t: [], o: [], h: [], l: [], c: [], v: [] };

      for (let i = 0; i < timestamps.length; i += 1) {
        const time = Number(timestamps[i]);
        const open = Number(opens[i]);
        const high = Number(highs[i]);
        const low = Number(lows[i]);
        const close = Number(closes[i]);

        if (![time, close].every(Number.isFinite)) {
          continue;
        }

        const safeOpen = Number.isFinite(open) ? open : close;
        const safeHigh = Number.isFinite(high) ? high : Math.max(safeOpen, close);
        const safeLow = Number.isFinite(low) ? low : Math.min(safeOpen, close);

        payload.t.push(time);
        payload.o.push(safeOpen);
        payload.h.push(safeHigh);
        payload.l.push(safeLow);
        payload.c.push(close);
        payload.v.push(Number.isFinite(Number(volumes[i])) ? Number(volumes[i]) : 0);
      }

      return normalizeCandlesPayload(payload, selected.maxPoints);
    }

    async function fetchYahooCandles() {
      let candlesPayload = null;
      let intervalUsed = selected.yahooInterval;
      let source = "yahoo-range";

      for (const interval of intervalsToTry) {
        const rangeUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${selected.yahooRange}&interval=${interval}&includePrePost=false&events=div,splits`;
        try {
          const data = await fetchExternalJson(rangeUrl, { timeoutMs: 12000 });
          const result = data?.chart?.result?.[0];
          const extracted = extractYahooCandles(result);

          if (extracted.c.length >= selected.minPoints) {
            candlesPayload = extracted;
            intervalUsed = interval;
            source = "yahoo-range";
            break;
          }
        } catch (err) {
          console.log(`Yahoo range candles falhou para ${symbol} em ${interval}:`, err.message);
        }
      }

      if (!candlesPayload || candlesPayload.c.length < 2) {
        const now = Math.floor(Date.now() / 1000);
        const from = now - selected.fromSeconds;

        for (const interval of intervalsToTry) {
          const periodUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${from}&period2=${now + 86400}&interval=${interval}&includePrePost=false`;
          try {
            const data = await fetchExternalJson(periodUrl, { timeoutMs: 12000 });
            const result = data?.chart?.result?.[0];
            const extracted = extractYahooCandles(result);

            if (extracted.c.length >= selected.minPoints) {
              candlesPayload = extracted;
              intervalUsed = interval;
              source = "yahoo-period";
              break;
            }
          } catch (err) {
            console.log(`Yahoo period candles falhou para ${symbol} em ${interval}:`, err.message);
          }
        }
      }

      if (!candlesPayload || candlesPayload.c.length < 2) {
        return null;
      }

      return {
        s: "ok",
        t: candlesPayload.t,
        o: candlesPayload.o,
        h: candlesPayload.h,
        l: candlesPayload.l,
        c: candlesPayload.c,
        v: candlesPayload.v || [],
        timeframe,
        interval: intervalUsed,
        source,
        points: candlesPayload.c.length
      };
    }

    let payload = await getCandlesFinnhub(symbol, timeframe);

    if (!payload) {
      payload = await getCandlesTwelve(symbol, timeframe);
    }

    if (!payload) {
      payload = await fetchYahooCandles();
    }

    if (!payload) {
      payload = {
        s: "no_data",
        t: [],
        o: [],
        h: [],
        l: [],
        c: [],
        v: [],
        timeframe,
        interval: selected.yahooInterval,
        source: "unavailable",
        points: 0
      };
      setCacheEntry(cacheKey, payload, 30 * 1000);
      return res.json(payload);
    }

    const ttl = payload?.source?.startsWith("yahoo") ? 60 * 1000 : 2 * 60 * 1000;
    setCacheEntry(cacheKey, payload, ttl);
    res.json(payload);
  } catch (error) {
    console.error("Erro candles timeframe:", error.message);
    res.json({ s: "no_data", t: [], o: [], h: [], l: [], c: [], v: [], source: "error" });
  }
});

app.get("/api/news/:symbol", async (req, res) => {
  try {
    const symbol = normalizeSymbol(req.params.symbol);
    const cacheKey = `news:${symbol}`;
    const cached = getCacheEntry(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const token = process.env.FINNHUB_API_KEY;
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 7);

    const formatDate = (date) => date.toISOString().split("T")[0];

    const url =
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}` +
      `&from=${formatDate(from)}&to=${formatDate(today)}&token=${token}`;

    const data = await fetchExternalJson(url, { timeoutMs: 10000 });
    const safeNews = Array.isArray(data) ? data.slice(0, 6) : [];

    setCacheEntry(cacheKey, safeNews, 10 * 60 * 1000);
    res.json(safeNews);
  } catch (error) {
    console.error("Erro ao buscar notícias:", error.message);
    res.json([]);
  }
});

app.get("/api/me/subscription", requireUser, async (req, res) => {
  await upsertPresence(req.user);

  res.json({
    ...req.subscription,
    plan: req.effectivePlan.plan,
    status: req.effectivePlan.status,
    adminTester: req.effectivePlan.adminTester
  });
});

app.get("/api/me/favorites", requireUser, async (req, res) => {
  await upsertPresence(req.user);

  const { data, error } = await supabaseAdmin
    .from("favorites")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Erro ao buscar favoritos." });
  }

  res.json(data || []);
});

app.post("/api/me/favorites", requireUser, async (req, res) => {
  await upsertPresence(req.user);

  const symbol = normalizeSymbol(req.body.symbol);

  const { error } = await supabaseAdmin
    .from("favorites")
    .upsert(
      { user_id: req.user.id, symbol },
      { onConflict: "user_id,symbol" }
    );

  if (error) {
    return res.status(500).json({ error: "Erro ao salvar favorito." });
  }

  await trackEvent({
    req,
    user: req.user,
    eventType: "favorite_added",
    eventData: { symbol }
  });

  res.json({ ok: true });
});

app.delete("/api/me/favorites/:symbol", requireUser, async (req, res) => {
  await upsertPresence(req.user);

  const symbol = normalizeSymbol(req.params.symbol);

  const { error } = await supabaseAdmin
    .from("favorites")
    .delete()
    .eq("user_id", req.user.id)
    .eq("symbol", symbol);

  if (error) {
    return res.status(500).json({ error: "Erro ao remover favorito." });
  }

  await trackEvent({
    req,
    user: req.user,
    eventType: "favorite_removed",
    eventData: { symbol }
  });

  res.json({ ok: true });
});

app.get("/api/me/portfolio", requireUser, async (req, res) => {
  await upsertPresence(req.user);

  const { data, error } = await supabaseAdmin
    .from("portfolios")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Erro ao buscar carteira." });
  }

  res.json(data || []);
});

app.post("/api/me/portfolio", requireUser, async (req, res) => {
  await upsertPresence(req.user);

  const symbol = normalizeSymbol(req.body.symbol);
  const quantity = Number(req.body.quantity || 0);
  const avg_price = Number(req.body.avg_price || 0);

  const canUsePortfolio =
    req.effectivePlan.plan === "pro" &&
    req.effectivePlan.status === "active";

  if (!canUsePortfolio) {
    await trackEvent({
      req,
      user: req.user,
      eventType: "portfolio_blocked",
      eventData: { symbol, quantity, avg_price }
    });

    return res.status(403).json({ error: "Carteira disponível apenas para plano Pro." });
  }

  const { error } = await supabaseAdmin
    .from("portfolios")
    .upsert(
      {
        user_id: req.user.id,
        symbol,
        quantity,
        avg_price
      },
      { onConflict: "user_id,symbol" }
    );

  if (error) {
    return res.status(500).json({ error: "Erro ao salvar carteira." });
  }

  await trackEvent({
    req,
    user: req.user,
    eventType: "portfolio_saved",
    eventData: { symbol, quantity, avg_price }
  });

  res.json({ ok: true });
});

app.delete("/api/me/portfolio/:symbol", requireUser, async (req, res) => {
  await upsertPresence(req.user);

  const symbol = normalizeSymbol(req.params.symbol);

  const { error } = await supabaseAdmin
    .from("portfolios")
    .delete()
    .eq("user_id", req.user.id)
    .eq("symbol", symbol);

  if (error) {
    return res.status(500).json({ error: "Erro ao remover ativo da carteira." });
  }

  await trackEvent({
    req,
    user: req.user,
    eventType: "portfolio_removed",
    eventData: { symbol }
  });

  res.json({ ok: true });
});

app.post("/api/create-checkout-session", createRateLimiter({ windowMs: 60 * 1000, max: 8 }), requireUser, async (req, res) => {
  try {
    await upsertPresence(req.user);

    const checkoutPlan = getCheckoutPlanConfig(req.body?.plan);

    if (!checkoutPlan) {
      return res.status(400).json({ error: "Plano inválido ou preço não configurado." });
    }

    await trackEvent({
      req,
      user: req.user,
      eventType: "checkout_started",
      eventData: { plan: checkoutPlan.plan }
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: checkoutPlan.priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${APP_URL}/?checkout=success&plan=${checkoutPlan.plan}`,
      cancel_url: `${APP_URL}/?checkout=cancel&plan=${checkoutPlan.plan}`,
      customer_email: req.user.email,
      metadata: {
        user_id: req.user.id,
        plan: checkoutPlan.plan
      },
      subscription_data: checkoutPlan.trialDays > 0
        ? {
            trial_period_days: checkoutPlan.trialDays,
            metadata: {
              user_id: req.user.id,
              plan: checkoutPlan.plan
            }
          }
        : {
            metadata: {
              user_id: req.user.id,
              plan: checkoutPlan.plan
            }
          }
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({
      error: "Erro ao criar checkout.",
      details: error.message
    });
  }
});

app.get("/api/admin/me", requireAdmin, async (req, res) => {
  await upsertPresence(req.user);

  res.json({
    ok: true,
    isAdmin: true,
    adminTester: true,
    email: req.user.email,
    plan: req.effectivePlan.plan,
    status: req.effectivePlan.status
  });
});

app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
  await upsertPresence(req.user);

  const now = new Date();
  const onlineThreshold = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    usersResult,
    subsResult,
    presenceResult,
    favoritesResult,
    portfoliosResult,
    eventsResult
  ] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers(),
    supabaseAdmin
      .from("subscriptions")
      .select("user_id,plan,status,created_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("user_presence")
      .select("*")
      .gte("last_seen", onlineThreshold)
      .order("last_seen", { ascending: false }),
    supabaseAdmin.from("favorites").select("user_id", { count: "exact", head: true }),
    supabaseAdmin.from("portfolios").select("user_id", { count: "exact", head: true }),
    supabaseAdmin
      .from("events")
      .select("event_type,created_at")
      .gte("created_at", startOfDay.toISOString())
  ]);

  const users = usersResult?.data?.users || [];
  const subs = subsResult?.data || [];
  const onlineUsers = presenceResult?.data || [];
  const events = eventsResult?.data || [];

  const latestSubByUser = new Map();
  for (const sub of subs) {
    if (!latestSubByUser.has(sub.user_id)) {
      latestSubByUser.set(sub.user_id, sub);
    }
  }

  let freeUsers = 0;
  let starterUsers = 0;
  let proUsers = 0;
  let activePaidUsers = 0;

  users.forEach((user) => {
    if (isAdminTester(user)) {
      proUsers++;
      activePaidUsers++;
      return;
    }

    const sub = latestSubByUser.get(user.id);
    if (!sub || sub.status !== "active") {
      freeUsers++;
      return;
    }

    if (sub.plan === "starter") {
      starterUsers++;
      activePaidUsers++;
      return;
    }

    if (sub.plan === "pro") {
      proUsers++;
      activePaidUsers++;
      return;
    }

    freeUsers++;
  });

  const eventCounts = {
    dailyLimitReached: 0,
    blockedPortfolio: 0,
    checkoutStarted: 0,
    quotesAnalyzed: 0
  };

  events.forEach((event) => {
    if (event.event_type === "daily_limit_reached") eventCounts.dailyLimitReached++;
    if (event.event_type === "portfolio_blocked") eventCounts.blockedPortfolio++;
    if (event.event_type === "checkout_started") eventCounts.checkoutStarted++;
    if (event.event_type === "analyze_quote") eventCounts.quotesAnalyzed++;
  });

  res.json({
    totals: {
      users: users.length,
      freeUsers,
      starterUsers,
      proUsers,
      paidUsers: activePaidUsers,
      onlineNow: onlineUsers.length,
      totalFavorites: favoritesResult.count || 0,
      totalPortfolioAssets: portfoliosResult.count || 0,
      dailyLimitReachedToday: eventCounts.dailyLimitReached,
      blockedPortfolioToday: eventCounts.blockedPortfolio,
      checkoutStartedToday: eventCounts.checkoutStarted,
      quotesAnalyzedToday: eventCounts.quotesAnalyzed
    },
    onlineUsers: onlineUsers.map((item) => ({
      user_id: item.user_id,
      email: item.email,
      last_seen: item.last_seen
    }))
  });
});

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  await upsertPresence(req.user);

  const now = new Date();
  const onlineThreshold = new Date(now.getTime() - 2 * 60 * 1000).toISOString();

  const [
    usersResult,
    subsResult,
    presenceResult,
    favoritesResult,
    portfoliosResult
  ] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers(),
    supabaseAdmin
      .from("subscriptions")
      .select("user_id,plan,status,created_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("user_presence")
      .select("user_id,last_seen")
      .gte("last_seen", onlineThreshold),
    supabaseAdmin.from("favorites").select("user_id"),
    supabaseAdmin.from("portfolios").select("user_id")
  ]);

  const users = usersResult?.data?.users || [];
  const subs = subsResult?.data || [];
  const presence = presenceResult?.data || [];
  const favorites = favoritesResult?.data || [];
  const portfolios = portfoliosResult?.data || [];

  const latestSubByUser = new Map();
  for (const sub of subs) {
    if (!latestSubByUser.has(sub.user_id)) {
      latestSubByUser.set(sub.user_id, sub);
    }
  }

  const onlineByUser = new Map();
  presence.forEach((item) => {
    onlineByUser.set(item.user_id, item.last_seen);
  });

  const favoritesCountByUser = {};
  favorites.forEach((item) => {
    favoritesCountByUser[item.user_id] = (favoritesCountByUser[item.user_id] || 0) + 1;
  });

  const portfolioCountByUser = {};
  portfolios.forEach((item) => {
    portfolioCountByUser[item.user_id] = (portfolioCountByUser[item.user_id] || 0) + 1;
  });

  const usageMap = await getUsageMapByUserIds(users.map((user) => user.id));

  const rows = users.map((user) => {
    const sub = latestSubByUser.get(user.id);
    const effective = getEffectivePlan(user, sub);
    const usedToday = Number(usageMap.get(user.id) || 0);

    return {
      user_id: user.id,
      email: user.email || "",
      created_at: user.created_at || null,
      plan: effective.plan,
      status: effective.status,
      admin_tester: effective.adminTester,
      is_online: onlineByUser.has(user.id),
      last_seen: onlineByUser.get(user.id) || null,
      used_today: usedToday,
      favorites_count: favoritesCountByUser[user.id] || 0,
      portfolio_assets_count: portfolioCountByUser[user.id] || 0
    };
  });

  rows.sort((a, b) => {
    if (a.is_online && !b.is_online) return -1;
    if (!a.is_online && b.is_online) return 1;
    return String(a.email).localeCompare(String(b.email));
  });

  res.json(rows);
});

app.post("/api/admin/users/:userId/plan", requireAdmin, async (req, res) => {
  await upsertPresence(req.user);

  const { userId } = req.params;
  const requestedPlan = String(req.body.plan || "").trim().toLowerCase();

  if (!["free", "starter", "pro"].includes(requestedPlan)) {
    return res.status(400).json({ error: "Plano inválido." });
  }

  if (!userId) {
    return res.status(400).json({ error: "Usuário inválido." });
  }

  const status = requestedPlan === "free" ? "inactive" : "active";

  const { error } = await upsertSubscriptionByUserId({
    userId,
    plan: requestedPlan,
    status
  });

  if (error) {
    return res.status(500).json({ error: "Erro ao atualizar plano do usuário." });
  }

  await trackEvent({
    req,
    user: req.user,
    eventType: "admin_plan_changed",
    eventData: { newPlan: requestedPlan, status },
    targetUserId: userId
  });

  res.json({ ok: true, user_id: userId, plan: requestedPlan, status });
});

app.post("/api/admin/users/:userId/reset-usage", requireAdmin, async (req, res) => {
  await upsertPresence(req.user);

  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "Usuário inválido." });
  }

  const ok = await resetUsageByUserId(userId);

  if (!ok) {
    return res.status(500).json({ error: "Erro ao resetar uso diário." });
  }

  await trackEvent({
    req,
    user: req.user,
    eventType: "admin_usage_reset",
    eventData: { usedToday: 0 },
    targetUserId: userId
  });

  res.json({ ok: true, user_id: userId, used_today: 0 });
});

app.post("/api/admin/cache/clear", requireAdmin, async (req, res) => {
  await upsertPresence(req.user);
  clearApiCache();
  res.json({ ok: true, cacheEntries: apiCache.size });
});

app.get("/api/ready", (_req, res) => {
  res.json({ ok: !isShuttingDown, shuttingDown: isShuttingDown, uptime: Math.round(process.uptime()), now: new Date().toISOString() });
});

app.post("/api/stripe/webhook", async (req, res) => {
  try {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("⚠️ STRIPE_WEBHOOK_SECRET não configurado!");
      return res.status(500).json({ error: "Webhook secret missing" });
    }

    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    const reservation = await reserveWebhookEvent(event);

    if (!reservation.inserted) {
      return res.json({ received: true, duplicate: true });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.mode === "subscription") {
        const user_id = session.metadata?.user_id;
        const plan = session.metadata?.plan || "starter";
        const stripe_customer_id = session.customer || null;
        const stripe_subscription_id = session.subscription || null;

        if (user_id) {
          const { error } = await upsertSubscriptionByUserId({
            userId: user_id,
            plan,
            status: "active",
            stripeCustomerId: stripe_customer_id,
            stripeSubscriptionId: stripe_subscription_id
          });

          if (error) {
            throw error;
          }

          await trackEvent({
            eventType: "checkout_completed",
            eventData: { user_id, plan, stripe_subscription_id }
          });
        }
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object;

      await supabaseAdmin
        .from("subscriptions")
        .update({
          status: subscription.status === "active" ? "active" : subscription.status,
          stripe_customer_id: subscription.customer || null,
          stripe_subscription_id: subscription.id || null,
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null
        })
        .eq("stripe_subscription_id", subscription.id);
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;

      await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "canceled",
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null
        })
        .eq("stripe_subscription_id", subscription.id);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error.message);
    res.status(400).json({ error: `Webhook error: ${error.message}` });
  }
});

app.get(/^(?!\/api(?:\/|$)).*/, (req, res, next) => {
  if (path.extname(req.path)) {
    return next();
  }

  res.sendFile(publicIndexFile, (error) => {
    if (!error) return;

    console.error("Falha ao servir fallback do frontend:", error.message);
    next(error);
  });
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Rota da API não encontrada.", path: req.originalUrl, requestId: req.requestId });
});

app.use((error, req, res, _next) => {
  console.error(`[${req?.requestId || "no-request-id"}] Erro não tratado:`, error?.stack || error?.message || error);
  if (res.headersSent) return;
  res.status(error?.status || 500).json({
    error: error?.message || "Erro interno do servidor.",
    requestId: req?.requestId || null
  });
});

const serverInstance = app.listen(PORT, () => {
  logStartupDiagnostics();
  console.log("SERVER NIVEL 10 - PRODUCAO DURA");
  console.log(`Servidor rodando em ${APP_URL}`);
});

function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[BOOT] Encerrando com sinal ${signal}...`);

  const forceTimer = setTimeout(() => {
    console.error("[BOOT] Encerramento forçado por timeout.");
    process.exit(1);
  }, 10000);

  serverInstance.close(() => {
    clearTimeout(forceTimer);
    console.log("[BOOT] Servidor encerrado com segurança.");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));