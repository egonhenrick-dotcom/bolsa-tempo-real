let favorites = [];
let currentSymbol = "";
let autoRefresh = null;
let supabaseClient = null;
let currentUser = null;
let appConfig = null;
let currentPlan = "free";
let currentPlanStatus = "inactive";
let currentLang = "en";
let currentTimeframe = localStorage.getItem("currentTimeframe") || "5D";
let currentAccessToken = "";

let usageData = {
  used: 0,
  limit: 0,
  remaining: 0
};

let activeSearchRequestId = 0;
let isSearchingNow = false;
let isAutoRefreshing = false;
let tradingChart = null;
let tradingChartResizeObserver = null;
let isSigningOutNow = false;
let authSyncChannel = null;
let authSyncListenerReady = false;
let authRefreshPromise = null;
let authRefreshTimer = null;
let authInitFailed = false;
let backendHealthTimer = null;
let checkoutInFlight = false;
let networkBannerEl = null;
let latestAnalysisSnapshot = null;
let latestRenderedQuote = null;
let latestRenderedProfile = null;
let isAnalysisPaused = false;
let tradingViewState = { symbol: "", interval: "", theme: "", locale: "", mode: "" };
let lastRenderedCompareSymbol = "";
let lastRenderedBaseSymbol = "";
let lastRenderedTimeframe = "";
let lastChartInteractionAt = 0;
const CHART_INTERACTION_GUARD_MS = 12000;
const AUTH_SYNC_EVENT_KEY = "bolsa-auth-sync-event";

const translations = {
  en: {
    login: "Login / Create account",
    email: "Your email",
    password: "Your password",
    analyze: "Analyze",
    favorites: "Favorites",
    watchlist: "Watchlist",
    plans: "Plans",
    starter: "Starter",
    pro: "Pro",
    logout: "Logout",
    signup: "Sign up",
    signin: "Login",
    loginRequired: "Please login first.",
    comparePlaceholder: "Compare with... (Pro)",
    symbolPlaceholder: "Enter ticker (ex: AAPL or PETR4)",
    recentNews: "Recent news",
    chart: "Chart",
    last7days: "Last 7 days",
    portfolioPro: "Pro Portfolio",
    portfolioLocked: "Available for Pro plan",
    portfolioEnabled: "Portfolio enabled for Pro plan",
    save: "Save",
    quantity: "Quantity",
    avgPrice: "Average price",
    asset: "Asset (ex: AAPL or PETR4)",
    watchlistOpen: "Click to open",
    savedInDb: "Saved in database",
    checkoutStripe: "Checkout via Stripe",
    visitor: "Visitor",
    exchange: "Exchange",
    noRecentNews: "No recent news.",
    typeTicker: "Type a ticker or click a watchlist asset.",
    updatedFor: "Data updated for",
    compareOnlyPro: "🔒 Comparison is exclusive to the Pro plan",
    loginToSaveFav: "Please login to save favorites.",
    paidFavOnly: "🔒 Upgrade your plan to unlock favorites.",
    favoriteBlocked: "🔒 Favorites available only for paid plans.",
    portfolioProOnly: "Portfolio available only for Pro plan.",
    fillPortfolio: "Fill in asset, quantity and average price correctly.",
    assetSaved: "Asset saved in portfolio.",
    enterEmailPassword: "Enter email and password.",
    signupDone: "Registration completed.",
    signinDone: "Login successful.",
    sessionEnded: "Session ended.",
    loginFirstSubscribe: "Login before subscribing.",
    stripePriceMissing: "Stripe price not configured.",
    enterValidTicker: "Enter a valid ticker.",
    comparingWith: "Last 7 days • comparing with",
    dailyLimitReached: "Daily limit reached",
    upgradePlan: "Upgrade your plan.",
    remainingToday: "Remaining today",
    noSavedAssets: "No saved assets.",
    qty: "Qty",
    avg: "Avg",
    remove: "Remove",
    watchlistNewsChart: "Precision follow-up, unlocked chart and more analyses per day.",
    premiumDesc: "Automatic signals, asset comparison and unlimited analyses.",
    heroTitle: "See when to buy and sell stocks with more clarity",
    heroText: "Simple signals, live chart and a faster reading so you can decide better in the market.",
    heroStart: "Start free now",
    heroTry: "Try for free",
    heroProof: "🔥 +1,000 users analyzing the market every day",
    favorited: "★ Favorited",
    favorite: "⭐ Favorite",
    loginToSyncFavorites: "Login to sync favorites.",
    noFavoritesYet: "No favorites saved yet.",
    noChartData: "No chart data",
    dataLoadError: "Error loading data.",
    planLabel: "Plan",
    analyses: "analyses",
    investedLabel: "Invested",
    currentValueLabel: "Current value",
    profitLossLabel: "Profit/Loss",
    portfolioSummaryTitle: "Portfolio summary",
    currentPriceLabel: "Current price",
    timeframe1D: "1 day",
    timeframe5D: "5 days",
    timeframe1M: "1 month",
    timeframe3M: "3 months",
    timeframe1Y: "1 year",
    priceCurrentLabel: "Current price",
    variationLabel: "Change %",
    openingLabel: "Open",
    dayHighLabel: "Day high",
    dayLowLabel: "Day low",
    previousCloseLabel: "Previous close",
    chartLoadingLabel: "Loading chart...",
    searchHint: "Search by ticker or company name",
    suggestionsEmpty: "No matching assets found.",
    searchingLabel: "Searching assets...",
    suggestionPick: "Choose an asset from the list",
    autocompleteTopMatch: "Top match",
    chartTypeCandle: "Candle",
    chartTypeCompare: "Compare",
    chartHoverLabel: "Hover reading",
    chartLiveLabel: "Live chart",
    pauseAnalysis: "Pause analysis",
    resumeAnalysis: "Resume analysis",
    analysisPaused: "Analysis paused",
    analysisLive: "Analysis live"
  },
  pt: {
    login: "Entrar / Criar conta",
    email: "Seu e-mail",
    password: "Sua senha",
    analyze: "Analisar",
    favorites: "Favoritos",
    watchlist: "Watchlist",
    plans: "Planos",
    starter: "Starter",
    pro: "Pro",
    logout: "Sair",
    signup: "Cadastrar",
    signin: "Entrar",
    loginRequired: "Faça login primeiro.",
    comparePlaceholder: "Comparar com... (Pro)",
    symbolPlaceholder: "Digite o ticker (ex: AAPL ou PETR4)",
    recentNews: "Notícias recentes",
    chart: "Gráfico",
    last7days: "Últimos 7 dias",
    portfolioPro: "Carteira Pro",
    portfolioLocked: "Disponível para plano Pro",
    portfolioEnabled: "Carteira liberada para plano Pro",
    save: "Salvar",
    quantity: "Quantidade",
    avgPrice: "Preço médio",
    asset: "Ativo (ex: AAPL ou PETR4)",
    watchlistOpen: "Clique para abrir",
    savedInDb: "Salvos no banco",
    checkoutStripe: "Checkout via Stripe",
    visitor: "Visitante",
    exchange: "Exchange",
    noRecentNews: "Sem notícias recentes.",
    typeTicker: "Digite um ticker ou clique em um ativo da watchlist.",
    updatedFor: "Dados atualizados para",
    compareOnlyPro: "🔒 Comparação é exclusiva do plano Pro",
    loginToSaveFav: "Faça login para salvar favoritos.",
    paidFavOnly: "🔒 Favoritos disponíveis apenas para planos pagos.",
    favoriteBlocked: "🔒 Favoritos disponíveis apenas para planos pagos.",
    portfolioProOnly: "Carteira disponível apenas para plano Pro.",
    fillPortfolio: "Preencha ativo, quantidade e preço médio corretamente.",
    assetSaved: "Ativo salvo na carteira.",
    enterEmailPassword: "Preencha email e senha.",
    signupDone: "Cadastro realizado.",
    signinDone: "Login realizado.",
    sessionEnded: "Sessão encerrada.",
    loginFirstSubscribe: "Faça login antes de assinar.",
    stripePriceMissing: "Preço Stripe não configurado.",
    enterValidTicker: "Digite um ticker válido.",
    comparingWith: "Últimos 7 dias • comparando com",
    dailyLimitReached: "Limite diário atingido",
    upgradePlan: "Faça upgrade do plano.",
    remainingToday: "Restantes hoje",
    noSavedAssets: "Nenhum ativo salvo.",
    qty: "Qtd",
    avg: "PM",
    remove: "Remover",
    watchlistNewsChart: "Acompanhamento com mais precisão, gráfico liberado e mais análises por dia.",
    premiumDesc: "Sinais automáticos, comparação de ativos e análises ilimitadas.",
    heroTitle: "Descubra quando comprar e vender ações com mais clareza",
    heroText: "Veja sinais simples, gráfico ao vivo e leitura rápida para decidir melhor no mercado.",
    heroStart: "Começar grátis agora",
    heroTry: "Testar grátis",
    heroProof: "🔥 +1.000 usuários analisando o mercado todos os dias",
    favorited: "★ Favoritado",
    favorite: "⭐ Favoritar",
    loginToSyncFavorites: "Faça login para sincronizar favoritos.",
    noFavoritesYet: "Nenhum favorito salvo ainda.",
    noChartData: "Sem dados para gráfico",
    dataLoadError: "Erro ao carregar dados.",
    planLabel: "Plano",
    analyses: "análises",
    investedLabel: "Investido",
    currentValueLabel: "Valor atual",
    profitLossLabel: "Lucro/Prejuízo",
    portfolioSummaryTitle: "Resumo da carteira",
    currentPriceLabel: "Preço atual",
    timeframe1D: "1 dia",
    timeframe5D: "5 dias",
    timeframe1M: "1 mês",
    timeframe3M: "3 meses",
    timeframe1Y: "1 ano",
    priceCurrentLabel: "Preço atual",
    variationLabel: "Variação %",
    openingLabel: "Abertura",
    dayHighLabel: "Máxima do dia",
    dayLowLabel: "Mínima do dia",
    previousCloseLabel: "Fechamento anterior",
    chartLoadingLabel: "Carregando gráfico...",
    searchHint: "Busque por ticker ou nome da empresa",
    suggestionsEmpty: "Nenhum ativo encontrado.",
    searchingLabel: "Buscando ativos...",
    suggestionPick: "Escolha um ativo da lista",
    autocompleteTopMatch: "Melhor resultado",
    chartTypeCandle: "Candle",
    chartTypeCompare: "Comparativo",
    chartHoverLabel: "Leitura no cursor",
    chartLiveLabel: "Gráfico ao vivo",
    pauseAnalysis: "Pausar análise",
    resumeAnalysis: "Retomar análise",
    analysisPaused: "Análise pausada",
    analysisLive: "Análise ao vivo"
  }
};

function t(key) {
  return translations[currentLang]?.[key] || key;
}

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function getAutoRefreshMs() {
  if (currentPlan === "pro" && currentPlanStatus === "active") return 5000;
  if (currentPlan === "starter" && currentPlanStatus === "active") return 15000;
  return 0;
}

function stopAutoRefresh() {
  if (autoRefresh) {
    clearInterval(autoRefresh);
    autoRefresh = null;
  }
}

function startAutoRefresh(symbol) {
  stopAutoRefresh();

  const intervalMs = getAutoRefreshMs();
  if (!intervalMs || !symbol) return;

  autoRefresh = setInterval(async () => {
    try {
      if (document.hidden) return;
      if (isSearchingNow) return;
      if (isAutoRefreshing) return;
      if (isAnalysisPaused) return;
      if (isChartInteractionGuardActive()) return;

      if (window.__refreshLock) return;
      window.__refreshLock = true;

      isAutoRefreshing = true;

      if (!currentSymbol || normalizeSymbol(currentSymbol) !== normalizeSymbol(symbol)) return;

      await handleSearch(true);

    } catch (error) {
      console.error("Auto refresh falhou:", error.message);
    } finally {
      isAutoRefreshing = false;

      setTimeout(() => {
        window.__refreshLock = false;
      }, 2000);
    }
  }, intervalMs);
}

function isUnlimitedAccessUser() {
  return !!isAdminUser || (currentPlan === "pro" && currentPlanStatus === "active");
}

function hasReachedLimit() {
  if (!usageData) return false;
  if (isUnlimitedAccessUser()) return false;
  if (usageData.limit === "∞") return false;
  return Number(usageData.remaining) <= 0;
}

const DEFAULT_FREE_PREVIEW_SYMBOL = "AAPL";

function isFreeTierUser() {
  return !currentUser || currentPlan === "free" || currentPlanStatus !== "active";
}

function getPreviewLockedSymbol(requestedSymbol = "") {
  return normalizeSymbol(currentSymbol || requestedSymbol || symbolInput?.value || DEFAULT_FREE_PREVIEW_SYMBOL);
}

function canUsePreviewAfterLimit(requestedSymbol = "", { silentRefresh = false } = {}) {
  const normalizedRequested = normalizeSymbol(requestedSymbol || symbolInput?.value || DEFAULT_FREE_PREVIEW_SYMBOL);
  const lockedSymbol = getPreviewLockedSymbol(normalizedRequested);

  if (!hasReachedLimit()) return true;
  if (!isFreeTierUser()) return false;
  if (silentRefresh) return normalizedRequested === lockedSymbol;

  if (!currentSymbol) {
    return normalizedRequested === normalizeSymbol(DEFAULT_FREE_PREVIEW_SYMBOL);
  }

  return normalizedRequested === lockedSymbol;
}

function getUsageBadgeMessage(data = usageData) {
  const limit = data?.limit;
  const remaining = Number(data?.remaining);

  if (limit === "∞") {
    return currentLang === "en"
      ? "Unlimited analyses today"
      : "Análises ilimitadas hoje";
  }

  if (!Number.isFinite(remaining)) {
    return `${t("remainingToday")}: ${data?.remaining ?? 0}`;
  }

  if (remaining <= 0) {
    return currentLang === "en"
      ? "🔒 Free limit reached today"
      : "🔒 Limite grátis atingido hoje";
  }

  if (remaining === 1) {
    return currentLang === "en"
      ? "⚠️ Last free analysis today"
      : "⚠️ Última análise grátis hoje";
  }

  return currentLang === "en"
    ? `🎯 Free analyses today: ${remaining}`
    : `🎯 Análises grátis hoje: ${remaining}`;
}

const watchSymbols = ["AAPL", "MSFT", "TSLA", "NVDA", "AMZN", "META", "PETR4", "VALE3"];
const timeframeOptions = ["1D", "5D", "1M", "3M", "1Y"];

const symbolInput = document.getElementById("symbolInput");
const compareInput = document.getElementById("compareInput");
const searchBtn = document.getElementById("searchBtn");
const themeToggle = document.getElementById("themeToggle");
const usageBadge = document.getElementById("usageBadge");
const langToggle = document.getElementById("langToggle");
const favBtn = document.getElementById("favBtn");

const portfolioSection = document.getElementById("portfolioSection");
const portfolioSymbol = document.getElementById("portfolioSymbol");
const portfolioQuantity = document.getElementById("portfolioQuantity");
const portfolioAvgPrice = document.getElementById("portfolioAvgPrice");
const addPortfolioBtn = document.getElementById("addPortfolioBtn");
const portfolioStatus = document.getElementById("portfolioStatus");
const portfolioSummary = document.getElementById("portfolioSummary");
const portfolioList = document.getElementById("portfolioList");

const statusBox = document.getElementById("status");
const marketOverview = document.getElementById("marketOverview");
const analysisStageBadge = document.getElementById("analysisStageBadge");
const analysisHeroPrice = document.getElementById("analysisHeroPrice");
const analysisHeroMeta = document.getElementById("analysisHeroMeta");

const companyCard = document.getElementById("companyCard");
const quoteGrid = document.getElementById("quoteGrid");
const chartCard = document.getElementById("chartCard");
const newsSection = document.getElementById("newsSection");

const companyName = document.getElementById("companyName");
const companyTicker = document.getElementById("companyTicker");
const companyExchange = document.getElementById("companyExchange");

const currentPrice = document.getElementById("currentPrice");
const changePercent = document.getElementById("changePercent");
const openPrice = document.getElementById("openPrice");
const highPrice = document.getElementById("highPrice");
const lowPrice = document.getElementById("lowPrice");
const prevClose = document.getElementById("prevClose");

const chart = document.getElementById("chart");
const chartLabel = document.getElementById("chartLabel");
const newsList = document.getElementById("newsList");
const newsSymbol = document.getElementById("newsSymbol");

const authStatus = document.getElementById("authStatus");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const signUpBtn = document.getElementById("signUpBtn");
const signInBtn = document.getElementById("signInBtn");
const signOutBtn = document.getElementById("signOutBtn");
const logoutTopBtn = document.getElementById("logoutTopBtn");
const userBadge = document.getElementById("userBadge");
const planBadge = document.getElementById("planBadge");

const starterBtn = document.getElementById("starterBtn");
const proBtn = document.getElementById("proBtn");

const symbolSuggestions = document.getElementById("symbolSuggestions");
const compareSuggestions = document.getElementById("compareSuggestions");
const searchHint = document.getElementById("searchHint");

let symbolSearchDebounce = null;
let compareSearchDebounce = null;
let activeSuggestionField = null;
let activeSuggestionIndex = -1;
let latestSymbolSuggestions = [];
let latestCompareSuggestions = [];
const autocompleteCache = new Map();

function normalizeSymbol(rawSymbol) {
  let symbol = String(rawSymbol || "").trim().toUpperCase();
  if (/^[A-Z]{4}\d$/.test(symbol)) symbol = `${symbol}.SA`;
  return symbol;
}

function displaySymbol(symbol) {
  return String(symbol || "").replace(".SA", "");
}

function getTimeframeLabel(timeframe = currentTimeframe) {
  const map = {
    "1D": t("timeframe1D"),
    "5D": t("timeframe5D"),
    "1M": t("timeframe1M"),
    "3M": t("timeframe3M"),
    "1Y": t("timeframe1Y")
  };
  return map[timeframe] || timeframe;
}

function getTimeframeQuery(timeframe = currentTimeframe) {
  const params = new URLSearchParams();
  params.set("timeframe", timeframe);
  return params.toString();
}

async function fetchCandlesByTimeframe(symbol, authenticated = true, timeframe = currentTimeframe) {
  const url = `/api/candles/${encodeURIComponent(symbol)}?${getTimeframeQuery(timeframe)}`;
  return authenticated ? fetchAuthJSON(url) : fetchJSON(url);
}

function updateChartHeader(compareSymbol = "") {
  if (!chartLabel) return;

  chartLabel.textContent = compareSymbol
    ? `${getTimeframeLabel(currentTimeframe)} • ${currentLang === "en" ? "comparing with" : "comparando com"} ${displaySymbol(compareSymbol)}`
    : getTimeframeLabel(currentTimeframe);
}

function setActiveTimeframeButton() {
  document.querySelectorAll(".timeframe-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.timeframe === currentTimeframe);
  });
}

function ensureTimeframeControls() {
  if (!chartCard) return;

  let header = chartCard.querySelector(".chart-header");
  if (!header) return;

  let wrapper = chartCard.querySelector(".timeframe-controls");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.className = "timeframe-controls";
    wrapper.style.display = "flex";
    wrapper.style.gap = "8px";
    wrapper.style.flexWrap = "wrap";
    wrapper.style.alignItems = "center";
    header.appendChild(wrapper);
  }

  wrapper.innerHTML = timeframeOptions.map((tf) => `
    <button type="button" class="neutral-btn timeframe-btn${tf === currentTimeframe ? " is-active" : ""}" data-timeframe="${tf}" style="min-height:auto;padding:8px 12px;border-radius:999px;">
      ${tf}
    </button>
  `).join("");

  wrapper.querySelectorAll(".timeframe-btn").forEach((btn) => {
    btn.onclick = async () => {
      const selected = btn.dataset.timeframe;
      if (!selected || selected === currentTimeframe || isSearchingNow) return;

      currentTimeframe = selected;
      localStorage.setItem("currentTimeframe", currentTimeframe);
      setActiveTimeframeButton();
      stopAutoRefresh();
      setChartLoadingState(true);
      updateChartHeader(normalizeSymbol(compareInput?.value || ""));

      if (currentSymbol) {
        await handleSearch(true);
        startAutoRefresh(currentSymbol);
      } else {
        setChartLoadingState(false);
      }
    };
  });

  setActiveTimeframeButton();
  updateChartHeader(normalizeSymbol(compareInput?.value || ""));
  ensureAnalysisControlButton();
}

