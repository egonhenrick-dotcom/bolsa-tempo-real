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
    watchlistNewsChart: "Watchlist, favorites, news and chart.",
    premiumDesc: "Asset comparison, portfolio and premium resources.",
    heroTitle: "Gain an advantage in the market before others",
    heroText: "Track stocks in real time, compare assets and build your portfolio with intelligence.",
    heroStart: "Start now",
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
    autocompleteTopMatch: "Top match"
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
    watchlistNewsChart: "Watchlist, favoritos, notícias e gráfico.",
    premiumDesc: "Comparação de ativos, carteira e recursos premium.",
    heroTitle: "Ganhe vantagem no mercado antes dos outros",
    heroText: "Acompanhe ações em tempo real, compare ativos e monte sua carteira com inteligência.",
    heroStart: "Começar agora",
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
    autocompleteTopMatch: "Melhor resultado"
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

function hasReachedLimit() {
  if (!usageData) return false;
  if (usageData.limit === "∞") return false;
  return Number(usageData.remaining) <= 0;
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

async function fetchCandlesByTimeframe(symbol, authenticated = true) {
  const url = `/api/candles/${encodeURIComponent(symbol)}?${getTimeframeQuery()}`;
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
    return currentLang === "en" ? "Yahoo backup" : "Backup Yahoo";
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

function clearAnalysisUI() {
  currentSymbol = "";
  stopAutoRefresh();
  if (companyCard) companyCard.classList.add("hidden");
  if (quoteGrid) quoteGrid.classList.add("hidden");
  if (chartCard) chartCard.classList.add("hidden");
  if (newsSection) newsSection.classList.add("hidden");
  if (chart) chart.innerHTML = "";
  if (newsList) newsList.innerHTML = "";
  if (analysisHeroPrice) analysisHeroPrice.textContent = "--";
  if (analysisHeroMeta) analysisHeroMeta.textContent = currentLang === "en" ? "Waiting for analysis" : "Aguardando análise";
  updateAnalysisStageBadge(currentLang === "en" ? "Waiting for asset" : "Aguardando ativo", "neutral");
  updateChartHeader("");
  setStatus(t("typeTicker"));
  syncActiveMarketButtons();
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
    if (portfolioSection) portfolioSection.classList.add("hidden");
    return;
  }

  if (userBadge) userBadge.textContent = currentUser.email || "Usuário";
  if (signOutBtn) signOutBtn.classList.remove("hidden");

  if (currentPlan === "pro" && currentPlanStatus === "active") {
    if (portfolioSection) portfolioSection.classList.remove("hidden");
    if (portfolioStatus) portfolioStatus.textContent = t("portfolioEnabled");
  } else {
    if (portfolioSection) portfolioSection.classList.add("hidden");
    if (portfolioStatus) portfolioStatus.textContent = t("portfolioLocked");
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

function drawChart(candles, compareCandles = null) {
  if (!chart) return;

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
          return;
        }

        const candlePoint = param.seriesData?.get(candleSeries);
        const open = Number(candlePoint?.open);
        const high = Number(candlePoint?.high);
        const low = Number(candlePoint?.low);
        const close = Number(candlePoint?.close);

        if ([open, high, low, close].some((value) => !Number.isFinite(value))) {
          toolTip.style.display = "none";
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

function renderOverview(quote) {
  if (!marketOverview) return;
  marketOverview.innerHTML = `
    <div class="mini-card market-hero-card">
      <span class="symbol">${displaySymbol(currentSymbol)}</span>
      <strong class="price">${formatPrice(quote?.c)}</strong>
      <span class="change">${getQuoteSourceLabel(quote)}</span>
    </div>
  `;
  updateAnalysisHero(quote, currentSymbol);
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

async function handleSearch(silentRefresh = false) {
  if (isSearchingNow) return;
  const symbol = normalizeSymbol(symbolInput?.value);
  const compareSymbol = normalizeSymbol(compareInput?.value);

  if (!symbol) {
    setStatus(t("enterValidTicker"));
    return;
  }

  if (!currentUser) {
    currentPlan = "free";
    currentPlanStatus = "inactive";
    updatePlanUI();
  }

  const usageBefore = await refreshUsage();

  if (usageBefore && usageBefore.limit !== "∞" && Number(usageBefore.remaining) <= 0) {
    await trackEvent("daily_limit_reached", {
      symbol,
      plan: currentPlan,
      status: currentPlanStatus,
      remaining: usageBefore.remaining
    });
    await showSmartUpgrade("limit", { symbol, remaining: usageBefore.remaining });
    setStatus(`🚫 ${t("dailyLimitReached")} • 👉 ${t("upgradePlan")}`);
    if (searchBtn) {
      searchBtn.disabled = true;
      searchBtn.style.opacity = "0.5";
    }
    return;
  }

  currentSymbol = symbol;
  updateFavoriteButton();

  if (isSearchingNow) {
    return;
  }

  const requestId = ++activeSearchRequestId;
  setSearchLoadingState(true);
  setChartLoadingState(true);

  if (!silentRefresh) {
    updateAnalysisStageBadge(`${displaySymbol(symbol)} • ${currentLang === "en" ? "Analyzing" : "Analisando"}`, "info");
    setStatus(`${currentLang === "en" ? "Analyzing" : "Analisando"} ${displaySymbol(symbol)}...`);
  }

  try {
    const results = await Promise.allSettled([
      fetchAuthJSON(`/api/quote/${symbol}`),
      fetchAuthJSON(`/api/profile/${symbol}`),
      fetchCandlesByTimeframe(symbol, true),
      fetchAuthJSON(`/api/news/${symbol}`)
    ]);

    const quote = results[0].status === "fulfilled"
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
        if (chartLabel) chartLabel.textContent = t("last7days");
      } else {
        const compareData = await fetchCandlesByTimeframe(compareSymbol, true);
        compareCandles = compareData?.s === "ok" ? compareData : null;
      }
    }

    if (companyName) companyName.textContent = profile.name || displaySymbol(symbol);
    if (companyTicker) companyTicker.textContent = displaySymbol(symbol);
    if (companyExchange) {
      const exchangeLabel = profile.exchange || t("exchange");
      companyExchange.textContent = `${exchangeLabel} • ${getQuoteSourceLabel(quote)}`;
    }

    if (currentPrice) currentPrice.textContent = formatPrice(quote.c);
    if (changePercent) changePercent.textContent = `${Number(quote.dp || 0).toFixed(2)}%`;
    if (openPrice) openPrice.textContent = formatPrice(quote.o);
    if (highPrice) highPrice.textContent = formatPrice(quote.h);
    if (lowPrice) lowPrice.textContent = formatPrice(quote.l);
    if (prevClose) prevClose.textContent = formatPrice(quote.pc);

    if (requestId !== activeSearchRequestId) return;

    const candleSeries = Array.isArray(candles?.c) ? candles.c : [];
    drawChart(candles, compareCandles);

    if (candleSeries.length < 2) {
      setStatus(`⚠️ ${displaySymbol(symbol)} sem dados suficientes para o gráfico em ${getTimeframeLabel(currentTimeframe)}.`);
    } else if (candles?.source || candles?.interval) {
      const chartInfo = [candles?.source || "chart", candles?.interval || ""].filter(Boolean).join(" • ");
      setStatus(`${t("updatedFor")} ${displaySymbol(symbol)} • ${getQuoteSourceLabel(quote)} • gráfico ${chartInfo}.`);
    }
    renderNews(news);
    renderOverview(quote);
    afterSuccessfulAnalysis(symbol);
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
      updateAnalysisStageBadge(`${displaySymbol(symbol)} • ${getQuoteSourceLabel(quote)}`, tone);
      setStatus(`${baseStatus} ${t("remainingToday")}: ${remaining}`);
    }

    startAutoRefresh(symbol);
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
      setStatus(`🚫 ${t("dailyLimitReached")} • 👉 ${t("upgradePlan")} (${t("remainingToday")}: ${remaining})`);
      if (searchBtn) {
        searchBtn.disabled = true;
        searchBtn.style.opacity = "0.5";
      }
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
    const redirectUrl = (appConfig?.appUrl || window.location.origin || "").replace(/\/$/, "");
    const { data, error } = await auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

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

  if (!currentUser) {
    await trackEvent("checkout_login_required", { plan });
    setStatus(t("loginFirstSubscribe"));
    return;
  }

  const priceId = plan === "pro" ? appConfig.prices.pro : appConfig.prices.starter;
  if (!priceId) {
    await trackEvent("checkout_missing_price", { plan });
    setStatus(t("stripePriceMissing"));
    return;
  }

  try {
    checkoutInFlight = true;
    if (starterBtn) starterBtn.disabled = true;
    if (proBtn) proBtn.disabled = true;
    await trackEvent("upgrade_click", { plan });
    const data = await fetchAuthJSON("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan })
    });

    window.location.href = data.url;
  } catch (error) {
    setStatus(error.message);
  } finally {
    checkoutInFlight = false;
    if (starterBtn) starterBtn.disabled = false;
    if (proBtn) proBtn.disabled = false;
  }
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

  if (data.plan) {
    currentPlan = data.plan || "free";
    currentPlanStatus = data.status || "inactive";
    updatePlanUI();
  }

  isAdminUser = !!data.isAdmin;

  const usageBadge = getUsageBadge();
  if (usageBadge) {
    usageBadge.textContent = `${t("remainingToday")}: ${data.remaining}`;
  }

  if (searchBtn) {
    const blocked = data.limit !== "∞" && Number(data.remaining) <= 0;
    searchBtn.disabled = blocked;
    searchBtn.style.opacity = blocked ? "0.5" : "1";
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
    ? "Unlock more power with a paid plan"
    : "Desbloqueie mais poder com um plano pago";
  let subtitle = currentLang === "en"
    ? "Choose the best plan for your next step."
    : "Escolha o melhor plano para o seu próximo passo.";
  let plan = "pro";

  if (kind === "limit") {
    title = currentLang === "en"
      ? "You reached today's limit"
      : "Você atingiu o limite de hoje";
    subtitle = currentLang === "en"
      ? "Upgrade to Pro for unlimited analyses and faster decision-making."
      : "Faça upgrade para Pro e tenha análises ilimitadas e decisões mais rápidas.";
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

  const recent = getRecentSearches();
  const recentHtml = recent.length
    ? recent.map((symbol) => `<button type="button" onclick="quickAnalyze('${symbol}')">${symbol}</button>`).join("")
    : `<span class="eng-empty">${currentLang === "en" ? "Start analyzing to build your ranking." : "Comece analisando para montar seu ranking."}</span>`;

  box.innerHTML = `
    <div class="eng-section">
      <h4>🔥 Mais analisadas hoje</h4>
      <div class="eng-list">
        <button type="button" onclick="quickAnalyze('AAPL')">AAPL</button>
        <button type="button" onclick="quickAnalyze('TSLA')">TSLA</button>
        <button type="button" onclick="quickAnalyze('NVDA')">NVDA</button>
        <button type="button" onclick="quickAnalyze('PETR4')">PETR4</button>
      </div>
    </div>

    <div class="eng-section">
      <h4>🚀 Subindo agora</h4>
      <div class="eng-list">
        <button type="button" onclick="quickAnalyze('META')">META</button>
        <button type="button" onclick="quickAnalyze('AMZN')">AMZN</button>
        <button type="button" onclick="quickAnalyze('MSFT')">MSFT</button>
      </div>
    </div>

    <div class="eng-section">
      <h4>📉 Caindo forte</h4>
      <div class="eng-list">
        <button type="button" onclick="quickAnalyze('VALE3')">VALE3</button>
        <button type="button" onclick="quickAnalyze('PETR4')">PETR4</button>
        <button type="button" onclick="quickAnalyze('TSLA')">TSLA</button>
      </div>
    </div>

    <div class="eng-section">
      <h4>🕘 Últimas que você viu</h4>
      <div class="eng-list">${recentHtml}</div>
    </div>
  `;
}

function renderSuggestions(symbol) {
  const normalized = displaySymbol(normalizeSymbol(symbol));
  const map = {
    AAPL: ["MSFT", "NVDA", "AMZN"],
    TSLA: ["NVDA", "META", "AAPL"],
    PETR4: ["VALE3", "ITUB4", "BBDC4"],
    VALE3: ["PETR4", "ITUB4", "BBAS3"],
    NVDA: ["AAPL", "MSFT", "TSLA"]
  };

  const list = map[normalized] || ["AAPL", "TSLA", "NVDA"];
  const box = document.getElementById("suggestionsBox");
  if (!box) return;

  box.innerHTML = `
    <div class="eng-section">
      <h4>🧠 ${currentLang === "en" ? "You may also like:" : "Você também pode gostar:"}</h4>
      <div class="eng-list">
        ${list.map((s) => `<button type="button" onclick="quickAnalyze('${s}')">${s}</button>`).join("")}
      </div>
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