function setChartLoadingState(loading) {
  if (!chartCard || !chart) return;

  chartCard.classList.toggle("chart-is-loading", !!loading);

  if (loading) {
    chart.style.opacity = "0.45";
    if (chartLabel) {
      chartLabel.textContent = `${getTimeframeLabel(currentTimeframe)} • ${t("chartLoadingLabel")}`;
    }
    return;
  }

  chart.style.opacity = "1";
}


function applyQuoteCardValues(quote = {}) {
  if (currentPrice) currentPrice.textContent = formatPrice(quote?.c);
  if (changePercent) {
    const numericChange = Number(quote?.dp);
    changePercent.textContent = Number.isFinite(numericChange) ? `${numericChange.toFixed(2)}%` : "-";
  }
  if (openPrice) openPrice.textContent = formatPrice(quote?.o);
  if (highPrice) highPrice.textContent = formatPrice(quote?.h);
  if (lowPrice) lowPrice.textContent = formatPrice(quote?.l);
  if (prevClose) prevClose.textContent = formatPrice(quote?.pc);
}

function buildHoverQuote(baseQuote = {}, point = {}) {
  const close = Number(point?.close);
  const open = Number(point?.open);
  const high = Number(point?.high);
  const low = Number(point?.low);
  const prevCloseValue = Number(baseQuote?.pc);

  const hasClose = Number.isFinite(close);
  const hasPrevClose = Number.isFinite(prevCloseValue) && prevCloseValue !== 0;

  const absoluteChange = hasClose && hasPrevClose ? Number((close - prevCloseValue).toFixed(2)) : baseQuote?.d ?? null;
  const percentChange = hasClose && hasPrevClose
    ? Number((((close - prevCloseValue) / prevCloseValue) * 100).toFixed(2))
    : baseQuote?.dp ?? null;

  return {
    ...baseQuote,
    c: hasClose ? close : baseQuote?.c ?? null,
    o: Number.isFinite(open) ? open : baseQuote?.o ?? null,
    h: Number.isFinite(high) ? high : baseQuote?.h ?? null,
    l: Number.isFinite(low) ? low : baseQuote?.l ?? null,
    d: absoluteChange,
    dp: percentChange
  };
}

function cloneSnapshotWithHover(snapshot = latestAnalysisSnapshot, hoverQuote = latestRenderedQuote) {
  if (!snapshot) return null;
  return {
    ...snapshot,
    price: hoverQuote?.c ?? snapshot.price,
    sourceLabel: `${t("chartHoverLabel")} • ${snapshot.sourceLabel || ""}`.trim()
  };
}

function syncInstitutionalHover(point = null) {
  if (!latestRenderedQuote) return;

  if (!point) {
    applyQuoteCardValues(latestRenderedQuote);
    if (latestAnalysisSnapshot) {
      renderOverview(latestRenderedQuote, latestAnalysisSnapshot);
      renderSmartPremiumPanel(latestAnalysisSnapshot);
    }
    return;
  }

  const hoverQuote = buildHoverQuote(latestRenderedQuote, point);
  applyQuoteCardValues(hoverQuote);

  const hoverSnapshot = cloneSnapshotWithHover(latestAnalysisSnapshot, hoverQuote);
  if (hoverSnapshot) {
    renderOverview(hoverQuote, hoverSnapshot);
    renderSmartPremiumPanel(hoverSnapshot);
  }
}

function formatPrice(value) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return Number(value).toFixed(2);
}

function hasValidQuoteData(quote) {
  if (!quote || typeof quote !== "object") return false;
  const values = [quote.c, quote.d, quote.dp, quote.h, quote.l, quote.o, quote.pc];
  return values.some((value) => value != null && !Number.isNaN(Number(value)));
}

function getFriendlyAnalysisStatus(symbol, quote, candles) {
  if (quote?.error === "QUOTE_UNAVAILABLE" || !hasValidQuoteData(quote)) {
    return `⚠️ ${displaySymbol(symbol)} sem dados completos no momento. Tente outro ativo ou aguarde alguns minutos.`;
  }

  if (!candles?.c || !candles.c.length) {
    return `⚠️ ${displaySymbol(symbol)} sem gráfico disponível no momento.`;
  }

  return `${t("updatedFor")} ${displaySymbol(symbol)} • ${getQuoteSourceLabel(quote)}.`;
}

function setStatus(message) {
  if (statusBox) statusBox.textContent = message;
}

function setAuthStatus(message) {
  if (authStatus) authStatus.textContent = message;
}

function updateAuthPanelUI() {
  const authForm = document.getElementById("authForm");
  const authCard = document.getElementById("authCard");

  if (currentUser) {
    if (userBadge) {
      userBadge.textContent = currentUser.email || "Usuário";
    }

    if (authForm) authForm.style.display = "none";
    if (authCard) authCard.style.display = "none";

    if (signOutBtn) signOutBtn.classList.remove("hidden");
    if (logoutTopBtn) {
      logoutTopBtn.classList.remove("hidden");
      logoutTopBtn.textContent = currentLang === "en" ? "Logout" : "Sair";
      logoutTopBtn.disabled = false;
    }

    if (signUpBtn) signUpBtn.classList.add("hidden");
    if (signInBtn) signInBtn.classList.add("hidden");

    if (authStatus) authStatus.textContent = "";
    return;
  }

  if (userBadge) {
    userBadge.textContent = t("visitor");
  }

  if (authCard) {
    authCard.style.display = "block";
    authCard.classList.remove("hidden");
  }

  if (authForm) {
    authForm.style.display = "block";
  }

  if (logoutTopBtn) {
    logoutTopBtn.classList.add("hidden");
    logoutTopBtn.disabled = false;
    logoutTopBtn.textContent = currentLang === "en" ? "Logout" : "Sair";
  }

  if (signOutBtn) signOutBtn.classList.add("hidden");
  if (signUpBtn) signUpBtn.classList.remove("hidden");
  if (signInBtn) signInBtn.classList.remove("hidden");
}
function updateAnalysisStageBadge(label, tone = "neutral") {
  if (!analysisStageBadge) return;
  analysisStageBadge.textContent = label || "Aguardando ativo";
  analysisStageBadge.dataset.tone = tone;
}

function getQuoteSourceLabel(quote) {
  if (quote?.source === "yahoo") {
    return "Yahoo Finance";
  }

  if (quote?.source === "finnhub") {
    return "Finnhub";
  }

  if (quote?.source === "twelvedata") {
    return "TwelveData";
  }

  return currentLang === "en" ? "Partial data" : "Dados parciais";
}

function updateAnalysisHero(quote, symbol) {
  if (analysisHeroPrice) {
    analysisHeroPrice.textContent = formatPrice(quote?.c);
    analysisHeroPrice.classList.remove("price-up", "price-down");

    const change = Number(quote?.dp || 0);
    if (change > 0) analysisHeroPrice.classList.add("price-up");
    if (change < 0) analysisHeroPrice.classList.add("price-down");

    analysisHeroPrice.style.transform = "scale(1.04)";
    setTimeout(() => {
      if (analysisHeroPrice) analysisHeroPrice.style.transform = "scale(1)";
    }, 150);
  }

  if (analysisHeroMeta) {
    const source = getQuoteSourceLabel(quote);
    const change = quote?.dp == null || Number.isNaN(Number(quote.dp))
      ? (quote?.source === "twelvedata" ? "N/A" : "0.00%")
      : `${Number(quote.dp).toFixed(2)}%`;
    analysisHeroMeta.textContent = `${displaySymbol(symbol)} • ${source} • ${change}`;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setSearchLoadingState(loading) {
  isSearchingNow = !!loading;

  if (!searchBtn) return;

  if (loading) {
    searchBtn.disabled = true;
    searchBtn.style.opacity = "0.7";
    searchBtn.textContent = currentLang === "en" ? "Analyzing..." : "Analisando...";
    return;
  }

  const blocked = hasReachedLimit();
  searchBtn.disabled = !!blocked;
  searchBtn.style.opacity = blocked ? "0.5" : "1";
  searchBtn.textContent = t("analyze");
}

function afterSuccessfulAnalysis(symbol) {
  try {
    if (typeof saveRecentSearch === "function") saveRecentSearch(symbol);
    if (typeof renderDynamicMarketLists === "function") renderDynamicMarketLists();
    if (typeof renderSuggestions === "function") renderSuggestions(displaySymbol(symbol));
  } catch {}
}

function resetSmartPremiumPanel() {
  const panel = document.querySelector(".analysis-hero-right");
  if (!panel) return;

  panel.innerHTML = `
    <span class="analysis-hero-caption">${currentLang === "en" ? "Smart panel" : "Painel inteligente"}</span>
    <span class="analysis-hero-subcaption">${currentLang === "en" ? "Waiting for a live reading to unlock trend, zones and timing." : "Aguardando uma leitura ao vivo para liberar tendência, zonas e timing."}</span>
  `;
}

function clearAnalysisUI() {
  currentSymbol = "";
  stopAutoRefresh();
  if (companyCard) companyCard.classList.add("hidden");
  if (quoteGrid) quoteGrid.classList.add("hidden");
  if (chartCard) chartCard.classList.remove("hidden");
  if (newsSection) newsSection.classList.add("hidden");
  if (chart) {
    chart.innerHTML = `
      <div class="chart-teaser">
        <strong>${currentLang === "en" ? "Live chart ready to preview" : "Gráfico ao vivo pronto para visualizar"}</strong>
        <p>${currentLang === "en" ? "Analyze any ticker to see the chart. Login only when you want to save favorites, compare assets or unlock unlimited analyses." : "Analise qualquer ticker para ver o gráfico. Faça login apenas quando quiser salvar favoritos, comparar ativos ou liberar análises ilimitadas."}</p>
      </div>
    `;
  }
  if (newsList) newsList.innerHTML = "";
  if (analysisHeroPrice) analysisHeroPrice.textContent = "--";
  if (analysisHeroMeta) analysisHeroMeta.textContent = currentLang === "en" ? "Waiting for analysis" : "Aguardando análise";
  latestAnalysisSnapshot = null;
  latestRenderedQuote = null;
  latestRenderedProfile = null;
  isAnalysisPaused = false;
  lastRenderedCompareSymbol = "";
  lastRenderedBaseSymbol = "";
  lastRenderedTimeframe = "";
  resetTradingViewState();
  resetSmartPremiumPanel();
  updateMarketSignalCard(null);
  updateAnalysisStageBadge(currentLang === "en" ? "Waiting for asset" : "Aguardando ativo", "neutral");
  updateChartHeader("");
  setStatus(t("typeTicker"));
  syncActiveMarketButtons();
  updateAnalysisControlButton();
}

function getAccessToken() {
  return currentAccessToken
    || sessionStorage.getItem("sb-access-token")
    || localStorage.getItem("sb-access-token")
    || "";
}

function setAccessToken(token) {
  currentAccessToken = token || "";

  if (token) {
    sessionStorage.setItem("sb-access-token", token);
    localStorage.setItem("sb-access-token", token);
  } else {
    sessionStorage.removeItem("sb-access-token");
    localStorage.removeItem("sb-access-token");
  }
}

function notifyAuthSync(type = "session", payload = {}) {
  const message = { type, payload, at: Date.now() };

  try {
    if (authSyncChannel) {
      authSyncChannel.postMessage(message);
    }
  } catch {}

  try {
    localStorage.setItem(AUTH_SYNC_EVENT_KEY, JSON.stringify(message));
  } catch {}
}

// ==================== FUNÇÃO CORRIGIDA scheduleAuthRefresh ====================
function scheduleAuthRefresh(reason = "sync", delay = 0) {
  if (!supabaseClient || !supabaseClient.auth) {
    console.log(`⏸️ scheduleAuthRefresh ignorado: Supabase não pronto (${reason})`);
    return;
  }
  
  if (authInitFailed) {
    console.log(`⏸️ scheduleAuthRefresh ignorado: authInitFailed (${reason})`);
    return;
  }

  if (authRefreshTimer) {
    clearTimeout(authRefreshTimer);
    authRefreshTimer = null;
  }

  authRefreshTimer = setTimeout(() => {
    authRefreshTimer = null;

    if (!supabaseClient || !supabaseClient.auth || authInitFailed) {
      return;
    }

    refreshAuthState(reason).catch((error) => {
      console.error("auth refresh error:", error?.message || error);
    });
  }, Math.max(0, Number(delay) || 0));
}

function attachAuthSyncListeners() {
  if (authSyncListenerReady) return;
  authSyncListenerReady = true;

  try {
    if (typeof BroadcastChannel !== "undefined") {
      authSyncChannel = new BroadcastChannel("bolsa-auth-sync");
      authSyncChannel.onmessage = (event) => {
        const message = event?.data || {};
        if (!message?.type) return;

        if (message.type === "signed_out") {
          setAccessToken("");
          resetClientSessionState({ clearForm: false, statusMessage: t("sessionEnded") });
          return;
        }

        if (["signed_in", "token_updated", "session_refresh"].includes(message.type)) {
          scheduleAuthRefresh(`broadcast:${message.type}`, 80);
        }
      };
    }
  } catch {}

  window.addEventListener("storage", (event) => {
    if (event.key === "sb-access-token") {
      if (!event.newValue) {
        setAccessToken("");
        resetClientSessionState({ clearForm: false, statusMessage: t("sessionEnded") });
        return;
      }

      if (event.newValue !== currentAccessToken) {
        setAccessToken(event.newValue);
        scheduleAuthRefresh("storage:token", 80);
      }

      return;
    }

    if (event.key === AUTH_SYNC_EVENT_KEY && event.newValue) {
      try {
        const message = JSON.parse(event.newValue);
        if (!message?.type) return;

        if (message.type === "signed_out") {
          setAccessToken("");
          resetClientSessionState({ clearForm: false, statusMessage: t("sessionEnded") });
          return;
        }

        scheduleAuthRefresh(`storage:${message.type}`, 80);
      } catch {}
    }
  });

  window.addEventListener("focus", () => {
    scheduleAuthRefresh("window-focus", 0);
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      scheduleAuthRefresh("tab-visible", 0);
    }
  });
}

function resetClientSessionState({ clearForm = true, statusMessage = "" } = {}) {
  currentUser = null;
  currentPlan = "free";
  currentPlanStatus = "inactive";
  favorites = [];
  currentSymbol = "";
  usageData = { used: 0, limit: 3, remaining: 3 };
  stopAutoRefresh();
  stopPresenceHeartbeat();
  isAdminUser = false;
  adminUsersCache = [];
  adminUserFilter = "all";

  if (compareInput) compareInput.value = "";
  if (portfolioList) portfolioList.innerHTML = "";
  if (portfolioSummary) portfolioSummary.innerHTML = "";
  const adminUsersList = getAdminUsersList();
  if (adminUsersList) adminUsersList.innerHTML = "";

  clearAnalysisUI();
  renderFavorites();
  updatePlanUI();
  refreshUsage().catch(() => {});
  toggleAdminSection();
  clearAuthFields(clearForm);
  updateAuthPanelUI();

  if (statusMessage) {
    setAuthStatus(statusMessage);
  }
}

function getNetworkBannerText(type = "online") {
  if (type === "offline") {
    return currentLang === "en"
      ? "You are offline. Some live data may fail until the connection returns."
      : "Você está offline. Alguns dados ao vivo podem falhar até a conexão voltar.";
  }

  if (type === "backend") {
    return currentLang === "en"
      ? "The server is unstable right now. Trying to reconnect automatically."
      : "O servidor está instável agora. Tentando reconectar automaticamente.";
  }

  return currentLang === "en"
    ? "Connection restored."
    : "Conexão restabelecida.";
}

function ensureNetworkBanner() {
  if (networkBannerEl && document.body.contains(networkBannerEl)) return networkBannerEl;

  networkBannerEl = document.getElementById("networkStatusBanner");
  if (networkBannerEl) return networkBannerEl;

  const banner = document.createElement("div");
  banner.id = "networkStatusBanner";
  banner.style.position = "fixed";
  banner.style.left = "50%";
  banner.style.bottom = "16px";
  banner.style.transform = "translateX(-50%)";
  banner.style.padding = "10px 16px";
  banner.style.borderRadius = "999px";
  banner.style.fontSize = "13px";
  banner.style.fontWeight = "600";
  banner.style.zIndex = "9999";
  banner.style.boxShadow = "0 12px 30px rgba(0,0,0,0.18)";
  banner.style.display = "none";
  banner.style.maxWidth = "calc(100vw - 32px)";
  banner.style.textAlign = "center";
  document.body.appendChild(banner);
  networkBannerEl = banner;
  return banner;
}

function setNetworkBanner(type = "online", visible = true) {
  const banner = ensureNetworkBanner();
  if (!banner) return;

  if (!visible) {
    banner.style.display = "none";
    banner.dataset.state = "hidden";
    return;
  }

  banner.textContent = getNetworkBannerText(type);
  banner.dataset.state = type;
  banner.style.display = "block";
  banner.style.background = type === "offline" ? "#fff4cc" : type === "backend" ? "#ffe4e6" : "#dcfce7";
  banner.style.color = type === "offline" ? "#7c5a00" : type === "backend" ? "#991b1b" : "#166534";
  banner.style.border = type === "offline" ? "1px solid #facc15" : type === "backend" ? "1px solid #fca5a5" : "1px solid #86efac";

  if (type === "online") {
    clearTimeout(window.__networkBannerTimer);
    window.__networkBannerTimer = setTimeout(() => {
      setNetworkBanner("online", false);
    }, 2200);
  }
}

function handleBrowserConnectivityChange() {
  if (navigator.onLine === false) {
    setNetworkBanner("offline", true);
    return;
  }

  setNetworkBanner("online", true);
  scheduleAuthRefresh("browser-online", 0);
  refreshUsage();
}

async function runBackendHealthProbe() {
  if (navigator.onLine === false) {
    setNetworkBanner("offline", true);
    return false;
  }

  try {
    const health = await fetchJSON("/api/health", { silentNetworkBanner: true });
    if (health?.ok) {
      if (networkBannerEl?.dataset?.state === "backend") {
        setNetworkBanner("online", true);
      }
      return true;
    }
  } catch {
    setNetworkBanner("backend", true);
    return false;
  }

  return false;
}

function startBackendHealthMonitor() {
  stopBackendHealthMonitor();
  backendHealthTimer = setInterval(() => {
    runBackendHealthProbe();
  }, 45000);
}

function stopBackendHealthMonitor() {
  if (backendHealthTimer) {
    clearInterval(backendHealthTimer);
    backendHealthTimer = null;
  }
}

async function getLiveAccessToken() {
  if (!supabaseClient?.auth?.getSession) {
    return getAccessToken();
  }

  try {
    const { data } = await supabaseClient.auth.getSession();
    const liveToken = data?.session?.access_token || "";

    if (liveToken && liveToken !== currentAccessToken) {
      setAccessToken(liveToken);
    }

    if (!liveToken && currentAccessToken) {
      setAccessToken("");
    }

    return liveToken || getAccessToken();
  } catch {
    return getAccessToken();
  }
}

async function fetchJSON(url, options = {}) {
  if (navigator.onLine === false) {
    setNetworkBanner("offline", true);
    throw new Error(currentLang === "en" ? "You are offline." : "Você está offline.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      signal: options.signal || controller.signal
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      if (response.status >= 500 && !options.silentNetworkBanner) {
        setNetworkBanner("backend", true);
      }
      const message =
        typeof data === "object" && data?.error
          ? data.error
          : t("dataLoadError");
      const error = new Error(message);
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    if (!options.silentNetworkBanner && networkBannerEl?.dataset?.state && networkBannerEl.dataset.state !== "offline") {
      setNetworkBanner("online", false);
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      setNetworkBanner("backend", true);
      throw new Error(currentLang === "en" ? "Request timed out." : "A requisição demorou demais.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAuthJSON(url, options = {}) {
  const liveToken = await getLiveAccessToken();
  const headers = {
    ...(options.headers || {}),
    ...(liveToken ? { Authorization: `Bearer ${liveToken}` } : {})
  };

  try {
    return await fetchJSON(url, {
      ...options,
      headers
    });
  } catch (error) {
    if (error?.status === 401 && currentUser && !isSigningOutNow) {
      setAccessToken("");
      resetClientSessionState({
        clearForm: false,
        statusMessage: t("sessionEnded")
      });
      scheduleAuthRefresh("401-recovery", 120);
    }
    throw error;
  }
}

let isFetchingUsage = false;

async function refreshUsage() {
  if (isFetchingUsage) return usageData;

  if (window.__usageLock) return usageData;
  window.__usageLock = true;

  try {
    isFetchingUsage = true;

    const data = await fetchAuthJSON("/api/me/usage");

    if (data) {
      usageData = data;
    }

    return usageData;
  } catch (e) {
    console.error("refreshUsage error:", e.message);
    return usageData;
  } finally {
    isFetchingUsage = false;

    setTimeout(() => {
      window.__usageLock = false;
    }, 1200);
  }
}

async function fetchUsage() {
  return refreshUsage();
}

function updateFavoriteButton() {
  if (!favBtn) return;

  if (currentSymbol && favorites.includes(currentSymbol)) {
    favBtn.textContent = t("favorited");
    favBtn.classList.add("is-favorite");
  } else {
    favBtn.textContent = t("favorite");
    favBtn.classList.remove("is-favorite");
  }
}

function updatePlanUI() {
  const planName =
    currentPlan === "pro" ? "Pro" :
    currentPlan === "starter" ? "Starter" :
    "Free";

  if (planBadge) planBadge.textContent = `${t("planLabel")}: ${planName}`;

  if (!currentUser) {
    if (userBadge) userBadge.textContent = t("visitor");
    if (signOutBtn) signOutBtn.classList.add("hidden");
    if (logoutTopBtn) logoutTopBtn.classList.add("hidden");
    if (starterBtn) {
      starterBtn.disabled = false;
      starterBtn.textContent = currentLang === "en" ? "Subscribe Starter" : "Assinar Starter";
    }
    if (proBtn) {
      proBtn.disabled = false;
      proBtn.textContent = currentLang === "en" ? "Subscribe Pro" : "Assinar Pro";
    }
    if (portfolioSection) portfolioSection.classList.add("hidden");
    return;
  }

  if (userBadge) userBadge.textContent = currentUser.email || "Usuário";
  if (signOutBtn) signOutBtn.classList.remove("hidden");
  if (logoutTopBtn) logoutTopBtn.classList.remove("hidden");

  if (starterBtn) {
    const starterActive = currentPlan === "starter" && currentPlanStatus === "active";
    starterBtn.disabled = starterActive;
    starterBtn.textContent = starterActive
      ? (currentLang === "en" ? "Starter plan active" : "Plano Starter ativo")
      : (currentLang === "en" ? "Subscribe Starter" : "Assinar Starter");
  }

  if (proBtn) {
    const proActive = currentPlan === "pro" && currentPlanStatus === "active";
    proBtn.disabled = proActive;
    proBtn.textContent = proActive
      ? (currentLang === "en" ? "Pro plan active" : "Plano Pro ativo")
      : (currentLang === "en" ? "Subscribe Pro" : "Assinar Pro");
  }

  if (currentPlan === "pro" && currentPlanStatus === "active") {
    if (portfolioSection) portfolioSection.classList.remove("hidden");
    if (portfolioStatus) portfolioStatus.textContent = t("portfolioEnabled");
  } else {
    if (portfolioSection) portfolioSection.classList.add("hidden");
    if (portfolioStatus) portfolioStatus.textContent = t("portfolioLocked");
  }

  if (isUnlimitedAccessUser()) {
    updateUpgradeBanner({ visible: false });
  }
}

function renderFavorites() {
  const container = document.getElementById("favorites");
  if (!container) return;

  container.innerHTML = "";

  if (!currentUser) {
    container.innerHTML = `<span class="empty-favorites">${t("loginToSyncFavorites")}</span>`;
    syncActiveMarketButtons();
    return;
  }

  if (!(currentPlan === "starter" || currentPlan === "pro")) {
    container.innerHTML = `<span class="empty-favorites">${t("favoriteBlocked")}</span>`;
    syncActiveMarketButtons();
    return;
  }

  if (favorites.length === 0) {
    container.innerHTML = `<span class="empty-favorites">${t("noFavoritesYet")}</span>`;
    syncActiveMarketButtons();
    return;
  }

  favorites.forEach((symbol) => {
    const btn = document.createElement("button");
    btn.textContent = displaySymbol(symbol);
    btn.className = "watch-btn";
    btn.onclick = () => {
      if (symbolInput) symbolInput.value = displaySymbol(symbol);
      handleSearch();
    };
    container.appendChild(btn);
  });

  syncActiveMarketButtons();
  updateAnalysisControlButton();
}

async function syncFavoritesFromServer() {
  if (!currentUser) {
    favorites = [];
    renderFavorites();
    return;
  }

  try {
    const data = await fetchAuthJSON("/api/me/favorites");
    favorites = data.map((item) => item.symbol);
  } catch (error) {
    console.error("Falha ao carregar favoritos:", error);
  }
  
  renderFavorites();
  updateFavoriteButton();
}

async function toggleFavorite(symbol) {
  if (!currentUser) {
    await trackEvent("favorite_login_required", { symbol });
    setStatus(t("loginToSaveFav"));
    return;
  }

  if (!(currentPlan === "starter" || currentPlan === "pro")) {
    await trackEvent("favorite_blocked_plan", { symbol, plan: currentPlan, status: currentPlanStatus });
    await showSmartUpgrade("favorite", { symbol });
    setStatus(t("paidFavOnly"));
    return;
  }

  const normalized = normalizeSymbol(symbol);
  const exists = favorites.includes(normalized);

  if (exists) {
    await fetchAuthJSON(`/api/me/favorites/${normalized}`, { method: "DELETE" });
    favorites = favorites.filter((s) => s !== normalized);
  } else {
    await fetchAuthJSON("/api/me/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: normalized })
    });
    favorites.push(normalized);
  }

  renderFavorites();
  updateFavoriteButton();
}

function toChartTime(value) {
  if (!value) return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1000000000000 ? Math.floor(value / 1000) : value;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : Math.floor(parsed / 1000);
}

function buildCandlestickData(candles) {
  const times = Array.isArray(candles?.t) ? candles.t : [];
  const opens = Array.isArray(candles?.o) ? candles.o : [];
  const highs = Array.isArray(candles?.h) ? candles.h : [];
  const lows = Array.isArray(candles?.l) ? candles.l : [];
  const closes = Array.isArray(candles?.c) ? candles.c : [];

  const data = [];

  for (let i = 0; i < closes.length; i += 1) {
    const time = toChartTime(times[i] ?? i + 1);
    const open = Number(opens[i]);
    const high = Number(highs[i]);
    const low = Number(lows[i]);
    const close = Number(closes[i]);

    if (!time || [open, high, low, close].some((value) => !Number.isFinite(value))) {
      continue;
    }

    data.push({ time, open, high, low, close });
  }

  return data;
}

function buildCompareLineData(candles) {
  const times = Array.isArray(candles?.t) ? candles.t : [];
  const closes = Array.isArray(candles?.c) ? candles.c : [];

  const data = [];

  for (let i = 0; i < closes.length; i += 1) {
    const time = toChartTime(times[i] ?? i + 1);
    const value = Number(closes[i]);

    if (!time || !Number.isFinite(value)) {
      continue;
    }

    data.push({ time, value });
  }

  return data;
}


function getChartThemeMode() {
  return document.body.classList.contains("light-theme") ? "light" : "dark";
}

function getChartLocale() {
  return currentLang === "en" ? "en" : "pt_BR";
}

function getAnalysisControlButtonLabel() {
  return isAnalysisPaused ? `▶️ ${t("resumeAnalysis")}` : `⏸️ ${t("pauseAnalysis")}`;
}

function updateAnalysisControlButton() {
  const btn = document.getElementById("analysisPauseBtn");
  if (!btn) return;
  btn.textContent = getAnalysisControlButtonLabel();
  btn.dataset.state = isAnalysisPaused ? "paused" : "live";
  btn.classList.toggle("is-paused", isAnalysisPaused);
  btn.title = isAnalysisPaused ? t("analysisPaused") : t("analysisLive");
}

function ensureAnalysisControlButton() {
  if (!chartCard) return null;
  const header = chartCard.querySelector(".chart-header");
  if (!header) return null;

  let btn = document.getElementById("analysisPauseBtn");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "analysisPauseBtn";
    btn.type = "button";
    btn.className = "neutral-btn analysis-pause-btn";
    btn.style.minHeight = "auto";
    btn.style.padding = "8px 12px";
    btn.style.borderRadius = "999px";
    btn.style.marginLeft = "8px";
    btn.onclick = () => {
      isAnalysisPaused = !isAnalysisPaused;
      updateAnalysisControlButton();
      if (isAnalysisPaused) {
        setStatus(`⏸️ ${t("analysisPaused")}`);
      } else if (currentSymbol) {
        setStatus(`${t("updatedFor")} ${displaySymbol(currentSymbol)} • ${t("analysisLive")}.`);
      }
    };
    header.appendChild(btn);
  }

  updateAnalysisControlButton();
  return btn;
}

function hasTradingViewVisual() {
  const container = document.getElementById("tv-chart");
  if (!container) return false;
  bindChartInteractionGuards(container);
  return !!container.querySelector("iframe, div");
}

function resetTradingViewState() {
  tradingViewState = { symbol: "", interval: "", theme: "", locale: "", mode: "" };
}

function shouldReloadTradingView(symbol) {
  const nextState = {
    symbol: getTradingViewSymbol(symbol),
    interval: getTradingViewInterval(currentTimeframe),
    theme: getChartThemeMode(),
    locale: getChartLocale(),
    mode: "tradingview"
  };

  const changed = Object.keys(nextState).some((key) => nextState[key] !== tradingViewState[key]);
  return { changed, nextState };
}


function markChartInteraction() {
  lastChartInteractionAt = Date.now();
}

function isChartInteractionGuardActive() {
  return (Date.now() - lastChartInteractionAt) < CHART_INTERACTION_GUARD_MS;
}

function bindChartInteractionGuards(target) {
  if (!target || target.__chartInteractionGuardBound) return;
  const touch = () => markChartInteraction();
  ["mouseenter", "mousemove", "mousedown", "wheel", "touchstart", "touchmove"].forEach((eventName) => {
    target.addEventListener(eventName, touch, { passive: true });
  });
  target.__chartInteractionGuardBound = true;
}

function shouldRefreshChartOnSearch({ silentRefresh = false, compareModeActive = false, compareSymbol = "", baseSymbol = "" } = {}) {
  const normalizedBase = normalizeSymbol(baseSymbol || currentSymbol || symbolInput?.value || "");
  const normalizedCompare = compareModeActive ? normalizeSymbol(compareSymbol) : "";
  const compareChanged = lastRenderedCompareSymbol !== normalizedCompare;
  const baseChanged = lastRenderedBaseSymbol !== normalizedBase;
  const timeframeChanged = lastRenderedTimeframe !== currentTimeframe;
  const nextMode = compareModeActive ? "compare" : "tradingview";
  const modeChanged = tradingViewState.mode !== nextMode;

  if (compareModeActive) {
    const shouldReloadCompare = baseChanged || timeframeChanged || compareChanged || modeChanged || !tradingChart;
    return {
      reload: shouldReloadCompare,
      compareKey: normalizedCompare,
      baseKey: normalizedBase,
      timeframeKey: currentTimeframe,
      mode: nextMode,
      forceReload: shouldReloadCompare
    };
  }

  const { changed } = shouldReloadTradingView(normalizedBase || currentSymbol || symbolInput?.value || "AAPL");
  const missingVisual = !hasTradingViewVisual();
  const structuralChange = baseChanged || timeframeChanged || compareChanged || modeChanged || changed || missingVisual;

  if (silentRefresh) {
    if (isAnalysisPaused || isChartInteractionGuardActive()) {
      return {
        reload: false,
        compareKey: "",
        baseKey: normalizedBase,
        timeframeKey: currentTimeframe,
        mode: nextMode,
        forceReload: false
      };
    }

    return {
      reload: structuralChange,
      compareKey: "",
      baseKey: normalizedBase,
      timeframeKey: currentTimeframe,
      mode: nextMode,
      forceReload: false
    };
  }

  return {
    reload: structuralChange,
    compareKey: "",
    baseKey: normalizedBase,
    timeframeKey: currentTimeframe,
    mode: nextMode,
    forceReload: false
  };
}

function getTradingViewInterval(timeframe = currentTimeframe) {
  const intervalMap = {
    "1D": "5",
    "5D": "30",
    "1M": "60",
    "3M": "D",
    "1Y": "W"
  };

  return intervalMap[timeframe] || "30";
}

function getTradingViewSymbol(rawSymbol = "") {
  const normalized = normalizeSymbol(rawSymbol).replace(".SA", "");
  if (!normalized) return "AAPL";

  if (/^[A-Z]{4}\d$/.test(normalized)) {
    return `BMFBOVESPA:${normalized}`;
  }

  return normalized;
}

function loadTradingViewChart(symbol = currentSymbol || symbolInput?.value || "AAPL", options = {}) {
  if (!chart || typeof window.TradingView === "undefined") return false;

  ensureAnalysisControlButton();

  const { changed, nextState } = shouldReloadTradingView(symbol);
  const forceReload = !!options.forceReload;
  const hasVisual = hasTradingViewVisual();

  if (!forceReload && !changed && hasVisual) {
    tradingViewState = nextState;
    return true;
  }

  if (tradingChartResizeObserver) {
    tradingChartResizeObserver.disconnect();
    tradingChartResizeObserver = null;
  }

  if (tradingChart && typeof tradingChart.remove === "function") {
    try {
      tradingChart.remove();
    } catch (e) {}
  }
  tradingChart = null;

  chart.innerHTML = '<div id="tv-chart" class="tv-chart-container" style="width:100%;height:500px;"></div>';;

  const container = document.getElementById("tv-chart");
  if (!container) return false;
  bindChartInteractionGuards(container);

  try {
    tradingChart = new TradingView.widget({
      autosize: true,
      symbol: nextState.symbol,
      interval: nextState.interval,
      timezone: "America/Sao_Paulo",
      theme: nextState.theme,
      style: "1",
      locale: nextState.locale,
      toolbar_bg: nextState.theme === "light" ? "#ffffff" : "#0f172a",
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      withdateranges: true,
      details: false,
      calendar: false,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      studies: [
        "RSI@tv-basicstudies",
        "MACD@tv-basicstudies"
      ],
      container_id: "tv-chart"
    });

    tradingViewState = nextState;
    return true;
  } catch (error) {
    console.error("Falha ao carregar TradingView:", error.message);
    return false;
  }
}

function drawChart(candles, compareCandles = null, options = {}) {
  if (!chart) return;

  const shouldUseTradingView = !compareCandles && Array.isArray(candles?.c) && candles.c.length >= 2;
  if (shouldUseTradingView) {
    const loaded = loadTradingViewChart(currentSymbol || symbolInput?.value || "AAPL", options);
    if (loaded) return;
  }

  if (tradingChartResizeObserver) {
    tradingChartResizeObserver.disconnect();
    tradingChartResizeObserver = null;
  }

  if (tradingChart) {
    try {
      tradingChart.remove();
    } catch (e) {}
    tradingChart = null;
  }

  chart.innerHTML = "";
  resetTradingViewState();

  const candleData = buildCandlestickData(candles);

  if (candleData.length < 2) {
    chart.innerHTML = `<div class="chart-empty-state">${t("noChartData")}</div>`;
    return;
  }

  if (typeof LightweightCharts === "undefined") {
    console.error("LightweightCharts não carregado.");
    chart.innerHTML = `<div class="chart-empty-state">${t("noChartData")}</div>`;
    return;
  }

  const chartContainer = document.createElement("div");
  chartContainer.className = "tv-chart-container";
  chart.appendChild(chartContainer);
  bindChartInteractionGuards(chartContainer);

  requestAnimationFrame(() => {
    if (!chartContainer.parentNode) return;

    const isLightTheme = document.body.classList.contains("light-theme");
    const containerWidth = Math.max(chartContainer.clientWidth || chart.clientWidth || 800, 320);
    const containerHeight = chartContainer.clientHeight || 380;

    try {
      tradingChart = LightweightCharts.createChart(chartContainer, {
        width: containerWidth,
        height: containerHeight,
        layout: {
          background: { color: "transparent" },
          textColor: isLightTheme ? "#334155" : "#d1d5db"
        },
        grid: {
          vertLines: { color: isLightTheme ? "#e2e8f0" : "#1e293b" },
          horzLines: { color: isLightTheme ? "#e2e8f0" : "#1e293b" }
        },
        crosshair: {
          mode: LightweightCharts.CrosshairMode.Normal
        },
        rightPriceScale: {
          borderColor: isLightTheme ? "#cbd5e1" : "#334155",
          scaleMargins: { top: 0.12, bottom: 0.12 }
        },
        leftPriceScale: {
          visible: false
        },
        timeScale: {
          borderColor: isLightTheme ? "#cbd5e1" : "#334155",
          timeVisible: true,
          secondsVisible: false
        },
        handleScroll: true,
        handleScale: true
      });

      const candleSeriesOptions = {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
        lastValueVisible: true,
        priceLineVisible: true
      };

      const candleSeries = typeof tradingChart.addCandlestickSeries === "function"
        ? tradingChart.addCandlestickSeries(candleSeriesOptions)
        : tradingChart.addSeries(LightweightCharts.CandlestickSeries, candleSeriesOptions);

      candleSeries.setData(candleData);

      let compareSeries = null;
      const compareData = buildCompareLineData(compareCandles);

      if (compareData.length > 1) {
        const compareSeriesOptions = {
          color: "#3b82f6",
          lineWidth: 2,
          lineStyle: LightweightCharts.LineStyle.Dotted,
          crosshairMarkerVisible: true,
          priceLineVisible: false,
          lastValueVisible: true
        };

        compareSeries = typeof tradingChart.addLineSeries === "function"
          ? tradingChart.addLineSeries(compareSeriesOptions)
          : tradingChart.addSeries(LightweightCharts.LineSeries, compareSeriesOptions);

        compareSeries.setData(compareData);
      }

      tradingChart.timeScale().fitContent();

      const toolTip = document.createElement("div");
      toolTip.className = "chart-tooltip";
      chartContainer.appendChild(toolTip);

      tradingChart.subscribeCrosshairMove((param) => {
        if (!param || !param.point || param.point.x < 0 || param.point.y < 0) {
          toolTip.style.display = "none";
          syncInstitutionalHover(null);
          return;
        }

        const candlePoint = param.seriesData?.get(candleSeries);
        const open = Number(candlePoint?.open);
        const high = Number(candlePoint?.high);
        const low = Number(candlePoint?.low);
        const close = Number(candlePoint?.close);

        if ([open, high, low, close].some((value) => !Number.isFinite(value))) {
          toolTip.style.display = "none";
          syncInstitutionalHover(null);
          return;
        }

        let compareHtml = "";
        if (compareSeries) {
          const comparePoint = param.seriesData?.get(compareSeries);
          const compareValue = typeof comparePoint?.value !== "undefined" ? Number(comparePoint.value) : Number(comparePoint);
          if (Number.isFinite(compareValue)) {
            compareHtml = `<div><strong>${t("chartTypeCompare")}:</strong> ${formatPrice(compareValue)}</div>`;
          }
        }

        syncInstitutionalHover({ open, high, low, close });

        toolTip.style.display = "block";
        toolTip.style.left = `${param.point.x + 12}px`;
        toolTip.style.top = `${Math.max(param.point.y - 70, 8)}px`;
        toolTip.innerHTML = `
          <div class="chart-tooltip-title">${t("chartTypeCandle")}</div>
          <div><strong>O:</strong> ${formatPrice(open)}</div>
          <div><strong>H:</strong> ${formatPrice(high)}</div>
          <div><strong>L:</strong> ${formatPrice(low)}</div>
          <div><strong>C:</strong> ${formatPrice(close)}</div>
          ${compareHtml}
        `;
      });

      tradingChartResizeObserver = new ResizeObserver(() => {
        if (!tradingChart || !chartContainer?.clientWidth) return;
        tradingChart.applyOptions({
          width: Math.max(chartContainer.clientWidth, 320),
          height: chartContainer.clientHeight || 380
        });
        tradingChart.timeScale().fitContent();
      });

      tradingChartResizeObserver.observe(chartContainer);
    } catch (err) {
      console.error("Erro ao criar gráfico:", err);
      chartContainer.innerHTML = `<div class="chart-empty-state">${t("noChartData")}</div>`;
    }
  });
}

function renderNews(items) {
  if (!newsList) return;
  newsList.innerHTML = "";

  if (!items || !items.length) {
    newsList.innerHTML = `<div class="news-item">${t("noRecentNews")}</div>`;
    return;
  }

  items.forEach((item) => {
    const div = document.createElement("a");
    div.className = "news-item";
    div.href = item.url || "#";
    div.target = "_blank";
    div.rel = "noopener noreferrer";

    const headline = escapeHtml(item.headline || "News");
    const summary = escapeHtml(item.summary || "");

    div.innerHTML = `
      <strong>${headline}</strong>
      <p>${summary}</p>
    `;
    newsList.appendChild(div);
  });
}

function formatSignedPercent(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0.00%";
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
}

function getAnalysisHistoryKey() {
  return "analysis_history_cache_v2";
}

function getAnalysisHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(getAnalysisHistoryKey()) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveAnalysisSnapshot(snapshot) {
  if (!snapshot?.symbol) return;
  const current = getAnalysisHistory().filter((item) => item?.symbol !== snapshot.symbol);
  current.unshift(snapshot);
  localStorage.setItem(getAnalysisHistoryKey(), JSON.stringify(current.slice(0, 16)));
}

function scoreNewsTone(items = []) {
  const positiveTerms = ["beat", "beats", "surge", "growth", "upgrade", "record", "strong", "jump", "partnership", "profit"];
  const negativeTerms = ["miss", "falls", "drop", "lawsuit", "downgrade", "weak", "cut", "risk", "loss", "probe"];
  let score = 0;

  items.slice(0, 6).forEach((item) => {
    const text = `${item?.headline || ""} ${item?.summary || ""}`.toLowerCase();
    positiveTerms.forEach((term) => { if (text.includes(term)) score += 1; });
    negativeTerms.forEach((term) => { if (text.includes(term)) score -= 1; });
  });

  if (score >= 2) return currentLang === "en" ? "Positive flow" : "Fluxo positivo";
  if (score <= -2) return currentLang === "en" ? "Caution in news" : "Cautela nas notícias";
  return currentLang === "en" ? "Neutral flow" : "Fluxo neutro";
}

function buildAnalysisSnapshot(symbol, quote, candles, news = [], profile = {}) {
  const series = Array.isArray(candles?.c)
    ? candles.c.map((value) => Number(value)).filter((value) => !Number.isNaN(value))
    : [];
  const validHighs = Array.isArray(candles?.h)
    ? candles.h.map((value) => Number(value)).filter((value) => !Number.isNaN(value))
    : [];
  const validLows = Array.isArray(candles?.l)
    ? candles.l.map((value) => Number(value)).filter((value) => !Number.isNaN(value))
    : [];
  const validOpens = Array.isArray(candles?.o)
    ? candles.o.map((value) => Number(value)).filter((value) => !Number.isNaN(value))
    : [];
  const validVolumes = Array.isArray(candles?.v)
    ? candles.v.map((value) => Number(value)).filter((value) => !Number.isNaN(value) && value >= 0)
    : [];

  const last = Number(quote?.c ?? series[series.length - 1] ?? 0);
  const first = Number(series[0] ?? quote?.pc ?? last);
  const changePercent = Number(quote?.dp ?? ((last && first) ? (((last - first) / first) * 100) : 0));
  const trendBySeries = series.length >= 3
    ? ((series[series.length - 1] - series[0]) >= 0 ? "up" : "down")
    : (changePercent >= 0 ? "up" : "down");

  const amplitude = series.length
    ? Math.max(...series) - Math.min(...series)
    : Math.abs(Number(quote?.h || 0) - Number(quote?.l || 0));
  const volatilityPercent = last > 0 ? (amplitude / last) * 100 : 0;

  const supportBase = validLows.length ? Math.min(...validLows.slice(-8)) : Number(quote?.l || last || 0);
  const resistanceBase = validHighs.length ? Math.max(...validHighs.slice(-8)) : Number(quote?.h || last || 0);
  const distanceToSupport = last > 0 ? ((last - supportBase) / last) * 100 : 0;
  const distanceToResistance = last > 0 ? ((resistanceBase - last) / last) * 100 : 0;

  let strength = currentLang === "en" ? "Balanced" : "Equilibrada";
  if (Math.abs(changePercent) >= 3 || volatilityPercent >= 6) strength = currentLang === "en" ? "Strong" : "Forte";
  else if (Math.abs(changePercent) >= 1.2 || volatilityPercent >= 3) strength = currentLang === "en" ? "Moderate" : "Moderada";

  let setup = currentLang === "en" ? "Neutral timing" : "Timing neutro";
  if (distanceToSupport <= 2 && trendBySeries === "up") setup = currentLang === "en" ? "Near support" : "Próximo do suporte";
  else if (distanceToResistance <= 2 && trendBySeries === "up") setup = currentLang === "en" ? "Testing resistance" : "Testando resistência";
  else if (distanceToSupport <= 2 && trendBySeries === "down") setup = currentLang === "en" ? "Watching reaction zone" : "Monitorar reação";
  else if (distanceToResistance <= 2 && trendBySeries === "down") setup = currentLang === "en" ? "Stretched move" : "Movimento esticado";

  const trendLabel = trendBySeries === "up"
    ? (currentLang === "en" ? "Bullish bias" : "Viés de alta")
    : (currentLang === "en" ? "Bearish bias" : "Viés de baixa");

  const signalLabel = changePercent >= 0
    ? (currentLang === "en" ? "Buyers in control" : "Compradores no controle")
    : (currentLang === "en" ? "Sellers pressing" : "Vendedores pressionando");

  const recentSeries = series.slice(-6);
  const recentOpens = validOpens.slice(-6);
  const recentHighs = validHighs.slice(-6);
  const recentLows = validLows.slice(-6);
  const recentVolumes = validVolumes.slice(-6);

  let candleBodyStrength = 0;
  let bullishCandles = 0;
  let bearishCandles = 0;

  for (let i = 0; i < recentSeries.length; i += 1) {
    const close = Number(recentSeries[i]);
    const open = Number(recentOpens[i] ?? close);
    const high = Number(recentHighs[i] ?? Math.max(open, close));
    const low = Number(recentLows[i] ?? Math.min(open, close));
    const range = Math.max(high - low, 0.0001);
    const bodyRatio = Math.min(Math.abs(close - open) / range, 1);
    candleBodyStrength += bodyRatio;
    if (close >= open) bullishCandles += 1;
    else bearishCandles += 1;
  }

  const bodyStrengthPercent = recentSeries.length
    ? Math.min(100, Math.round((candleBodyStrength / recentSeries.length) * 100))
    : 50;

  const avgRecentVolume = recentVolumes.length
    ? recentVolumes.reduce((sum, value) => sum + value, 0) / recentVolumes.length
    : 0;
  const maxRecentVolume = recentVolumes.length ? Math.max(...recentVolumes) : 0;
  const volumeScore = maxRecentVolume > 0
    ? Math.min(100, Math.round((avgRecentVolume / maxRecentVolume) * 100))
    : 50;

  const positiveMoveScore = Math.max(0, Math.min(100, 50 + (changePercent * 8)));
  const negativeMoveScore = Math.max(0, Math.min(100, 50 + ((-changePercent) * 8)));
  const trendBiasScore = trendBySeries === "up"
    ? Math.min(100, 55 + bullishCandles * 7)
    : Math.min(100, 55 + bearishCandles * 7);

  const buyScoreRaw = (positiveMoveScore * 0.42) + (bodyStrengthPercent * 0.22) + (trendBiasScore * 0.22) + (volumeScore * 0.14);
  const sellScoreRaw = (negativeMoveScore * 0.42) + (bodyStrengthPercent * 0.18) + ((100 - trendBiasScore) * 0.24) + (volumeScore * 0.16);

  const buyScore = Math.max(0, Math.min(100, Math.round(buyScoreRaw)));
  const sellScore = Math.max(0, Math.min(100, Math.round(sellScoreRaw)));
  const hotScore = Math.max(0, Math.min(100, Math.round((Math.abs(changePercent) * 10) + (volatilityPercent * 4) + (bodyStrengthPercent * 0.35) + (volumeScore * 0.2))));

  let score = 50;
  score += trendBySeries === "up" ? 12 : -12;
  score += Math.max(-18, Math.min(18, changePercent * 4));
  score += bullishCandles * 3;
  score -= bearishCandles * 2;
  score += bodyStrengthPercent >= 60 ? 8 : bodyStrengthPercent >= 45 ? 3 : -3;
  score += distanceToSupport <= 2.2 ? 8 : 0;
  score -= distanceToResistance <= 1.4 ? 6 : 0;
  score += volumeScore >= 60 ? 4 : 0;
  score -= volatilityPercent >= 9 ? 6 : 0;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let decision = currentLang === "en" ? "Wait" : "Esperar";
  if (score >= 70) decision = currentLang === "en" ? "Good opportunity" : "Boa oportunidade";
  else if (score <= 39) decision = currentLang === "en" ? "Avoid" : "Evitar";

  let readingLine = currentLang === "en"
    ? "Balanced market reading"
    : "Leitura equilibrada do mercado";

  if (score >= 78 && trendBySeries === "up") {
    readingLine = currentLang === "en"
      ? "Strong bullish continuation"
      : "Continuação forte da alta";
  } else if (score >= 66 && trendBySeries === "up") {
    readingLine = currentLang === "en"
      ? "Buyers gaining control"
      : "Compradores ganhando controle";
  } else if (score <= 35 && trendBySeries === "down") {
    readingLine = currentLang === "en"
      ? "Selling pressure dominating"
      : "Pressão vendedora dominando";
  } else if (score <= 45 && trendBySeries === "down") {
    readingLine = currentLang === "en"
      ? "Momentum weakening"
      : "Momentum enfraquecendo";
  } else if (distanceToResistance <= 1.4) {
    readingLine = currentLang === "en"
      ? "Price testing resistance"
      : "Preço testando resistência";
  } else if (distanceToSupport <= 2.2) {
    readingLine = currentLang === "en"
      ? "Price near support"
      : "Preço perto do suporte";
  }

  return {
    symbol: displaySymbol(symbol),
    companyName: profile?.name || displaySymbol(symbol),
    price: last,
    changePercent,
    trend: trendBySeries,
    trendLabel,
    strength,
    setup,
    signalLabel,
    support: Number(supportBase || 0),
    resistance: Number(resistanceBase || 0),
    volatilityPercent,
    buyScore,
    sellScore,
    hotScore,
    score,
    decision,
    readingLine,
    bodyStrengthPercent,
    volumeScore,
    newsTone: scoreNewsTone(news),
    sourceLabel: getQuoteSourceLabel(quote),
    fetchedAt: Date.now()
  };
}

function renderSmartPremiumPanel(snapshot = latestAnalysisSnapshot) {
  const panel = document.querySelector(".analysis-hero-right");
  if (!panel) return;

  if (!snapshot) {
    resetSmartPremiumPanel();
    return;
  }

  panel.innerHTML = `
    <span class="analysis-hero-caption">${currentLang === "en" ? "Intelligent reading" : "Leitura inteligente"}</span>
    <span class="analysis-hero-subcaption">${snapshot.readingLine}</span>
    <span class="analysis-hero-subcaption">${snapshot.trendLabel} • ${snapshot.strength} • ${snapshot.newsTone}</span>
    <span class="analysis-hero-subcaption">${currentLang === "en" ? "Score" : "Score"}: ${snapshot.score}/100 • ${snapshot.decision}</span>
    <span class="analysis-hero-subcaption">${currentLang === "en" ? "Support" : "Suporte"}: ${formatPrice(snapshot.support)} • ${currentLang === "en" ? "Resistance" : "Resistência"}: ${formatPrice(snapshot.resistance)}</span>
  `;
}


function updateMarketSignalCard(snapshot = latestAnalysisSnapshot) {
  const card = document.getElementById("marketSignalCard");
  if (!card) return;

  const symbolEl = card.querySelector(".market-signal-symbol");
  const labelEl = document.getElementById("marketSignalLabel");
  const textEl = document.getElementById("marketSignalText");
  const warningEl = document.getElementById("marketSignalWarning");
  const btnEl = document.getElementById("signalUpgradeBtn");

  if (!snapshot) {
    if (symbolEl) symbolEl.textContent = currentLang === "en" ? "Waiting for asset" : "Aguardando ativo";
    if (labelEl) {
      labelEl.textContent = currentLang === "en" ? "Waiting for reading" : "Aguardando leitura";
      labelEl.className = "market-signal-label neutral";
    }
    if (textEl) textEl.textContent = currentLang === "en"
      ? "Run an analysis to unlock the signal, live chart and fast asset reading."
      : "Faça uma análise para liberar o sinal, o gráfico ao vivo e a leitura rápida do ativo.";
    if (warningEl) warningEl.textContent = isUnlimitedAccessUser()
      ? (currentLang === "en"
          ? "Admin / Pro mode active. Advanced monitoring enabled."
          : "Modo admin / Pro ativo. Monitoramento avançado habilitado.")
      : (currentLang === "en"
          ? "See the value first. Unlock the advanced features when it makes sense."
          : "Veja o valor primeiro. Desbloqueie os recursos avançados quando fizer sentido.");
    if (btnEl) {
      if (isUnlimitedAccessUser()) {
        btnEl.style.display = "none";
        btnEl.disabled = true;
        btnEl.onclick = null;
      } else {
        btnEl.style.display = "inline-flex";
        btnEl.disabled = false;
        btnEl.textContent = currentPlan === "starter" && currentPlanStatus === "active"
          ? (currentLang === "en" ? "Upgrade to Pro" : "Fazer upgrade para Pro")
          : (currentLang === "en" ? "Unlock unlimited analyses now" : "Liberar análises ilimitadas agora");
        btnEl.onclick = () => openUpgrade("pro");
      }
    }
    return;
  }

  const decision = String(snapshot.decision || "").toLowerCase();
  const trend = String(snapshot.trend || "").toLowerCase();
  let tone = "neutral";
  let label = currentLang === "en" ? "Neutral signal" : "Sinal neutro";
  let text = currentLang === "en"
    ? "The market is asking for more confirmation before a stronger move."
    : "O mercado pede mais confirmação antes de um movimento mais forte.";

  if (decision.includes("compra") || decision.includes("buy") || trend === "up") {
    tone = "buy";
    label = currentLang === "en" ? "🟢 STRONG BUY NOW" : "🟢 COMPRA FORTE AGORA";
    text = currentLang === "en"
      ? "Suggested entry based on trend, volume and momentum."
      : "Entrada sugerida baseada em tendência, volume e momentum.";
  } else if (decision.includes("venda") || decision.includes("sell") || trend === "down") {
    tone = "sell";
    label = currentLang === "en" ? "🔴 SELL / REDUCE NOW" : "🔴 VENDA / REDUZA AGORA";
    text = currentLang === "en"
      ? "Pressure is stronger on the selling side. Extra caution is recommended."
      : "A pressão está mais forte do lado vendedor. Atenção redobrada agora.";
  }

  if (symbolEl) symbolEl.textContent = `${snapshot.symbol} • ${currentLang === "en" ? "Score" : "Score"} ${snapshot.score}/100`;
  if (labelEl) {
    labelEl.textContent = label;
    labelEl.className = `market-signal-label ${tone}`;
  }
  if (textEl) textEl.textContent = text;
  if (warningEl) warningEl.textContent = currentLang === "en"
    ? "You may miss this opportunity if you wait too long."
    : "⚠️ Você pode perder essa oportunidade se esperar.";
  if (btnEl) {
    if (isUnlimitedAccessUser()) {
      btnEl.style.display = "none";
      btnEl.disabled = true;
      btnEl.onclick = null;
    } else {
      btnEl.style.display = "inline-flex";
      btnEl.disabled = false;
      btnEl.textContent = currentPlan === "starter" && currentPlanStatus === "active"
        ? (currentLang === "en" ? "Upgrade to Pro" : "Fazer upgrade para Pro")
        : (currentLang === "en" ? "Unlock unlimited analyses now" : "Liberar análises ilimitadas agora");
      btnEl.onclick = () => openUpgrade("pro");
    }
  }
}

function renderOverview(quote, snapshot = latestAnalysisSnapshot) {
  if (!marketOverview) return;

  const smartCards = snapshot
    ? `
      <div class="mini-card market-hero-card">
        <span class="symbol">${snapshot.symbol}</span>
        <strong class="price">${formatPrice(quote?.c)}</strong>
        <span class="change">${snapshot.sourceLabel}</span>
      </div>
      <div class="mini-card">
        <span>${currentLang === "en" ? "Trend" : "Tendência"}</span>
        <strong>${snapshot.trendLabel}</strong>
        <small>${snapshot.signalLabel}</small>
      </div>
      <div class="mini-card">
        <span>${currentLang === "en" ? "Key zones" : "Zonas-chave"}</span>
        <strong>${formatPrice(snapshot.support)} • ${formatPrice(snapshot.resistance)}</strong>
        <small>${snapshot.setup}</small>
      </div>
      <div class="mini-card">
        <span>${currentLang === "en" ? "Timing" : "Timing"}</span>
        <strong>${snapshot.strength}</strong>
        <small>${snapshot.newsTone}</small>
      </div>
      <div class="mini-card">
        <span>${currentLang === "en" ? "Score" : "Score"}</span>
        <strong>${snapshot.score}/100</strong>
        <small>${snapshot.decision}</small>
      </div>
    `
    : `
      <div class="mini-card market-hero-card">
        <span class="symbol">${displaySymbol(currentSymbol)}</span>
        <strong class="price">${formatPrice(quote?.c)}</strong>
        <span class="change">${getQuoteSourceLabel(quote)}</span>
      </div>
    `;

  marketOverview.innerHTML = smartCards;
  updateAnalysisHero(quote, currentSymbol);
  renderSmartPremiumPanel(snapshot);
  updateMarketSignalCard(snapshot);
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightSuggestion(text, query) {
  const safeText = escapeHtml(text || "");
  const normalizedQuery = String(query || "").trim();

  if (!normalizedQuery) return safeText;

  try {
    const regex = new RegExp(`(${escapeRegExp(normalizedQuery)})`, "ig");
    return safeText.replace(regex, "<mark>$1</mark>");
  } catch {
    return safeText;
  }
}

function getSuggestionsElements(kind = "symbol") {
  return kind === "compare"
    ? { input: compareInput, box: compareSuggestions }
    : { input: symbolInput, box: symbolSuggestions };
}

function hideSuggestionBox(kind = "symbol") {
  const { box } = getSuggestionsElements(kind);
  if (!box) return;
  box.classList.add("hidden");
  box.innerHTML = "";
  if (activeSuggestionField === kind) {
    activeSuggestionField = null;
    activeSuggestionIndex = -1;
  }
}

function hideAllSuggestionBoxes() {
  hideSuggestionBox("symbol");
  hideSuggestionBox("compare");
}

function setSearchHint(message = "") {
  if (!searchHint) return;
  searchHint.textContent = message || t("searchHint");
}

function renderSuggestionBox(kind, items, query) {
  const { box } = getSuggestionsElements(kind);
  if (!box) return;

  if (!Array.isArray(items) || !items.length) {
    box.innerHTML = `<div class="autocomplete-empty">${t("suggestionsEmpty")}</div>`;
    box.classList.remove("hidden");
    activeSuggestionField = kind;
    activeSuggestionIndex = -1;
    return;
  }

  box.innerHTML = items.map((item, index) => {
    const badge = index === 0 ? `<span class="autocomplete-badge">${t("autocompleteTopMatch")}</span>` : "";
    const description = item.description || item.displaySymbol || item.symbol;
    const metaParts = [item.exchange, item.type].filter(Boolean);

    return `
      <button type="button" class="autocomplete-item${index === activeSuggestionIndex && activeSuggestionField === kind ? " is-active" : ""}" data-kind="${kind}" data-index="${index}" aria-label="${escapeHtml(item.symbol)} ${escapeHtml(description)}">
        <span class="autocomplete-top-row">
          <span class="autocomplete-symbol-wrap">
            <span class="autocomplete-symbol">${highlightSuggestion(item.symbol, query)}</span>
            ${badge}
          </span>
          <span class="autocomplete-meta">${escapeHtml(metaParts.join(" • "))}</span>
        </span>
        <span class="autocomplete-name">${highlightSuggestion(description, query)}</span>
      </button>
    `;
  }).join("");

  box.classList.remove("hidden");
  activeSuggestionField = kind;

  box.querySelectorAll(".autocomplete-item").forEach((itemEl) => {
    itemEl.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const index = Number(itemEl.dataset.index);
      chooseSuggestion(kind, index);
    });
  });
}

function applyActiveSuggestion(kind, step) {
  const items = kind === "compare" ? latestCompareSuggestions : latestSymbolSuggestions;
  if (!items.length) return false;

  activeSuggestionField = kind;
  activeSuggestionIndex = activeSuggestionIndex < 0
    ? 0
    : (activeSuggestionIndex + step + items.length) % items.length;

  renderSuggestionBox(kind, items, kind === "compare" ? compareInput?.value : symbolInput?.value);
  return true;
}

function chooseSuggestion(kind, index) {
  const items = kind === "compare" ? latestCompareSuggestions : latestSymbolSuggestions;
  const selected = items[index];
  const { input } = getSuggestionsElements(kind);

  if (!selected || !input) return;

  input.value = selected.displaySymbol || selected.symbol;
  hideSuggestionBox(kind);

  const hintParts = [selected.symbol, selected.description || selected.displaySymbol || selected.symbol, selected.exchange].filter(Boolean);
  if (kind === "symbol") {
    setSearchHint(hintParts.join(" • "));
  }

  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function setSuggestionsForKind(kind, items) {
  if (kind === "compare") {
    latestCompareSuggestions = items;
  } else {
    latestSymbolSuggestions = items;
  }
}

async function fetchSymbolSuggestions(query) {
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery) return [];

  const cacheKey = normalizedQuery.toUpperCase();
  const cached = autocompleteCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 3 * 60 * 1000) {
    return cached.items;
  }

  const data = await fetchJSON(`/api/symbol-search?q=${encodeURIComponent(normalizedQuery)}`);
  const items = Array.isArray(data) ? data : [];
  autocompleteCache.set(cacheKey, { items, ts: Date.now() });
  return items;
}

async function loadSuggestions(kind, query) {
  const trimmedQuery = String(query || "").trim();

  if (!trimmedQuery) {
    hideSuggestionBox(kind);
    if (kind === "symbol") setSearchHint();
    return;
  }

  const { box } = getSuggestionsElements(kind);
  if (box) {
    box.innerHTML = `<div class="autocomplete-empty">${t("searchingLabel")}</div>`;
    box.classList.remove("hidden");
  }

  try {
    const items = await fetchSymbolSuggestions(trimmedQuery);
    setSuggestionsForKind(kind, items);
    activeSuggestionIndex = items.length ? 0 : -1;
    renderSuggestionBox(kind, items, trimmedQuery);

    if (kind === "symbol") {
      setSearchHint(items.length ? t("suggestionPick") : t("suggestionsEmpty"));
    }
  } catch (error) {
    console.error("Erro nas sugestões:", error.message);
    hideSuggestionBox(kind);
  }
}

function bindAutocompleteInput(kind = "symbol") {
  const { input } = getSuggestionsElements(kind);
  if (!input) return;

  input.addEventListener("input", () => {
    const value = input.value;
    if (kind === "symbol") {
      setSearchHint(value ? `${t("searchHint")} • ${value.toUpperCase()}` : t("searchHint"));
    }

    const timerRef = kind === "compare" ? compareSearchDebounce : symbolSearchDebounce;
    if (timerRef) clearTimeout(timerRef);

    const nextTimer = setTimeout(() => {
      loadSuggestions(kind, value);
    }, 180);

    if (kind === "compare") {
      compareSearchDebounce = nextTimer;
    } else {
      symbolSearchDebounce = nextTimer;
    }
  });

  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      loadSuggestions(kind, input.value);
    }
  });

  input.addEventListener("blur", () => {
    setTimeout(() => hideSuggestionBox(kind), 120);
  });

  input.addEventListener("keydown", (event) => {
    const isCurrentField = activeSuggestionField === kind;
    const hasSuggestions = (kind === "compare" ? latestCompareSuggestions : latestSymbolSuggestions).length > 0;

    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && hasSuggestions) {
      event.preventDefault();
      applyActiveSuggestion(kind, event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if ((event.key === "Enter" || event.key === "Tab") && isCurrentField && activeSuggestionIndex >= 0) {
      event.preventDefault();
      chooseSuggestion(kind, activeSuggestionIndex);
      return;
    }

    if (event.key === "Escape") {
      hideSuggestionBox(kind);
    }
  });
}

function buildPreviewQuoteFromCandles(candles = {}, existingQuote = {}) {
  const closes = Array.isArray(candles?.c) ? candles.c.map((value) => Number(value)).filter((value) => Number.isFinite(value)) : [];
  const opens = Array.isArray(candles?.o) ? candles.o.map((value) => Number(value)).filter((value) => Number.isFinite(value)) : [];
  const highs = Array.isArray(candles?.h) ? candles.h.map((value) => Number(value)).filter((value) => Number.isFinite(value)) : [];
  const lows = Array.isArray(candles?.l) ? candles.l.map((value) => Number(value)).filter((value) => Number.isFinite(value)) : [];

  const close = closes.length ? closes[closes.length - 1] : Number(existingQuote?.c);
  const previousClose = closes.length > 1
    ? closes[closes.length - 2]
    : Number(existingQuote?.pc ?? close);
  const open = opens.length ? opens[opens.length - 1] : Number(existingQuote?.o ?? close);
  const high = highs.length ? highs[highs.length - 1] : Number(existingQuote?.h ?? close);
  const low = lows.length ? lows[lows.length - 1] : Number(existingQuote?.l ?? close);
  const change = Number.isFinite(close) && Number.isFinite(previousClose) ? close - previousClose : 0;
  const changePercent = Number.isFinite(close) && Number.isFinite(previousClose) && previousClose !== 0
    ? (change / previousClose) * 100
    : 0;

  return {
    c: Number.isFinite(close) ? close : null,
    d: Number.isFinite(change) ? change : 0,
    dp: Number.isFinite(changePercent) ? changePercent : 0,
    h: Number.isFinite(high) ? high : null,
    l: Number.isFinite(low) ? low : null,
    o: Number.isFinite(open) ? open : null,
    pc: Number.isFinite(previousClose) ? previousClose : null,
    source: existingQuote?.source || "preview",
    previewOnly: true
  };
}

async function handleSearch(silentRefresh = false) {
  if (isSearchingNow) return;
  const symbol = normalizeSymbol(symbolInput?.value);
  const compareSymbol = normalizeSymbol(compareInput?.value);

  if (!symbol) {
    setStatus(t("enterValidTicker"));
    return;
  }

  const isVisitor = !currentUser;

  if (isVisitor) {
    currentPlan = "free";
    currentPlanStatus = "inactive";
    updatePlanUI();
  }

  const usageBefore = await refreshUsage();
  const limitReached = usageBefore && usageBefore.limit !== "∞" && Number(usageBefore.remaining) <= 0;
  const allowPreviewMode = limitReached && canUsePreviewAfterLimit(symbol, { silentRefresh });

  if (limitReached && !allowPreviewMode) {
    await trackEvent("daily_limit_reached", {
      symbol,
      plan: currentPlan,
      status: currentPlanStatus,
      remaining: usageBefore.remaining,
      locked_preview_symbol: getPreviewLockedSymbol(symbol)
    });
    await showSmartUpgrade("limit", { symbol, remaining: usageBefore.remaining });
    const lockedSymbolLabel = displaySymbol(getPreviewLockedSymbol(symbol));
    setStatus(currentLang === "en"
      ? `🚫 Limit reached today. Keep the ${lockedSymbolLabel} chart visible and upgrade to analyze new assets.`
      : `🚫 Limite atingido hoje. Mantenha o gráfico de ${lockedSymbolLabel} visível e faça upgrade para analisar novos ativos.`);
    if (searchBtn) {
      searchBtn.disabled = false;
      searchBtn.style.opacity = "1";
    }
    return;
  }

  currentSymbol = symbol;
  updateFavoriteButton();

  if (isSearchingNow) return;

  const requestId = ++activeSearchRequestId;
  setSearchLoadingState(true);
  if (!silentRefresh) {
    setChartLoadingState(true);
  }

  if (!silentRefresh) {
    updateAnalysisStageBadge(`${displaySymbol(symbol)} • ${currentLang === "en" ? "Analyzing" : "Analisando"}`, "info");
    setStatus(`${currentLang === "en" ? "Analyzing" : "Analisando"} ${displaySymbol(symbol)}...`);
  }

  try {
    const apiGet = currentUser ? fetchAuthJSON : fetchJSON;
    const quotePromise = allowPreviewMode
      ? Promise.resolve({ c: null, d: null, dp: null, h: null, l: null, o: null, pc: null, source: "preview", error: "PREVIEW_ONLY" })
      : apiGet(`/api/quote/${symbol}`);

    const results = await Promise.allSettled([
      quotePromise,
      fetchJSON(`/api/profile/${symbol}`),
      fetchJSON(`/api/candles/${encodeURIComponent(symbol)}?${getTimeframeQuery(currentTimeframe)}`),
      fetchJSON(`/api/news/${symbol}`)
    ]);

    let quote = results[0].status === "fulfilled"
      ? results[0].value
      : { c: null, d: null, dp: null, h: null, l: null, o: null, pc: null, error: "QUOTE_UNAVAILABLE" };

    const profile = results[1].status === "fulfilled"
      ? results[1].value
      : { name: displaySymbol(symbol), exchange: t("exchange"), error: "PROFILE_UNAVAILABLE" };

    const candles = results[2].status === "fulfilled"
      ? results[2].value
      : { s: "no_data", c: [] };

    const news = results[3].status === "fulfilled"
      ? results[3].value
      : [];

    if (allowPreviewMode) {
      quote = buildPreviewQuoteFromCandles(candles, quote);
    }

    let compareCandles = null;
    const isPro = currentUser && currentPlan === "pro" && currentPlanStatus === "active";

    if (compareSymbol) {
      if (!isPro) {
        compareCandles = null;
        await trackEvent("compare_blocked_plan", {
          baseSymbol: symbol,
          compareSymbol,
          plan: currentPlan,
          status: currentPlanStatus
        });
        await showSmartUpgrade("compare", { baseSymbol: symbol, compareSymbol });
        setStatus(t("compareOnlyPro"));
        if (chartLabel) chartLabel.textContent = getTimeframeLabel(currentTimeframe);
      } else {
        const compareData = await fetchCandlesByTimeframe(compareSymbol, true, currentTimeframe);
        compareCandles = compareData?.s === "ok" ? compareData : null;
      }
    }

    if (companyName) companyName.textContent = profile.name || displaySymbol(symbol);
    if (companyTicker) companyTicker.textContent = displaySymbol(symbol);
    if (companyExchange) {
      const exchangeLabel = profile.exchange || t("exchange");
      companyExchange.textContent = `${exchangeLabel} • ${allowPreviewMode ? (currentLang === "en" ? "Preview mode" : "Modo visual") : getQuoteSourceLabel(quote)}`;
    }

    latestRenderedQuote = { ...quote };
    latestRenderedProfile = { ...profile };
    applyQuoteCardValues(quote);

    if (requestId !== activeSearchRequestId) return;

    const candleSeries = Array.isArray(candles?.c) ? candles.c : [];
    const compareModeActive = !!(compareCandles?.c?.length);
    const chartRefreshPlan = shouldRefreshChartOnSearch({
      silentRefresh,
      compareModeActive,
      compareSymbol,
      baseSymbol: symbol
    });

    if (chartRefreshPlan.reload) {
      drawChart(candles, compareCandles, { forceReload: chartRefreshPlan.forceReload === true });
    }

    lastRenderedCompareSymbol = chartRefreshPlan.compareKey;
    lastRenderedBaseSymbol = chartRefreshPlan.baseKey || symbol;
    lastRenderedTimeframe = chartRefreshPlan.timeframeKey || currentTimeframe;
    tradingViewState.mode = chartRefreshPlan.mode || tradingViewState.mode;

    if (candleSeries.length < 2) {
      setStatus(`⚠️ ${displaySymbol(symbol)} sem dados suficientes para o gráfico em ${getTimeframeLabel(currentTimeframe)}.`);
    } else if (!allowPreviewMode && (candles?.source || candles?.interval)) {
      const chartInfo = [candles?.source || "chart", candles?.interval || ""].filter(Boolean).join(" • ");
      setStatus(`${t("updatedFor")} ${displaySymbol(symbol)} • ${getQuoteSourceLabel(quote)} • gráfico ${chartInfo}.`);
    }
    const analysisSnapshot = buildAnalysisSnapshot(symbol, quote, candles, news, profile);
    latestAnalysisSnapshot = analysisSnapshot;
    saveAnalysisSnapshot(analysisSnapshot);

    renderNews(news);
    renderOverview(quote, analysisSnapshot);
    renderSmartPremiumPanel(analysisSnapshot);
    afterSuccessfulAnalysis(symbol);
    ensureAnalysisControlButton();
    syncActiveMarketButtons();

    if (newsSymbol) newsSymbol.textContent = displaySymbol(symbol);
    updateChartHeader(compareCandles?.c?.length ? compareSymbol : "");

    if (requestId !== activeSearchRequestId) return;

    if (companyCard) companyCard.classList.remove("hidden");
    if (quoteGrid) quoteGrid.classList.remove("hidden");
    if (chartCard) chartCard.classList.remove("hidden");
    if (newsSection) newsSection.classList.remove("hidden");

    const usageAfter = await refreshUsage();

    if (!compareSymbol || compareCandles?.c?.length) {
      const remaining = usageAfter?.remaining ?? "-";
      const baseStatus = getFriendlyAnalysisStatus(symbol, quote, candles);
      const tone = quote?.error === "QUOTE_UNAVAILABLE" ? "warning" : "success";
      updateAnalysisStageBadge(`${displaySymbol(symbol)} • ${allowPreviewMode ? (currentLang === "en" ? "Preview active" : "Prévia ativa") : getQuoteSourceLabel(quote)}`, tone);

      if (allowPreviewMode) {
        const previewStatus = currentLang === "en"
          ? `Preview unlocked for ${displaySymbol(symbol)}. The live chart is visible now. Login only when you want favorites, compare or unlimited analyses.`
          : `Prévia liberada para ${displaySymbol(symbol)}. O gráfico ao vivo já está visível. Faça login apenas quando quiser favoritos, comparação ou análises ilimitadas.`;
        setStatus(previewStatus);
        await showSmartUpgrade("limit", { symbol, remaining });
      } else {
        setStatus(isAnalysisPaused ? `⏸️ ${t("analysisPaused")} • ${baseStatus} ${t("remainingToday")}: ${remaining}` : `${baseStatus} ${t("remainingToday")}: ${remaining}`);
      }
    }

    if (!allowPreviewMode) {
      startAutoRefresh(symbol);
    } else {
      stopAutoRefresh();
      if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.style.opacity = "1";
      }
    }
  } catch (error) {
    setChartLoadingState(false);
    if (error.message === "LIMIT_REACHED") {
      await trackEvent("daily_limit_reached_backend", {
        symbol,
        plan: currentPlan,
        status: currentPlanStatus
      });
      const usageAfterError = await refreshUsage();
      const remaining = usageAfterError?.remaining ?? 0;
      const lockedSymbolLabel = displaySymbol(getPreviewLockedSymbol(symbol));
      setStatus(currentLang === "en"
        ? `🚫 Limit reached today. The ${lockedSymbolLabel} chart can stay visible, but new analyses require upgrade. (${t("remainingToday")}: ${remaining})`
        : `🚫 Limite atingido hoje. O gráfico de ${lockedSymbolLabel} pode continuar visível, mas novas análises exigem upgrade. (${t("remainingToday")}: ${remaining})`);
      if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.style.opacity = "1";
      }
      await showSmartUpgrade("limit", { symbol, remaining });
    } else {
      updateAnalysisStageBadge(`${displaySymbol(symbol)} • erro`, "danger");
      setStatus(`⚠️ ${error.message}`);
    }
  } finally {
    if (requestId === activeSearchRequestId) {
      const usageAfterFinally = await refreshUsage();
      if (usageAfterFinally) {
        usageData = usageAfterFinally;
      }
      setSearchLoadingState(false);
      setChartLoadingState(false);
      if (!currentUser && searchBtn) {
        searchBtn.disabled = false;
        searchBtn.style.opacity = "1";
      }
    }
  }
}

async function loadSubscription() {
  if (!currentUser) {
    currentPlan = "free";
    currentPlanStatus = "inactive";
    updatePlanUI();
    return;
  }

  try {
    const sub = await fetchAuthJSON("/api/me/subscription");
    currentPlan = sub.plan || "free";
    currentPlanStatus = sub.status || "inactive";
    
    if (currentSymbol && (currentPlan === "pro" || currentPlan === "starter") && currentPlanStatus === "active") {
      stopAutoRefresh();
      startAutoRefresh(currentSymbol);
    }
  } catch {
    currentPlan = "free";
    currentPlanStatus = "inactive";
  }

  updatePlanUI();
  if (isUnlimitedAccessUser()) {
    updateUsageUI({ ...usageData, plan: currentPlan, status: currentPlanStatus, isAdmin: isAdminUser, limit: "∞", remaining: "∞" });
    updateUpgradeBanner({ visible: false });
  }
  if (!(currentPlan === "pro" && currentPlanStatus === "active") &&
      !(currentPlan === "starter" && currentPlanStatus === "active")) {
    stopAutoRefresh();
  }
}

function clearPortfolioSummary() {
  if (!portfolioSummary) return;
  portfolioSummary.innerHTML = "";
  delete portfolioSummary.dataset.invested;
  delete portfolioSummary.dataset.current;
  delete portfolioSummary.dataset.result;
  delete portfolioSummary.dataset.resultPercent;
  portfolioSummary.classList.add("hidden");
}

function getPortfolioResultTone(value) {
  return Number(value || 0) >= 0 ? "profit" : "loss";
}

function renderPortfolioSummaryCard(summary) {
  if (!portfolioSummary) return;

  if (!summary || !summary.hasData) {
    clearPortfolioSummary();
    return;
  }

  const resultTone = getPortfolioResultTone(summary.result);

  portfolioSummary.dataset.invested = String(summary.invested || 0);
  portfolioSummary.dataset.current = String(summary.current || 0);
  portfolioSummary.dataset.result = String(summary.result || 0);
  portfolioSummary.dataset.resultPercent = String(summary.resultPercent || 0);

  portfolioSummary.innerHTML = `
    <div class="section-title-row" style="margin-bottom:12px;">
      <h3>${t("portfolioSummaryTitle")}</h3>
      <span>${currentPlan === "pro" ? t("portfolioEnabled") : t("portfolioLocked")}</span>
    </div>
    <div class="portfolio-summary-grid">
      <div class="portfolio-summary-item">
        <span>${t("investedLabel")}</span>
        <strong>${formatPrice(summary.invested)}</strong>
      </div>
      <div class="portfolio-summary-item">
        <span>${t("currentValueLabel")}</span>
        <strong>${formatPrice(summary.current)}</strong>
      </div>
      <div class="portfolio-summary-item ${resultTone}">
        <span>${t("profitLossLabel")}</span>
        <strong>${formatPrice(summary.result)} (${summary.resultPercent.toFixed(2)}%)</strong>
      </div>
    </div>
  `;
  portfolioSummary.classList.remove("hidden");
}

async function loadPortfolio() {
  if (!(currentPlan === "pro" && currentPlanStatus === "active")) {
    clearPortfolioSummary();
    if (portfolioList) portfolioList.innerHTML = "";
    return;
  }

  try {
    const items = await fetchAuthJSON("/api/me/portfolio");
    if (!portfolioList) return;
    portfolioList.innerHTML = "";

    if (!items.length) {
      clearPortfolioSummary();
      portfolioList.innerHTML = `<div class="portfolio-item">${t("noSavedAssets")}</div>`;
      return;
    }

    let totalInvested = 0;
    let totalCurrent = 0;

    for (const item of items) {
      let currentPriceValue = null;

      try {
        const quote = await fetchAuthJSON(`/api/quote/${encodeURIComponent(item.symbol)}`);
        currentPriceValue = Number(quote?.c);
        if (Number.isNaN(currentPriceValue)) currentPriceValue = null;
      } catch (error) {
        console.error("Erro ao buscar cotação da carteira:", item.symbol, error.message);
        currentPriceValue = null;
      }

      const invested = Number(item.quantity || 0) * Number(item.avg_price || 0);
      const current = currentPriceValue != null ? Number(item.quantity || 0) * currentPriceValue : invested;
      const result = current - invested;
      const resultPercent = invested > 0 ? (result / invested) * 100 : 0;

      totalInvested += invested;
      totalCurrent += current;

      const row = document.createElement("div");
      row.className = "portfolio-item portfolio-item-rich";

      const toneClass = getPortfolioResultTone(result);
      const currentPriceText = currentPriceValue != null ? formatPrice(currentPriceValue) : "-";

      row.innerHTML = `
        <div class="portfolio-item-main">
          <strong>${displaySymbol(item.symbol)}</strong>
          <span>${t("qty")}: ${item.quantity}</span>
          <span>${t("avg")}: ${formatPrice(item.avg_price)}</span>
          <span>${t("currentPriceLabel")}: ${currentPriceText}</span>
        </div>

        <div class="portfolio-item-metrics">
          <span>${t("investedLabel")}: ${formatPrice(invested)}</span>
          <span>${t("currentValueLabel")}: ${formatPrice(current)}</span>
          <span class="portfolio-metric-${toneClass}">${t("profitLossLabel")}: ${formatPrice(result)} (${resultPercent.toFixed(2)}%)</span>
        </div>

        <button data-symbol="${item.symbol}">${t("remove")}</button>
      `;

      row.querySelector("button").onclick = async () => {
        await fetchAuthJSON(`/api/me/portfolio/${item.symbol}`, { method: "DELETE" });
        await loadPortfolio();
      };

      portfolioList.appendChild(row);
    }

    const totalResult = totalCurrent - totalInvested;
    const totalResultPercent = totalInvested > 0 ? (totalResult / totalInvested) * 100 : 0;

    renderPortfolioSummaryCard({
      hasData: true,
      invested: totalInvested,
      current: totalCurrent,
      result: totalResult,
      resultPercent: totalResultPercent
    });
  } catch (error) {
    clearPortfolioSummary();
    if (portfolioList) portfolioList.innerHTML = `<div class="portfolio-item">${error.message}</div>`;
  }
}

async function savePortfolio() {
  if (!(currentPlan === "pro" && currentPlanStatus === "active")) {
    await trackEvent("portfolio_front_blocked", { plan: currentPlan, status: currentPlanStatus });
    await showSmartUpgrade("portfolio");
    setStatus(t("portfolioProOnly"));
    return;
  }

  const symbol = normalizeSymbol(portfolioSymbol?.value);
  const quantity = Number(portfolioQuantity?.value);
  const avg_price = Number(portfolioAvgPrice?.value);

  if (!symbol || quantity <= 0 || avg_price <= 0) {
    setStatus(t("fillPortfolio"));
    return;
  }

  try {
    await fetchAuthJSON("/api/me/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, quantity, avg_price })
    });

    if (portfolioSymbol) portfolioSymbol.value = "";
    if (portfolioQuantity) portfolioQuantity.value = "";
    if (portfolioAvgPrice) portfolioAvgPrice.value = "";

    setStatus(t("assetSaved"));
    await loadPortfolio();
  } catch (error) {
    setStatus(error.message);
  }
}

function isSupabaseReady() {
  return !!(supabaseClient && supabaseClient.auth && typeof supabaseClient.auth.getSession === "function");
}

function setAuthButtonsDisabled(disabled) {
  [signUpBtn, signInBtn, signOutBtn, logoutTopBtn].forEach((btn) => {
    if (btn) btn.disabled = !!disabled;
  });
}

function getSupabaseAuthOrThrow() {
  if (!supabaseClient) {
    throw new Error("Sistema de login não inicializado. Recarregue a página.");
  }
  if (!supabaseClient.auth) {
    throw new Error("Módulo de autenticação indisponível. Recarregue a página.");
  }
  if (authInitFailed) {
    throw new Error("Falha na inicialização do login. Recarregue a página.");
  }
  return supabaseClient.auth;
}

async function signUp() {
  const email = authEmail?.value.trim();
  const password = authPassword?.value.trim();

  if (!email || !password) {
    setAuthStatus(t("enterEmailPassword"));
    return;
  }

  try {
    setAuthButtonsDisabled(true);
    const auth = getSupabaseAuthOrThrow();
    const { data, error } = await auth.signUp({ email, password });

    if (error) {
      setAuthStatus(error.message);
      return;
    }

    const session = data?.session || null;
    if (session?.access_token) {
      setAccessToken(session.access_token);
      currentUser = data?.user || null;
      updateAuthPanelUI();
      await refreshAuthState("sign-up");
      notifyAuthSync("signed_in", { email: data?.user?.email || email });
      clearAuthFields(true);
      return;
    }

    currentUser = null;
    updateAuthPanelUI();
    setAuthStatus("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
    clearAuthFields(false);
  } catch (error) {
    console.error("signUp error:", error?.message || error);
    setAuthStatus(error?.message || "Falha ao cadastrar.");
  } finally {
    setAuthButtonsDisabled(false);
  }
}

async function signIn() {
  const email = authEmail?.value.trim();
  const password = authPassword?.value.trim();

  if (!email || !password) {
    setAuthStatus(t("enterEmailPassword"));
    return;
  }

  try {
    setAuthButtonsDisabled(true);
    const auth = getSupabaseAuthOrThrow();
    const { data, error } = await auth.signInWithPassword({ email, password });

    if (error) {
      setAuthStatus(error.message);
      return;
    }

    if (data?.session?.access_token) {
      setAccessToken(data.session.access_token);
    }

    currentUser = data?.user || null;
    updateAuthPanelUI();
    setAuthStatus("");
    await refreshAuthState("sign-in");
    notifyAuthSync("signed_in", { email: currentUser?.email || email });
    clearAuthFields(true);
  } catch (error) {
    console.error("signIn error:", error?.message || error);
    setAuthStatus(error?.message || "Falha ao entrar.");
  } finally {
    setAuthButtonsDisabled(false);
  }
}

async function signOut() {
  try {
    setAuthButtonsDisabled(true);
    isSigningOutNow = true;

    if (isSupabaseReady()) {
      const auth = getSupabaseAuthOrThrow();
      await auth.signOut();
    }
  } catch (error) {
    console.error("signOut error:", error?.message || error);
  } finally {
    setAccessToken("");
    currentUser = null;
    resetClientSessionState({
      clearForm: false,
      statusMessage: t("sessionEnded")
    });
    updateAuthPanelUI();
    notifyAuthSync("signed_out");
    isSigningOutNow = false;
    setAuthButtonsDisabled(false);
  }
}

async function startCheckout(plan) {
  if (checkoutInFlight) return;

  const normalizedPlan = plan === "pro" ? "pro" : "starter";

  if (!currentUser) {
    await trackEvent("checkout_login_required", { plan: normalizedPlan });
    setStatus(t("loginFirstSubscribe"));
    const authCard = document.getElementById("authCard");
    if (authCard) authCard.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (!appConfig?.prices) {
    try {
      appConfig = await fetchJSON("/api/public-config");
    } catch (error) {
      setStatus(error?.message || "Falha ao carregar configuração do checkout.");
      return;
    }
  }

  const priceId = normalizedPlan === "pro" ? appConfig?.prices?.pro : appConfig?.prices?.starter;
  if (!priceId) {
    await trackEvent("checkout_missing_price", { plan: normalizedPlan });
    setStatus(t("stripePriceMissing"));
    return;
  }

  const starterOriginalLabel = starterBtn?.textContent || "Assinar Starter";
  const proOriginalLabel = proBtn?.textContent || "Assinar Pro";

  try {
    checkoutInFlight = true;

    if (starterBtn) {
      starterBtn.disabled = true;
      starterBtn.textContent = normalizedPlan === "starter"
        ? (currentLang === "en" ? "Opening checkout..." : "Abrindo checkout...")
        : starterOriginalLabel;
    }

    if (proBtn) {
      proBtn.disabled = true;
      proBtn.textContent = normalizedPlan === "pro"
        ? (currentLang === "en" ? "Opening checkout..." : "Abrindo checkout...")
        : proOriginalLabel;
    }

    await trackEvent("upgrade_click", { plan: normalizedPlan });

    const data = await fetchAuthJSON("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: normalizedPlan })
    });

    if (!data?.url) {
      throw new Error(currentLang === "en"
        ? "Checkout URL not returned by the server."
        : "A URL do checkout não foi retornada pelo servidor.");
    }

    setStatus(currentLang === "en"
      ? `Redirecting to secure ${normalizedPlan === "pro" ? "Pro" : "Starter"} checkout...`
      : `Redirecionando para o checkout seguro do ${normalizedPlan === "pro" ? "Pro" : "Starter"}...`);

    window.location.href = data.url;
  } catch (error) {
    setStatus(error?.message || "Falha ao abrir checkout.");
  } finally {
    checkoutInFlight = false;
    if (starterBtn) {
      starterBtn.disabled = false;
      starterBtn.textContent = starterOriginalLabel;
    }
    if (proBtn) {
      proBtn.disabled = false;
      proBtn.textContent = proOriginalLabel;
    }
  }
}

function handleCheckoutReturn() {
  try {
    const url = new URL(window.location.href);
    const checkout = url.searchParams.get("checkout");
    const plan = url.searchParams.get("plan");

    if (!checkout) return;

    const planLabel = plan === "pro" ? "Pro" : "Starter";

    if (checkout === "success") {
      setStatus(currentLang === "en"
        ? `Payment confirmed for ${planLabel}. Updating your access...`
        : `Pagamento confirmado para o ${planLabel}. Atualizando seu acesso...`);
      setTimeout(() => {
        refreshAuthState("checkout-success").catch(() => {});
        refreshUsage().catch(() => {});
      }, 1200);
    } else if (checkout === "cancel") {
      setStatus(currentLang === "en"
        ? `Checkout for ${planLabel} canceled. You can try again anytime.`
        : `Checkout do ${planLabel} cancelado. Você pode tentar novamente quando quiser.`);
    }

    url.searchParams.delete("checkout");
    url.searchParams.delete("plan");
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  } catch {}
}

// ==================== FUNÇÃO CORRIGIDA refreshAuthState ====================
async function refreshAuthState(reason = "manual") {
  if (!supabaseClient || !supabaseClient.auth) {
    console.warn(`⚠️ refreshAuthState ignorado: Supabase não pronto (${reason})`);
    return { user: null, reason: `${reason}:no-supabase` };
  }

  if (authInitFailed) {
    console.warn(`⚠️ refreshAuthState ignorado: authInitFailed (${reason})`);
    return { user: null, reason: `${reason}:init-failed` };
  }

  if (authRefreshPromise) {
    return authRefreshPromise;
  }

  authRefreshPromise = (async () => {
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const session = sessionData?.session || null;

      if (session?.access_token) {
        setAccessToken(session.access_token);
      } else {
        setAccessToken("");
      }

      let nextUser = session?.user || null;

      if (session?.access_token) {
        try {
          const { data, error } = await supabaseClient.auth.getUser(session.access_token);
          if (!error && data?.user) {
            nextUser = data.user;
          }
        } catch (err) {
          console.warn("getUser falhou:", err.message);
        }
      }

      const previousUser = currentUser;
      currentUser = nextUser;

      if (previousUser !== currentUser) {
        updateAuthPanelUI();
      }

      if (currentUser) {
        if (authEmail) authEmail.value = currentUser.email || "";
        if (authPassword) authPassword.value = "";
        setAuthStatus("");

        await loadSubscription();
        await syncFavoritesFromServer();
        await loadPortfolio();
        startPresenceHeartbeat();
      } else {
        currentPlan = "free";
        currentPlanStatus = "inactive";
        favorites = [];

        if (portfolioList) portfolioList.innerHTML = "";
        if (portfolioSummary) {
          portfolioSummary.innerHTML = "";
          portfolioSummary.classList.add("hidden");
        }

        if (authPassword) authPassword.value = "";
        renderFavorites();
        stopPresenceHeartbeat();
        updateAuthPanelUI();
      }

      updatePlanUI();
      await refreshUsage();
      await fetchAdminMine();

      return { user: currentUser, reason };
    } catch (error) {
      console.error("refreshAuthState error:", error?.message || error);
      return { user: null, reason: `${reason}:error` };
    } finally {
      authRefreshPromise = null;
    }
  })();

  return authRefreshPromise;
}

// ==================== FUNÇÃO CORRIGIDA initSupabase ====================
async function initSupabase() {
  try {
    authInitFailed = false;
    
    console.log("🚀 Iniciando Supabase...");
    appConfig = await fetchJSON("/api/public-config");

    if (!window.supabase?.createClient) {
      throw new Error("Biblioteca do Supabase não carregou.");
    }

    if (!appConfig?.supabaseUrl || !appConfig?.supabaseAnonKey) {
      throw new Error("Configuração pública do login está incompleta.");
    }

    console.log("✅ Config carregada, criando cliente...");
    const client = window.supabase.createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey);
    
    if (!client || !client.auth || typeof client.auth.getSession !== "function") {
      throw new Error("Supabase Auth não inicializou corretamente.");
    }

    supabaseClient = client;
    console.log("✅ Cliente Supabase criado com sucesso");
    
    attachAuthSyncListeners();

    supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log("🔄 Auth state change:", event);
      
      if (authInitFailed || !supabaseClient) return;

      if (session?.access_token) {
        setAccessToken(session.access_token);
      } else if (event === "SIGNED_OUT") {
        setAccessToken("");
      }

      if (event === "SIGNED_OUT") {
        if (!isSigningOutNow) {
          currentUser = null;
          resetClientSessionState({
            clearForm: false,
            statusMessage: t("sessionEnded")
          });
          notifyAuthSync("signed_out");
        }
        updateAuthPanelUI();
        return;
      }

      if (["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
        if (session?.user) {
          currentUser = session.user;
        }
        updateAuthPanelUI();
        updatePlanUI();
        
        if (event === "TOKEN_REFRESHED") {
          notifyAuthSync("token_updated");
        } else {
          notifyAuthSync("session_refresh", { event });
        }
      }
    });

    console.log("🔄 Chamando refreshAuthState inicial...");
    await refreshAuthState("init-supabase");
    
    updateAuthPanelUI();
    updatePlanUI();

    if (!currentUser) {
      setAuthStatus("Faça login.");
    } else {
      setAuthStatus(currentLang === "en" ? "Logged in." : "Logado.");
    }
    
    console.log("✅ Supabase inicializado com sucesso");
  } catch (error) {
    console.error("❌ initSupabase error:", error?.message || error);
    authInitFailed = true;
    supabaseClient = null;
    currentUser = null;
    setAccessToken("");
    updateAuthPanelUI();
    updatePlanUI();
    setAuthStatus(error?.message || "Falha ao iniciar login. Recarregue a página.");
  }
}

function applyTranslations() {
  const langToggle = document.getElementById("langToggle");
  if (langToggle) {
    langToggle.textContent = currentLang === "en" ? "🌍 EN" : "🌍 PT";
  }

  const authTitle = document.querySelector(".hero-grid .card .section-title-row h2");
  if (authTitle) authTitle.textContent = t("login");

  if (authEmail) authEmail.placeholder = t("email");
  if (authPassword) authPassword.placeholder = t("password");

  if (signUpBtn) signUpBtn.textContent = t("signup");
  if (signInBtn) signInBtn.textContent = t("signin");
  if (signOutBtn) signOutBtn.textContent = t("logout");
  if (logoutTopBtn) logoutTopBtn.textContent = t("logout");

  const planHeader = document.querySelectorAll(".hero-grid .card .section-title-row h2")[1];
  if (planHeader) planHeader.textContent = t("plans");

  const planHeaderSpan = document.querySelectorAll(".hero-grid .card .section-title-row span")[1];
  if (planHeaderSpan) planHeaderSpan.textContent = t("checkoutStripe");

  const priceCards = document.querySelectorAll(".price-card");
  if (priceCards[0]) {
    const h3 = priceCards[0].querySelector("h3");
    const p = priceCards[0].querySelector("p");
    if (h3) h3.textContent = t("starter");
    if (p) p.textContent = t("watchlistNewsChart");
  }
  if (priceCards[1]) {
    const h3 = priceCards[1].querySelector("h3");
    const p = priceCards[1].querySelector("p");
    if (h3) h3.textContent = t("pro");
    if (p) p.textContent = t("premiumDesc");
  }

  if (starterBtn) starterBtn.textContent = currentLang === "en" ? "Subscribe Starter" : "Assinar Starter";
  if (proBtn) proBtn.textContent = currentLang === "en" ? "Subscribe Pro" : "Assinar Pro";

  if (symbolInput) symbolInput.placeholder = t("symbolPlaceholder");
  if (compareInput) compareInput.placeholder = t("comparePlaceholder");
  if (searchBtn) searchBtn.textContent = t("analyze");
  setSearchHint();

  const watchlistTitle = document.querySelectorAll(".watchlist-section .section-title-row h2")[0];
  const watchlistSpan = document.querySelectorAll(".watchlist-section .section-title-row span")[0];
  if (watchlistTitle) watchlistTitle.textContent = t("watchlist");
  if (watchlistSpan) watchlistSpan.textContent = t("watchlistOpen");

  const favTitle = document.querySelectorAll(".watchlist-section .section-title-row h2")[1];
  const favSpan = document.querySelectorAll(".watchlist-section .section-title-row span")[1];
  if (favTitle) favTitle.textContent = `⭐ ${t("favorites")}`;
  if (favSpan) favSpan.textContent = t("savedInDb");

  const chartH3 = document.querySelector("#chartCard .chart-header h3");
  if (chartH3) chartH3.textContent = t("chart");
  ensureTimeframeControls();

  const statLabels = document.querySelectorAll("#quoteGrid .stat-card span");
  if (statLabels[0]) statLabels[0].textContent = t("priceCurrentLabel");
  if (statLabels[1]) statLabels[1].textContent = t("variationLabel");
  if (statLabels[2]) statLabels[2].textContent = t("openingLabel");
  if (statLabels[3]) statLabels[3].textContent = t("dayHighLabel");
  if (statLabels[4]) statLabels[4].textContent = t("dayLowLabel");
  if (statLabels[5]) statLabels[5].textContent = t("previousCloseLabel");

  const newsH3 = document.querySelector("#newsSection .section-title-row h3");
  if (newsH3) newsH3.textContent = t("recentNews");

  const portfolioH3 = document.querySelector("#portfolioSection .section-title-row h3");
  if (portfolioH3) portfolioH3.textContent = t("portfolioPro");
  if (portfolioStatus && currentPlan !== "pro") portfolioStatus.textContent = t("portfolioLocked");
  if (portfolioSummary && portfolioSummary.querySelector(".portfolio-summary-grid")) {
    renderPortfolioSummaryCard({
      hasData: true,
      invested: Number(portfolioSummary.dataset.invested || 0),
      current: Number(portfolioSummary.dataset.current || 0),
      result: Number(portfolioSummary.dataset.result || 0),
      resultPercent: Number(portfolioSummary.dataset.resultPercent || 0)
    });
  }

  if (portfolioSymbol) portfolioSymbol.placeholder = t("asset");
  if (portfolioQuantity) portfolioQuantity.placeholder = t("quantity");
  if (portfolioAvgPrice) portfolioAvgPrice.placeholder = t("avgPrice");
  if (addPortfolioBtn) addPortfolioBtn.textContent = t("save");

  const heroH2 = document.querySelector(".hero-sales h2");
  const heroP = document.querySelector(".hero-sales p");
  const heroBtns = document.querySelectorAll(".hero-sales button");
  const heroProof = document.querySelector(".social-proof");

  if (heroH2) heroH2.textContent = t("heroTitle");
  if (heroP) heroP.textContent = t("heroText");
  if (heroBtns[0]) heroBtns[0].textContent = t("heroStart");
  if (heroBtns[1]) heroBtns[1].textContent = t("heroTry");
  if (heroProof) heroProof.textContent = t("heroProof");

  updateFavoriteButton();
  renderFavorites();
  updatePlanUI();
  toggleAdminSection();
  applyAdminFilterButtons();
  markRecommendedPlans();
  hideUpgradeBannerIfAdmin();

  const runBtn = getDiagnosticsRunBtn();
  if (runBtn) runBtn.textContent = currentLang === "en" ? "Run diagnostics" : "Rodar diagnóstico";

  showDiagnosticsForAdminOnly();
}

function bindEvents() {
  const langToggle = document.getElementById("langToggle");
  if (langToggle) {
    langToggle.onclick = () => {
      currentLang = currentLang === "en" ? "pt" : "en";
      localStorage.setItem("lang", currentLang);
      applyTranslations();
    };
  }

  if (searchBtn) searchBtn.onclick = handleSearch;
  if (favBtn) favBtn.onclick = () => toggleFavorite(currentSymbol);
  if (signUpBtn) signUpBtn.onclick = signUp;
  if (signInBtn) signInBtn.onclick = signIn;
  if (signOutBtn) signOutBtn.onclick = signOut;
  if (logoutTopBtn) logoutTopBtn.onclick = signOut;
  if (starterBtn) starterBtn.onclick = () => startCheckout("starter");
  if (proBtn) proBtn.onclick = () => startCheckout("pro");
  if (addPortfolioBtn) addPortfolioBtn.onclick = savePortfolio;

  if (themeToggle) {
    themeToggle.onclick = () => {
      document.body.classList.toggle("light-theme");
      const isLight = document.body.classList.contains("light-theme");
      localStorage.setItem("theme", isLight ? "light" : "dark");
    };
  }

  document.querySelectorAll(".watch-btn").forEach((btn) => {
    btn.onclick = () => {
      if (symbolInput) symbolInput.value = btn.dataset.symbol;
      handleSearch();
    };
  });

  bindAutocompleteInput("symbol");
  bindAutocompleteInput("compare");

  if (symbolInput) {
    symbolInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && activeSuggestionIndex < 0) handleSearch();
    });
  }

  if (compareInput) {
    compareInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && activeSuggestionIndex < 0) handleSearch();
    });
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest(".autocomplete-field")) {
      hideAllSuggestionBoxes();
    }
  });

  const adminRefreshBtn = getAdminRefreshBtn();
  if (adminRefreshBtn) {
    adminRefreshBtn.onclick = async () => {
      await loadAdminDashboard();
      await loadAdminUsers();
    };
  }

  getAdminFilterButtons().forEach((btn) => {
    btn.onclick = () => {
      setAdminFilter(btn.dataset.filter);
    };
  });

  window.addEventListener("online", handleBrowserConnectivityChange);
  window.addEventListener("offline", handleBrowserConnectivityChange);

  bindDiagnosticsEvents();
  showDiagnosticsForAdminOnly();
}

function clearAuthFields(forceEmail = false) {
  const authForm = document.getElementById("authForm");

  if (authPassword) {
    authPassword.value = "";
    authPassword.setAttribute("value", "");
  }

  if (forceEmail && authEmail) {
    authEmail.value = "";
    authEmail.setAttribute("value", "");
  }

  if (authForm) {
    authForm.setAttribute("autocomplete", "off");
    authForm.reset();
  }

  setTimeout(() => {
    if (authPassword) authPassword.value = "";
    if (forceEmail && authEmail) authEmail.value = "";
  }, 50);

  setTimeout(() => {
    if (authPassword) authPassword.value = "";
    if (forceEmail && authEmail) authEmail.value = "";
  }, 300);
}

function scrollToPlans() {
  const el = document.querySelector(".pricing-grid");
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  }
}

async function init() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
  }

  const savedLang = localStorage.getItem("lang");
  if (savedLang === "en" || savedLang === "pt") {
    currentLang = savedLang;
  }

  bindEvents();
  ensureNetworkBanner();
  handleBrowserConnectivityChange();
  ensureTimeframeControls();
  clearAnalysisUI();
  renderFavorites();
  syncActiveMarketButtons();
  clearAuthFields(false);
  await initSupabase();
  applyTranslations();
  updatePlanUI();
  handleCheckoutReturn();
  await refreshUsage();
  
  if (symbolInput) symbolInput.value = "AAPL";
  setSearchHint();
  if (typeof renderDynamicMarketLists === "function") renderDynamicMarketLists();

  showDiagnosticsForAdminOnly();
  await runDiagnostics();
  await runBackendHealthProbe();
  startBackendHealthMonitor();
  setInterval(async () => {
    if (!currentUser) return;
    try {
      await loadSubscription();
      await refreshUsage();
    } catch {}
  }, 120000);
  syncActiveMarketButtons();
  updateAnalysisControlButton();

  const bootSymbol = normalizeSymbol(symbolInput?.value || DEFAULT_FREE_PREVIEW_SYMBOL);
  if (symbolInput && bootSymbol) {
    symbolInput.value = displaySymbol(bootSymbol);
    setTimeout(() => {
      if (!isSearchingNow) {
        handleSearch(false).catch((error) => {
          console.error('boot preview error:', error?.message || error);
        });
      }
    }, 180);
  }
}

// =========================
// NÍVEL 8 ADMIN — JUNÇÃO
// =========================

let isAdminUser = false;
let adminHeartbeatInterval = null;
let adminUsersCache = [];
let adminUserFilter = "all";

function getUsageBadge() {
  return document.getElementById("usageBadge");
}

function getAdminSection() {
  return document.getElementById("adminSection");
}

function getAdminStatus() {
  return document.getElementById("adminStatus");
}

function getAdminTotals() {
  return {
    users: document.getElementById("adminTotalUsers"),
    paid: document.getElementById("adminPaidUsers"),
    free: document.getElementById("adminFreeUsers"),
    starter: document.getElementById("adminStarterUsers"),
    pro: document.getElementById("adminProUsers"),
    online: document.getElementById("adminOnlineUsers")
  };
}

function getAdminUsersList() {
  return document.getElementById("adminUsersList");
}

function getAdminRefreshBtn() {
  return document.getElementById("adminRefreshBtn");
}

function getAdminFilterButtons() {
  return document.querySelectorAll(".admin-filter-btn");
}

function applyAdminFilterButtons() {
  getAdminFilterButtons().forEach((btn) => {
    const isActive = btn.dataset.filter === adminUserFilter;
    btn.classList.toggle("is-active", isActive);
  });
}

function setAdminFilter(filter) {
  adminUserFilter = filter || "all";
  applyAdminFilterButtons();
  renderAdminUsers(adminUsersCache);
}

function getFilteredAdminUsers(users) {
  if (adminUserFilter === "all") return users;

  return users.filter((user) => {
    if (adminUserFilter === "online") return !!user.is_online;
    return user.plan === adminUserFilter;
  });
}

function adminActionButtonsHTML(user) {
  return `
    <div class="admin-user-actions">
      <button type="button" class="neutral-btn admin-action-btn" data-action="set-plan" data-plan="free" data-user-id="${user.user_id}">Free</button>
      <button type="button" class="neutral-btn admin-action-btn" data-action="set-plan" data-plan="starter" data-user-id="${user.user_id}">Starter</button>
      <button type="button" class="neutral-btn admin-action-btn" data-action="set-plan" data-plan="pro" data-user-id="${user.user_id}">Pro</button>
      <button type="button" class="neutral-btn admin-action-btn" data-action="reset-usage" data-user-id="${user.user_id}">${currentLang === "en" ? "Reset usage" : "Resetar uso"}</button>
    </div>
  `;
}

async function adminUpdateUserPlan(userId, plan) {
  try {
    setAdminStatus(currentLang === "en" ? "Updating user plan..." : "Atualizando plano do usuário...");
    await fetchAuthJSON(`/api/admin/users/${userId}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan })
    });

    await loadAdminDashboard();
    await loadAdminUsers();
    setAdminStatus(currentLang === "en" ? "User plan updated." : "Plano do usuário atualizado.");
  } catch (error) {
    setAdminStatus(error.message);
  }
}

async function adminResetUserUsage(userId) {
  try {
    setAdminStatus(currentLang === "en" ? "Resetting daily usage..." : "Resetando uso diário...");
    await fetchAuthJSON(`/api/admin/users/${userId}/reset-usage`, {
      method: "POST"
    });

    await loadAdminDashboard();
    await loadAdminUsers();
    setAdminStatus(currentLang === "en" ? "Daily usage reset." : "Uso diário resetado.");
  } catch (error) {
    setAdminStatus(error.message);
  }
}

function bindAdminActionButtons() {
  document.querySelectorAll(".admin-action-btn").forEach((btn) => {
    btn.onclick = async () => {
      const action = btn.dataset.action;
      const userId = btn.dataset.userId;
      const plan = btn.dataset.plan;

      if (action === "set-plan") {
        await adminUpdateUserPlan(userId, plan);
      }

      if (action === "reset-usage") {
        await adminResetUserUsage(userId);
      }
    };
  });
}

function setAdminStatus(message) {
  const el = getAdminStatus();
  if (el) el.textContent = message;
}

function updateUsageUI(data) {
  if (!data) return;

  const nextData = {
    ...usageData,
    ...data
  };

  if (data.plan) {
    currentPlan = data.plan || "free";
    currentPlanStatus = data.status || "inactive";
  }

  isAdminUser = !!data.isAdmin;

  if (isUnlimitedAccessUser()) {
    nextData.limit = "∞";
    nextData.remaining = "∞";
  }

  usageData = nextData;
  updatePlanUI();

  const usageBadge = getUsageBadge();
  if (usageBadge) {
    usageBadge.textContent = getUsageBadgeMessage(usageData);
    usageBadge.title = isUnlimitedAccessUser()
      ? (currentLang === "en" ? "Unlimited analyses available today" : "Análises ilimitadas disponíveis hoje")
      : (currentLang === "en"
          ? `Used today: ${usageData.used ?? 0} • Remaining: ${usageData.remaining}`
          : `Usadas hoje: ${usageData.used ?? 0} • Restantes: ${usageData.remaining}`);
    usageBadge.dataset.state = isUnlimitedAccessUser()
      ? "unlimited"
      : Number(usageData.remaining) <= 0 ? "locked" : Number(usageData.remaining) === 1 ? "warning" : "active";
  }

  if (searchBtn) {
    const blocked = !isUnlimitedAccessUser() && usageData.limit !== "∞" && Number(usageData.remaining) <= 0;
    searchBtn.disabled = false;
    searchBtn.style.opacity = "1";
    searchBtn.textContent = blocked
      ? (currentLang === "en" ? "Unlock now" : "Desbloquear agora")
      : t("analyze");
  }

  if (isUnlimitedAccessUser()) {
    updateUpgradeBanner({ visible: false });
  } else if (Number(usageData.remaining) <= 1 && Number(usageData.limit) !== Infinity) {
    updateUpgradeBanner({
      visible: true,
      title: Number(usageData.remaining) <= 0
        ? (currentLang === "en" ? "Limit reached — unlock unlimited analyses now" : "Limite atingido — desbloqueie análises ilimitadas agora")
        : (currentLang === "en" ? "You are on your last free analysis" : "Você está na sua última análise grátis"),
      subtitle: currentLang === "en"
        ? "Keep the live chart visible and unlock new analyses, comparison and premium signals."
        : "Mantenha o gráfico ao vivo visível e desbloqueie novas análises, comparação e sinais premium.",
      cta: currentLang === "en" ? "Upgrade to Pro" : "Fazer upgrade para Pro",
      plan: "pro"
    });
  }

  toggleAdminSection();
}

function toggleAdminSection() {
  const adminSection = getAdminSection();
  if (!adminSection) return;

  if (isAdminUser && currentUser) {
    adminSection.classList.remove("hidden");
  } else {
    adminSection.classList.add("hidden");
  }

  showDiagnosticsForAdminOnly();
}

async function fetchAdminMe() {
  if (!currentUser) {
    isAdminUser = false;
    toggleAdminSection();
    return null;
  }

  try {
    const data = await fetchAuthJSON("/api/admin/me");
    isAdminUser = !!data.isAdmin;
    toggleAdminSection();
    return data;
  } catch {
    isAdminUser = false;
    toggleAdminSection();
    return null;
  }
}

async function sendPresenceHeartbeat() {
  if (!currentUser) return;

  try {
    await fetchAuthJSON("/api/me/presence", {
      method: "POST"
    });
  } catch {}
}

function startPresenceHeartbeat() {
  stopPresenceHeartbeat();

  if (!currentUser) return;

  sendPresenceHeartbeat();
  adminHeartbeatInterval = setInterval(() => {
    sendPresenceHeartbeat();
  }, 60000);
}

function stopPresenceHeartbeat() {
  if (adminHeartbeatInterval) {
    clearInterval(adminHeartbeatInterval);
    adminHeartbeatInterval = null;
  }
}

function renderAdminDashboard(data) {
  const totals = getAdminTotals();
  if (totals.users) totals.users.textContent = data?.totals?.users ?? "-";
  if (totals.paid) totals.paid.textContent = data?.totals?.paidUsers ?? "-";
  if (totals.free) totals.free.textContent = data?.totals?.freeUsers ?? "-";
  if (totals.starter) totals.starter.textContent = data?.totals?.starterUsers ?? "-";
  if (totals.pro) totals.pro.textContent = data?.totals?.proUsers ?? "-";
  if (totals.online) totals.online.textContent = data?.totals?.onlineNow ?? "-";

  const dailyLimitToday = document.getElementById("adminDailyLimitToday");
  const blockedPortfolioToday = document.getElementById("adminBlockedPortfolioToday");
  const checkoutStartedToday = document.getElementById("adminCheckoutStartedToday");
  const quotesAnalyzedToday = document.getElementById("adminQuotesAnalyzedToday");

  if (dailyLimitToday) dailyLimitToday.textContent = data?.totals?.dailyLimitReachedToday ?? "-";
  if (blockedPortfolioToday) blockedPortfolioToday.textContent = data?.totals?.blockedPortfolioToday ?? "-";
  if (checkoutStartedToday) checkoutStartedToday.textContent = data?.totals?.checkoutStartedToday ?? "-";
  if (quotesAnalyzedToday) quotesAnalyzedToday.textContent = data?.totals?.quotesAnalyzedToday ?? "-";

  setAdminStatus(currentLang === "en" ? "Admin dashboard updated." : "Painel admin atualizado.");
}

function renderAdminUsers(users) {
  const adminUsersList = getAdminUsersList();
  if (!adminUsersList) return;

  adminUsersCache = Array.isArray(users) ? users : [];
  const filteredUsers = getFilteredAdminUsers(adminUsersCache);

  adminUsersList.innerHTML = "";

  if (!filteredUsers.length) {
    adminUsersList.innerHTML = `<div class="portfolio-item">${currentLang === "en" ? "No users found for this filter." : "Nenhum usuário encontrado para este filtro."}</div>`;
    return;
  }

  filteredUsers.forEach((user) => {
    const row = document.createElement("div");
    row.className = "portfolio-item";
    row.innerHTML = `
      <div>
        <strong>${user.email || "-"}</strong>
        <div>Plano: ${user.plan || "free"} • Status: ${user.status || "inactive"}${user.admin_tester ? " • Admin Teste" : ""}</div>
        <div>${user.is_online ? "🟢 Online" : "⚪ Offline"} • Favoritos: ${user.favorites_count || 0} • Carteira: ${user.portfolio_assets_count || 0}</div>
        <div>${t("remainingToday")}: ${user.used_today ?? 0} ${currentLang === "en" ? "used today" : "usadas hoje"}</div>
        ${adminActionButtonsHTML(user)}
      </div>
    `;
    adminUsersList.appendChild(row);
  });

  bindAdminActionButtons();
  renderAdminHotLeads(filteredUsers);
}

async function loadAdminDashboard() {
  if (!isAdminUser || !currentUser) return;

  try {
    setAdminStatus(currentLang === "en" ? "Loading admin dashboard..." : "Carregando painel admin...");
    const dashboard = await fetchAuthJSON("/api/admin/dashboard");
    renderAdminDashboard(dashboard);
  } catch (error) {
    setAdminStatus(error.message);
  }
}

async function loadAdminUsers() {
  if (!isAdminUser || !currentUser) return;

  try {
    const users = await fetchAuthJSON("/api/admin/users");
    renderAdminUsers(users);
  } catch (error) {
    const adminUsersList = getAdminUsersList();
    if (adminUsersList) {
      adminUsersList.innerHTML = `<div class="portfolio-item">${error.message}</div>`;
    }
  }
}

applyAdminFilterButtons();

// =========================
// NÍVEL 8.2 — TRACKING
// =========================

async function trackEvent(eventType, eventData = {}, targetUserId = null) {
  try {
    await fetchAuthJSON("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        eventData,
        targetUserId
      })
    });
  } catch {}
}

// =========================
// NÍVEL 8.4 — CONVERSÃO INTELIGENTE
// =========================

let recommendedPlan = "pro";

function getUpgradeBanner() {
  return document.getElementById("upgradeBanner");
}

function getHotLeadsBox() {
  return document.getElementById("adminHotLeadsList");
}

function getPlanCards() {
  return document.querySelectorAll(".price-card");
}

function markRecommendedPlans() {
  getPlanCards().forEach((card) => {
    const title = (card.querySelector("h3")?.textContent || "").toLowerCase();
    const isStarter = title.includes("starter");
    const shouldHighlight =
      (recommendedPlan === "starter" && isStarter) ||
      (recommendedPlan === "pro" && !isStarter);

    card.classList.toggle("recommended-plan", shouldHighlight);
  });
}

function openUpgrade(plan = null) {
  if (plan) {
    recommendedPlan = plan === "starter" ? "starter" : "pro";
  }

  markRecommendedPlans();

  const plansSection = document.getElementById("plans");
  if (plansSection) {
    plansSection.scrollIntoView({ behavior: "smooth" });
  }
}

function updateUpgradeBanner(config = {}) {
  const banner = getUpgradeBanner();
  if (!banner) return;

  const {
    visible = false,
    title = "",
    subtitle = "",
    cta = currentLang === "en" ? "See plans" : "Ver planos",
    plan = "pro"
  } = config;

  banner.classList.toggle("hidden", !visible);
  if (!visible) return;

  const titleEl = banner.querySelector(".upgrade-banner-title");
  const subtitleEl = banner.querySelector(".upgrade-banner-subtitle");
  const btnEl = banner.querySelector(".upgrade-banner-btn");

  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;
  if (btnEl) {
    btnEl.textContent = cta;
    btnEl.onclick = async () => {
      await trackEvent("upgrade_banner_click", { recommendedPlan: plan });
      openUpgrade(plan);
    };
  }

  recommendedPlan = plan === "starter" ? "starter" : "pro";
  markRecommendedPlans();
}

async function showSmartUpgrade(kind, extra = {}) {
  if (isAdminUser) return;

  let title = currentLang === "en"
    ? "Unlock unlimited analyses and stronger signals"
    : "Desbloqueie análises ilimitadas e sinais mais fortes";
  let subtitle = currentLang === "en"
    ? "See the value first, then upgrade when you want more speed and decision power."
    : "Veja o valor primeiro e faça upgrade quando quiser mais velocidade e poder de decisão.";
  let plan = "pro";

  if (kind === "limit") {
    title = currentLang === "en"
      ? "Limit reached — unlock unlimited analyses now"
      : "Limite atingido — desbloqueie análises ilimitadas agora";
    subtitle = currentLang === "en"
      ? "Keep the chart visible and unlock unlimited analyses, comparison and premium signals."
      : "Mantenha o gráfico visível e libere análises ilimitadas, comparação e sinais premium.";
    plan = "pro";
  }

  if (kind === "compare") {
    title = currentLang === "en"
      ? "Compare assets like a pro"
      : "Compare ativos como um profissional";
    subtitle = currentLang === "en"
      ? "Asset comparison is available on Pro."
      : "A comparação de ativos está disponível no Pro.";
    plan = "pro";
  }

  if (kind === "portfolio") {
    title = currentLang === "en"
      ? "Build your portfolio with confidence"
      : "Monte sua carteira com confiança";
    subtitle = currentLang === "en"
      ? "Portfolio tools are available on Pro."
      : "As ferramentas de carteira estão disponíveis no Pro.";
    plan = "pro";
  }

  if (kind === "favorite") {
    title = currentLang === "en"
      ? "Save favorites and track opportunities"
      : "Salve favoritos e acompanhe oportunidades";
    subtitle = currentLang === "en"
      ? "Unlock favorites with Starter or go Pro for the full experience."
      : "Desbloqueie favoritos com Starter ou vá de Pro para a experiência completa.";
    plan = "starter";
  }

  updateUpgradeBanner({
    visible: true,
    title,
    subtitle,
    cta: currentLang === "en"
      ? `Upgrade to ${plan === "starter" ? "Starter" : "Pro"}`
      : `Fazer upgrade para ${plan === "starter" ? "Starter" : "Pro"}`,
    plan
  });

  await trackEvent("smart_upgrade_shown", {
    kind,
    plan,
    ...extra
  });
}

function hideUpgradeBannerIfAdmin() {
  if (isAdminUser) {
    updateUpgradeBanner({ visible: false });
  }
}

function renderAdminHotLeads(users) {
  const box = getHotLeadsBox();
  if (!box) return;

  if (!Array.isArray(users) || !users.length) {
    box.innerHTML = `<div class="portfolio-item">${currentLang === "en" ? "No hot leads right now." : "Nenhum lead quente agora."}</div>`;
    return;
  }

  const hotUsers = users
    .filter((user) => user.plan === "free" && Number(user.used_today || 0) >= 2)
    .slice(0, 5);

  box.innerHTML = "";

  if (!hotUsers.length) {
    box.innerHTML = `<div class="portfolio-item">${currentLang === "en" ? "No hot leads right now." : "Nenhum lead quente agora."}</div>`;
    return;
  }

  hotUsers.forEach((user) => {
    const row = document.createElement("div");
    row.className = "portfolio-item";
    row.innerHTML = `
      <strong>${user.email || "-"}</strong>
      <span>${currentLang === "en" ? "Usage today" : "Uso hoje"}: ${user.used_today || 0}</span>
      <span>${currentLang === "en" ? "Favorites" : "Favoritos"}: ${user.favorites_count || 0}</span>
      <span>${currentLang === "en" ? "Suggested plan" : "Plano sugerido"}: ${Number(user.used_today || 0) >= 3 ? "Pro" : "Starter"}</span>
    `;
    box.appendChild(row);
  });
}

// =========================
// NÍVEL 8.5 — ENGAGEMENT ENGINE
// =========================

function getEngagementBox() {
  return document.getElementById("engagementBox");
}

function renderEngagementLists() {
  const box = getEngagementBox();
  if (!box) return;

  box.innerHTML = `
    <div class="eng-section">
      <h4>🔥 Mais analisadas hoje</h4>
      <div class="eng-list">
        <button onclick="quickAnalyze('AAPL')">AAPL</button>
        <button onclick="quickAnalyze('TSLA')">TSLA</button>
        <button onclick="quickAnalyze('NVDA')">NVDA</button>
      </div>
    </div>

    <div class="eng-section">
      <h4>🚀 Subindo agora</h4>
      <div class="eng-list">
        <button onclick="quickAnalyze('META')">META</button>
        <button onclick="quickAnalyze('AMZN')">AMZN</button>
      </div>
    </div>

    <div class="eng-section">
      <h4>📉 Caindo forte</h4>
      <div class="eng-list">
        <button onclick="quickAnalyze('PETR4')">PETR4</button>
        <button onclick="quickAnalyze('VALE3')">VALE3</button>
      </div>
    </div>
  `;
}

// =========================
// NÍVEL 8.6 — RANKING DINÂMICO
// =========================

function getRecentSearchesKey() {
  return "recent_searches_rank";
}

function saveRecentSearch(symbol) {
  const normalized = displaySymbol(normalizeSymbol(symbol));
  const current = JSON.parse(localStorage.getItem(getRecentSearchesKey()) || "[]");
  const filtered = current.filter((item) => item !== normalized);
  filtered.unshift(normalized);
  const limited = filtered.slice(0, 8);
  localStorage.setItem(getRecentSearchesKey(), JSON.stringify(limited));
}

function getRecentSearches() {
  return JSON.parse(localStorage.getItem(getRecentSearchesKey()) || "[]");
}

function renderDynamicMarketLists() {
  const box = getEngagementBox();
  if (!box) return;

  const history = getAnalysisHistory();
  const recent = getRecentSearches();

  const renderButtons = (items, emptyText, scoreKey = "changePercent") => items.length
    ? items.map((item) => {
        const symbol = typeof item === "string" ? item : item.symbol;
        const metric = typeof item === "string"
          ? ""
          : `<small>${scoreKey === "changePercent" ? formatSignedPercent(item.changePercent) : `${Number(item?.[scoreKey] || 0)}/100`}</small>`;
        return `<button type="button" onclick="quickAnalyze('${symbol}')">${symbol}${metric}</button>`;
      }).join("")
    : `<span class="eng-empty">${emptyText}</span>`;

  if (!history.length) {
    const starterList = ["AAPL", "NVDA", "MSFT", "PETR4"];
    box.innerHTML = `
      <div class="market-side-intro-top">
        <span class="market-side-kicker">${currentLang === "en" ? "Smart scanner" : "Radar inteligente"}</span>
        <span class="market-live-dot"></span>
      </div>
      <h3>${currentLang === "en" ? "Quick market radar" : "Radar rápido do mercado"}</h3>
      <p>${currentLang === "en" ? "Analyze a few assets and this block will start ranking momentum, pressure and timing automatically." : "Analise alguns ativos e este bloco começará a ranquear momentum, pressão e timing automaticamente."}</p>
      <div class="eng-section">
        <h4>🚀 ${currentLang === "en" ? "Start here" : "Comece por aqui"}</h4>
        <div class="eng-list">${renderButtons(starterList, "")}</div>
      </div>
    `;
    return;
  }

  const hottest = [...history].sort((a, b) => Number(b.hotScore || 0) - Number(a.hotScore || 0)).slice(0, 3);
  const bullish = [...history].sort((a, b) => Number(b.buyScore || 0) - Number(a.buyScore || 0)).slice(0, 3);
  const bearish = [...history].sort((a, b) => Number(b.sellScore || 0) - Number(a.sellScore || 0)).slice(0, 3);
  const latest = [...history].sort((a, b) => Number(b.fetchedAt || 0) - Number(a.fetchedAt || 0)).slice(0, 3);

  const lead = bullish[0] || hottest[0] || latest[0] || bearish[0];
  const leadText = lead
    ? `${lead.symbol} • ${currentLang === "en" ? "Score" : "Score"} ${Number(lead.score || 0)}/100 • ${lead.decision || lead.trendLabel || ""}`.trim()
    : (currentLang === "en" ? "No active reading yet." : "Sem leitura ativa ainda.");

  box.innerHTML = `
    <div class="market-side-intro-top">
      <span class="market-side-kicker">${currentLang === "en" ? "Smart scanner" : "Radar inteligente"}</span>
      <span class="market-live-dot"></span>
    </div>
    <h3>${currentLang === "en" ? "Quick market radar" : "Radar rápido do mercado"}</h3>
    <p>${leadText}</p>

    <div class="eng-section">
      <h4>🔥 ${currentLang === "en" ? "Hot pulse" : "Pulso quente"}</h4>
      <div class="eng-list">${renderButtons(hottest, currentLang === "en" ? "No signals yet." : "Sem sinais ainda.", "hotScore")}</div>
    </div>

    <div class="eng-section">
      <h4>📈 ${currentLang === "en" ? "Buying strength" : "Força compradora"}</h4>
      <div class="eng-list">${renderButtons(bullish, currentLang === "en" ? "Need more bullish reads." : "Precisa de mais leituras de alta.", "buyScore")}</div>
    </div>

    <div class="eng-section">
      <h4>📉 ${currentLang === "en" ? "Selling pressure" : "Pressão vendedora"}</h4>
      <div class="eng-list">${renderButtons(bearish, currentLang === "en" ? "No bearish pressure in cache." : "Sem pressão de baixa no cache.", "sellScore")}</div>
    </div>

    <div class="eng-section">
      <h4>🕘 ${currentLang === "en" ? "Last readings" : "Últimas leituras"}</h4>
      <div class="eng-list">${renderButtons(latest, currentLang === "en" ? "Start analyzing." : "Comece analisando.", "score")}</div>
    </div>
  `;

  if (recent.length && !history.some((item) => item.symbol === recent[0])) {
    box.innerHTML += `
      <div class="eng-section">
        <h4>⚡ ${currentLang === "en" ? "Quick revisit" : "Retomar rápido"}</h4>
        <div class="eng-list">${renderButtons(recent.slice(0, 4), "")}</div>
      </div>
    `;
  }
}

function renderSuggestions(symbol) {
  const normalized = typeof symbol === "string" ? displaySymbol(normalizeSymbol(symbol)) : displaySymbol(normalizeSymbol(symbol?.symbol || currentSymbol));
  const snapshot = latestAnalysisSnapshot && latestAnalysisSnapshot.symbol === normalized ? latestAnalysisSnapshot : getAnalysisHistory().find((item) => item.symbol === normalized) || latestAnalysisSnapshot;

  const map = {
    AAPL: ["MSFT", "NVDA", "AMZN"],
    TSLA: ["NVDA", "META", "AAPL"],
    PETR4: ["VALE3", "ITUB4", "BBDC4"],
    VALE3: ["PETR4", "ITUB4", "BBAS3"],
    NVDA: ["AAPL", "MSFT", "TSLA"],
    AMZN: ["AAPL", "META", "MSFT"],
    META: ["AMZN", "GOOGL", "AAPL"]
  };

  const list = map[normalized] || ["AAPL", "TSLA", "NVDA"];
  const box = document.getElementById("suggestionsBox");
  if (!box) return;

  const insightLine = snapshot
    ? `${snapshot.trendLabel} • ${snapshot.setup} • ${snapshot.newsTone}`
    : (currentLang === "en" ? "Run an analysis to unlock correlations and timing ideas." : "Rode uma análise para liberar correlações e ideias de timing.");

  box.innerHTML = `
    <div class="eng-section">
      <h4>🧠 ${currentLang === "en" ? "Smart panel" : "Painel inteligente"}</h4>
      <div class="eng-list">
        ${list.map((s) => `<button type="button" onclick="quickAnalyze('${s}')">${s}</button>`).join("")}
      </div>
      <span class="eng-empty">${insightLine}</span>
    </div>
  `;
}

function quickAnalyze(symbol) {
  if (symbolInput) {
    symbolInput.value = displaySymbol(normalizeSymbol(symbol));
  }
  handleSearch();
}

// =========================
// MODO DIAGNÓSTICO — VALIDAÇÃO GERAL
// =========================
// =========================
// MODO DIAGNÓSTICO — VALIDAÇÃO GERAL
// =========================

function getDiagnosticsWrapper() {
  return document.getElementById("diagnosticsPanelWrapper");
}

function getDiagnosticsPanel() {
  return document.getElementById("diagnosticsPanel");
}

function getDiagnosticsList() {
  return document.getElementById("diagnosticsList");
}

function getDiagnosticsSummary() {
  return document.getElementById("diagnosticsSummary");
}

function getDiagnosticsRunBtn() {
  return document.getElementById("runDiagnosticsBtn");
}

function getDiagnosticsLastRun() {
  return document.getElementById("diagnosticsLastRun");
}

function showDiagnosticsForAdminOnly() {
  const wrapper = getDiagnosticsWrapper();
  if (!wrapper) return;

  if (isAdminUser && currentUser) {
    wrapper.style.display = "block";
    wrapper.classList.remove("hidden");
  } else {
    wrapper.style.display = "none";
    wrapper.classList.add("hidden");
  }
}

function setDiagnosticsSummary(text) {
  const el = getDiagnosticsSummary();
  if (el) el.textContent = text;
}

function setDiagnosticsLastRun() {
  const el = getDiagnosticsLastRun();
  if (!el) return;
  const now = new Date();
  el.textContent = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
}

function diagItem(label, ok, details) {
  return {
    label,
    ok: !!ok,
    details: details || (ok ? "OK" : "Falhou")
  };
}

function renderDiagnostics(items) {
  const list = getDiagnosticsList();
  if (!list) return;

  list.innerHTML = "";

  let okCount = 0;
  items.forEach((item) => {
    if (item.ok) okCount++;

    const row = document.createElement("div");
    row.className = `diag-item ${item.ok ? "diag-ok" : "diag-fail"}`;
    row.innerHTML = `
      <div class="diag-item-top">
        <strong>${item.ok ? "✅" : "❌"} ${item.label}</strong>
      </div>
      <div class="diag-item-details">${item.details}</div>
    `;
    list.appendChild(row);
  });

  setDiagnosticsSummary(`${okCount}/${items.length} verificações OK`);
  setDiagnosticsLastRun();
}

async function runDiagnostics() {
  const runBtn = getDiagnosticsRunBtn();
  if (runBtn) {
    runBtn.disabled = true;
    runBtn.textContent = currentLang === "en" ? "Running full scan..." : "Rodando varredura...";
  }

  const items = [];

  try {
    setDiagnosticsSummary(currentLang === "en" ? "Executing full scan..." : "Executando varredura completa...");

    items.push(diagItem("HTML: symbolInput", !!document.getElementById("symbolInput"), "Campo principal de ticker"));
    items.push(diagItem("HTML: compareInput", !!document.getElementById("compareInput"), "Campo de comparação"));
    items.push(diagItem("HTML: usageBadge", !!document.getElementById("usageBadge"), "Badge de uso"));
    items.push(diagItem("HTML: adminSection", !!document.getElementById("adminSection"), "Painel admin"));
    items.push(diagItem("HTML: upgradeBanner", !!document.getElementById("upgradeBanner"), "Banner 8.4"));
    items.push(diagItem("HTML: engagementBox", !!document.getElementById("engagementBox"), "Radar 8.5/8.6"));
    items.push(diagItem("HTML: suggestionsBox", !!document.getElementById("suggestionsBox"), "Sugestões pós-análise"));
    items.push(diagItem("HTML: diagnosticsPanel", !!document.getElementById("diagnosticsPanel"), "Painel de diagnóstico"));

    items.push(diagItem("JS: handleSearch", typeof handleSearch === "function", "Função principal de análise"));
    items.push(diagItem("JS: fetchUsage", typeof fetchUsage === "function", "Uso diário"));
    items.push(diagItem("JS: trackEvent", typeof trackEvent === "function", "Tracking 8.2"));
    items.push(diagItem("JS: showSmartUpgrade", typeof showSmartUpgrade === "function", "Conversão 8.4"));
    items.push(diagItem("JS: renderDynamicMarketLists", typeof renderDynamicMarketLists === "function", "Radar 8.6"));
    items.push(diagItem("JS: quickAnalyze", typeof quickAnalyze === "function", "Clique rápido"));

    items.push(diagItem("Estado: usuário", !!currentUser, currentUser ? `Logado: ${currentUser.email || "-"}` : "Sem login"));
    items.push(diagItem("Estado: plano", !!currentPlan, `Plano: ${currentPlan} / ${currentPlanStatus}`));
    items.push(diagItem("Estado: idioma", !!currentLang, `Idioma: ${currentLang}`));
    items.push(diagItem("Estado: admin", true, isAdminUser ? "Admin reconhecido" : "Usuário comum"));

    try {
      const health = await fetchJSON("/api/health");
      items.push(diagItem("API: /api/health", !!health?.ok, "Backend ativo"));
    } catch (error) {
      items.push(diagItem("API: /api/health", false, error.message));
    }

    try {
      const config = await fetchJSON("/api/public-config");
      items.push(diagItem("API: /api/public-config", !!config?.supabaseUrl, "Config pública carregada"));
    } catch (error) {
      items.push(diagItem("API: /api/public-config", false, error.message));
    }

    try {
      const usage = await fetchUsage();
      items.push(diagItem("API: /api/me/usage", !!usage, usage ? `Restantes: ${usage.remaining}` : "Sem resposta"));
    } catch (error) {
      items.push(diagItem("API: /api/me/usage", false, error.message));
    }

    if (currentUser) {
      try {
        const sub = await fetchAuthJSON("/api/me/subscription");
        items.push(diagItem("API: /api/me/subscription", !!sub, `Recebido: ${sub?.plan || "-"}`));
      } catch (error) {
        items.push(diagItem("API: /api/me/subscription", false, error.message));
      }

      try {
        const favs = await fetchAuthJSON("/api/me/favorites");
        items.push(diagItem("API: /api/me/favorites", Array.isArray(favs), `Favoritos: ${Array.isArray(favs) ? favs.length : "-"}`));
      } catch (error) {
        items.push(diagItem("API: /api/me/favorites", false, error.message));
      }

      try {
        const portfolio = await fetchAuthJSON("/api/me/portfolio");
        items.push(diagItem("API: /api/me/portfolio", Array.isArray(portfolio), `Carteira: ${Array.isArray(portfolio) ? portfolio.length : "-"}`));
      } catch (error) {
        items.push(diagItem("API: /api/me/portfolio", false, error.message));
      }
    } else {
      items.push(diagItem("API autenticada", true, "Pulada sem login"));
    }

    if (isAdminUser && currentUser) {
      try {
        const adminMe = await fetchAuthJSON("/api/admin/me");
        items.push(diagItem("API: /api/admin/me", !!adminMe?.isAdmin, "Admin validado"));
      } catch (error) {
        items.push(diagItem("API: /api/admin/me", false, error.message));
      }

      try {
        const dash = await fetchAuthJSON("/api/admin/dashboard");
        items.push(diagItem("API: /api/admin/dashboard", !!dash?.totals, "Dashboard carregado"));
      } catch (error) {
        items.push(diagItem("API: /api/admin/dashboard", false, error.message));
      }

      try {
        const users = await fetchAuthJSON("/api/admin/users");
        items.push(diagItem("API: /api/admin/users", Array.isArray(users), `Usuários: ${Array.isArray(users) ? users.length : "-"}`));
      } catch (error) {
        items.push(diagItem("API: /api/admin/users", false, error.message));
      }
    } else {
      items.push(diagItem("API admin", true, "Pulada sem admin"));
    }

    items.push(diagItem("8.2: tracking", typeof trackEvent === "function", "Tracking pronto"));
    items.push(diagItem("8.3: CTA upgrade", typeof openUpgrade === "function", "Upgrade pronto"));
    items.push(diagItem("8.4: leads quentes", typeof renderAdminHotLeads === "function", "Leads disponíveis"));
    items.push(diagItem("8.5: engagement", !!document.getElementById("engagementBox"), "Bloco engagement presente"));
    items.push(diagItem("8.6: ranking local", typeof getRecentSearches === "function", "Ranking local pronto"));
  } catch (error) {
    items.push(diagItem("Varredura geral", false, error.message));
  }

  renderDiagnostics(items);

  if (runBtn) {
    runBtn.disabled = false;
    runBtn.textContent = currentLang === "en" ? "Run diagnostics" : "Rodar diagnóstico";
  }

  return items;
}

function bindDiagnosticsEvents() {
  const runBtn = getDiagnosticsRunBtn();
  if (runBtn) {
    runBtn.onclick = async () => {
      await runDiagnostics();
    };
  }
}

init();

// =========================
// FASE 2 — TERMINAL LAYOUT PREMIUM
// =========================

function syncActiveMarketButtons() {
  const active = displaySymbol(normalizeSymbol(currentSymbol || ""));
  document.querySelectorAll(".watch-btn").forEach((btn) => {
    const btnSymbol = displaySymbol(normalizeSymbol(btn.dataset.symbol || btn.textContent || ""));
    btn.classList.toggle("watch-btn-active", !!active && btnSymbol === active);
  });
}



// ===============================
// FUNÇÃO COMPLETA - fetchAdminMine
// ===============================
async function fetchAdminMine() {
  try {
    if (!currentAccessToken) {
      console.warn("fetchAdminMine: sem token");
      return null;
    }

    const res = await fetch("/api/admin/me", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${currentAccessToken}`,
        "Content-Type": "application/json"
      }
    });

    if (res.status === 403) {
      console.log("Usuário não é admin");

      currentPlan = currentPlan || "free";
      currentPlanStatus = currentPlanStatus || "active";

      if (typeof updatePlanUI === "function") {
        updatePlanUI();
      }

      return { role: "user" };
    }

    if (!res.ok) {
      console.warn("fetchAdminMine erro:", res.status);
      return null;
    }

    const data = await res.json();

    if (data?.plan) currentPlan = data.plan;
    if (data?.status) currentPlanStatus = data.status;

    if (typeof updatePlanUI === "function") {
      updatePlanUI();
    }

    if (data?.is_admin) {
      console.log("Admin detectado");

      const adminSection = document.getElementById("adminSection");
      if (adminSection) adminSection.classList.remove("hidden");

      if (typeof loadAdminDashboard === "function") {
        loadAdminDashboard();
      }

      if (typeof loadAdminUsers === "function") {
        loadAdminUsers();
      }
    }

    return data;
  } catch (err) {
    console.error("fetchAdminMine crash:", err.message);
    return null;
  }
}

// === BLINDAGEM FINAL APLICADA (TIMEFRAME + SINCRONISMO) ===
