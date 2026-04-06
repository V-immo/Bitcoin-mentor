"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import TradingChart from "./TradingChart";
import TerminalMentorPanel from "./TerminalMentorPanel";
import TerminalPaperPanel from "./TerminalPaperPanel";
import MentorChat from "./MentorChat";
import RisicoCalculator from "./RisicoCalculator";
import EntryChecklist from "./EntryChecklist";
import type { Candle, MentorSignal } from "@/lib/types";
import { SCAN_ASSETS, isFinnhubAsset, getAssetDef, getFinnhubSymbol } from "@/lib/assets";
import { useLanguage } from "@/contexts/LanguageContext";
import NewsPanel from "./NewsPanel";
import MarcusBriefing from "./MarcusBriefing";
import Leaderboard from "./Leaderboard";
import TestnetPanel from "./TestnetPanel";
import PriceAlerts from "./PriceAlerts";
import AITradeCoach from "./AITradeCoach";
import LiveSimpleMode from "./LiveSimpleMode";
import BitvavoPanel from "./BitvavoPanel";

type Props = { initialData: MentorSignal; initialAsset?: string };

const INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
type Interval = (typeof INTERVALS)[number];
type ViewMode = Interval | "multi";

// Asset groepen — labels via i18n in component
const ASSET_GROUPS_DEF: { key: "group_crypto" | "group_stocks" | "group_commodities"; types: string[] }[] = [
  { key: "group_crypto",       types: ["crypto"] },
  { key: "group_stocks",       types: ["stock", "etf"] },
  { key: "group_commodities",  types: ["metal"] },
];

function nlTrend(val: string, lang: string): string {
  if (lang === "en") {
    const map: Record<string, string> = {
      bullish: "rising", bearish: "falling", neutral: "sideways",
      strong: "strong", weak: "weak", ok: "ok",
    };
    return map[val?.toLowerCase()] ?? val;
  }
  const map: Record<string, string> = {
    bullish: "stijgt", bearish: "daalt", neutral: "zijwaarts",
    strong: "sterk", weak: "zwak", ok: "goed",
  };
  return map[val?.toLowerCase()] ?? val;
}

// Prijsformattering per asset type
function fmtPrice(price: number, symbol: string): string {
  const def = getAssetDef(symbol);
  if (!def) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (def.type === "crypto") {
    if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    if (price >= 10)   return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchBinanceCandles(symbol: string, interval: string): Promise<Candle[]> {
  try {
    const res = await fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchCandles(symbol: string, interval: string): Promise<Candle[]> {
  if (isFinnhubAsset(symbol)) {
    try {
      const res = await fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}`);
      if (!res.ok) return [];
      return await res.json();
    } catch { return []; }
  }
  return fetchBinanceCandles(symbol, interval);
}

async function fetchFuturesData(symbol: string) {
  try {
    const [premRes, oiRes] = await Promise.all([
      fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`),
      fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`),
    ]);
    const fundingRate = premRes.ok
      ? ((await premRes.json()).lastFundingRate * 100).toFixed(4) + "%"
      : "n.v.t.";
    const ticker = symbol.replace("USDT", "");
    const openInterest = oiRes.ok
      ? (parseFloat((await oiRes.json()).openInterest) / 1000).toFixed(1) + ` K ${ticker}`
      : "n.v.t.";
    return { fundingRate, openInterest };
  } catch {
    return { fundingRate: "n.v.t.", openInterest: "n.v.t." };
  }
}

type BottomTab = "paper" | "chat" | "nieuws" | "checklist" | "briefing";

// Tabs zichtbaar in balk
const PRIMARY_TABS: BottomTab[] = ["paper", "checklist", "briefing", "nieuws"];

export default function RealtimeDashboard({ initialData, initialAsset = "BTCUSDT" }: Props) {
  const { t, lang } = useLanguage();

  // Vertaalde arrays — reageren op taalwisseling
  const TIMEFRAMES_CRYPTO: { key: ViewMode; label: string; desc: string }[] = [
    { key: "1m",    label: "1m",        desc: t("tf_1m_desc") },
    { key: "5m",    label: "5m",        desc: t("tf_5m_desc") },
    { key: "15m",   label: "15m",       desc: t("tf_15m_desc") },
    { key: "1h",    label: "1H",        desc: t("tf_1h_desc") },
    { key: "4h",    label: "4H",        desc: t("tf_4h_desc") },
    { key: "1d",    label: "1D",        desc: t("tf_1d_desc") },
    { key: "multi", label: t("tf_multi_label"), desc: t("tf_multi_desc_crypto") },
  ];
  const TIMEFRAMES_FINNHUB: { key: ViewMode; label: string; desc: string }[] = [
    { key: "1m",    label: "1m",        desc: t("tf_1m_desc") },
    { key: "5m",    label: "5m",        desc: t("tf_5m_desc") },
    { key: "15m",   label: "15m",       desc: t("tf_15m_desc") },
    { key: "1h",    label: "1H",        desc: t("tf_1h_desc") },
    { key: "1d",    label: "1D",        desc: t("tf_1d_desc") },
    { key: "multi", label: t("tf_multi_label"), desc: t("tf_multi_desc_stock") },
  ];
  const MULTI_TFS_CRYPTO = [
    { key: "1d" as Interval, label: t("mtf_1d"),  hint: t("mtf_hint_trend") },
    { key: "4h" as Interval, label: t("mtf_4h"),  hint: t("mtf_hint_setup") },
    { key: "1h" as Interval, label: t("mtf_1h"),  hint: t("mtf_hint_entry") },
  ];
  const MULTI_TFS_FINNHUB = [
    { key: "1d"  as Interval, label: t("mtf_1d"),  hint: t("mtf_hint_trend") },
    { key: "1h"  as Interval, label: t("mtf_1h"),  hint: t("mtf_hint_setup") },
    { key: "15m" as Interval, label: t("mtf_15m"), hint: t("mtf_hint_entry") },
  ];
  const ASSET_GROUPS = ASSET_GROUPS_DEF.map(g => ({ label: t(g.key), types: g.types }));
  const BOTTOM_TABS: { key: BottomTab; label: string; icon: string; mobileOnly?: boolean }[] = [
    { key: "chat",      label: t("nav_marcus_ai"), icon: "👤", mobileOnly: true },
    { key: "paper",     label: t("tab_trade"),      icon: "📊" },
    { key: "checklist", label: t("nav_checklist"), icon: "✅" },
    { key: "briefing",  label: t("tab_briefing"),  icon: "💡" },
    { key: "nieuws",    label: t("nav_news"),       icon: "📰" },
  ];

  const [asset, setAsset] = useState<string>(initialAsset);
  const [signal, setSignal] = useState<MentorSignal>(initialData);
  const [bottomTab, setBottomTab] = useState<BottomTab>("paper");
  const [signalStripOpen, setSignalStripOpen] = useState(false);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1200px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const [signalAsset, setSignalAsset] = useState<string>(initialAsset);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState("");
  const [livePrice, setLivePrice] = useState<number>(initialData.price);
  const [change24h, setChange24h] = useState<number>(0);
  const [activeInterval, setActiveInterval] = useState<ViewMode>(isFinnhubAsset(initialAsset) ? "1d" : "4h");
  const [candleMap, setCandleMap] = useState<Record<string, Candle[]>>({
    "1m": [], "5m": [], "15m": [], "1h": [], "4h": initialData.chartCandles4h, "1d": [],
  });
  const [priceWsState, setPriceWsState] = useState("connecting");
  const [klineWsState, setKlineWsState] = useState("connecting");
  const [lastTickLabel, setLastTickLabel] = useState("");
  const [fundingRate, setFundingRate] = useState("—");
  const [openInterest, setOpenInterest] = useState("—");
  const [zoneAlert, setZoneAlert] = useState<string | null>(null);
  const [autoExecuteAmount, setAutoExecuteAmount] = useState<number | null>(null);

  const isBinance = !isFinnhubAsset(asset);
  const assetDef = getAssetDef(asset);
  const TIMEFRAMES = isBinance ? TIMEFRAMES_CRYPTO : TIMEFRAMES_FINNHUB;
  const MULTI_TFS = isBinance ? MULTI_TFS_CRYPTO : MULTI_TFS_FINNHUB;

  // Laad tradingMode uit DB instellingen
  const [tradingMode, setTradingMode] = useState<string>("swing");
  useEffect(() => {
    fetch("/api/me/settings")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.tradingMode) setTradingMode(d.tradingMode); })
      .catch(() => {});
  }, []);

  // Browser push notificaties
  const [notifAllowed, setNotifAllowed] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") setNotifAllowed(true);
    }
  }, []);

  async function requestNotifPermission() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifAllowed(perm === "granted");
  }

  const priceWsRef = useRef<WebSocket | null>(null);
  const klineWsRef = useRef<WebSocket | null>(null);
  const wasInZoneRef = useRef(false);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset activeInterval als het niet beschikbaar is voor dit asset
  useEffect(() => {
    const available = isFinnhubAsset(asset) ? TIMEFRAMES_FINNHUB : TIMEFRAMES_CRYPTO;
    const keys = available.map(t => t.key);
    if (!keys.includes(activeInterval)) setActiveInterval("1h");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset]);

  // Laad alle candles bij asset-wissel — actief interval eerst voor snelle weergave
  useEffect(() => {
    let cancelled = false;
    setCandleMap({ "1m": [], "5m": [], "15m": [], "1h": [], "4h": [], "1d": [] });

    async function loadAll() {
      // Stap 1: laad actief interval direct (chart zichtbaar zo snel mogelijk)
      const priority = activeInterval === "multi" ? "1h" : activeInterval;
      const first = await fetchCandles(asset, priority as string);
      if (cancelled) return;
      setCandleMap(prev => ({ ...prev, [priority]: first }));

      // Stap 2: laad resterende intervals op de achtergrond
      const rest = INTERVALS.filter(iv => iv !== priority);
      const results = await Promise.all(rest.map(iv => fetchCandles(asset, iv)));
      if (cancelled) return;
      const extra: Record<string, Candle[]> = {};
      rest.forEach((iv, i) => { extra[iv] = results[i]; });
      setCandleMap(prev => ({ ...prev, ...extra }));
    }
    loadAll();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset]);

  // Futures data (funding rate + open interest)
  useEffect(() => {
    if (!isBinance) { setFundingRate("n.v.t."); setOpenInterest("n.v.t."); return; }
    async function load() {
      const d = await fetchFuturesData(asset);
      setFundingRate(d.fundingRate);
      setOpenInterest(d.openInterest);
    }
    load();
    const iv = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [asset, isBinance]);

  // Price WebSocket — Binance met auto-reconnect (exponential backoff)
  useEffect(() => {
    priceWsRef.current?.close();
    if (!isBinance) { setPriceWsState("offline"); return; }
    let destroyed = false;
    let backoffMs = 1000;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (destroyed) return;
      setPriceWsState("connecting");
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${asset.toLowerCase()}@ticker`);
      priceWsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          const price = parseFloat(data.c);
          const chg = parseFloat(data.P); // 24h percent change
          if (Number.isFinite(price) && price > 0) {
            setLivePrice(price);
            if (Number.isFinite(chg)) setChange24h(chg);
            setLastTickLabel(new Date().toLocaleTimeString("nl-BE"));
            setPriceWsState("live");
            backoffMs = 1000; // reset bij succes
          }
        } catch { /* ignore */ }
      };
      ws.onerror = () => setPriceWsState("error");
      ws.onclose = () => {
        if (destroyed) return;
        setPriceWsState("offline");
        timer = setTimeout(connect, backoffMs);
        backoffMs = Math.min(backoffMs * 2, 30_000);
      };
    }

    connect();
    return () => {
      destroyed = true;
      if (timer) clearTimeout(timer);
      priceWsRef.current?.close();
    };
  }, [asset, isBinance]);

  // Finnhub: WebSocket voor realtime prijs + REST fallback
  const finnhubWsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    if (isBinance) return;
    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? "";
    const finnhubSym = getFinnhubSymbol(asset);

    // REST: initiële prijs + change24h (ook fallback als markt dicht is)
    async function fetchPrice() {
      try {
        const res = await fetch(`/api/price?symbol=${encodeURIComponent(asset)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.price > 0) {
            setLivePrice(data.price);
            if (typeof data.change24h === "number") setChange24h(data.change24h);
            setLastTickLabel(new Date().toLocaleTimeString("nl-BE"));
            setPriceWsState("live");
          }
        }
      } catch { /* ignore */ }
    }
    fetchPrice();
    const pollIv = setInterval(fetchPrice, 30_000); // 30s REST fallback

    // WebSocket: realtime trades tijdens beurstijden
    if (apiKey) {
      finnhubWsRef.current?.close();
      setPriceWsState("connecting");
      const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
      finnhubWsRef.current = ws;
      ws.onopen = () => ws.send(JSON.stringify({ type: "subscribe", symbol: finnhubSym }));
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "trade" && msg.data?.length > 0) {
            const last = msg.data[msg.data.length - 1];
            if (Number.isFinite(last.p) && last.p > 0) {
              setLivePrice(last.p);
              setLastTickLabel(new Date().toLocaleTimeString("nl-BE"));
              setPriceWsState("live");
            }
          }
        } catch { /* ignore */ }
      };
      ws.onerror = () => setPriceWsState("error");
      ws.onclose = () => setPriceWsState(prev => prev === "live" ? "live" : "offline");
    }

    return () => {
      clearInterval(pollIv);
      if (finnhubWsRef.current?.readyState === WebSocket.OPEN) {
        finnhubWsRef.current.send(JSON.stringify({ type: "unsubscribe", symbol: finnhubSym }));
      }
      finnhubWsRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, isBinance]);

  // Kline WebSocket — live candles (Binance) met auto-reconnect
  const wsInterval: Interval = activeInterval === "multi" ? (isBinance ? "4h" : "1h") : activeInterval;
  useEffect(() => {
    klineWsRef.current?.close();
    if (!isBinance) { setKlineWsState("offline"); return; }
    let destroyed = false;
    let backoffMs = 1000;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (destroyed) return;
      setKlineWsState("connecting");
      const ws = new WebSocket(
        `wss://stream.binance.com:9443/ws/${asset.toLowerCase()}@kline_${wsInterval}`
      );
      klineWsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          const k = data.k;
          if (!k) return;
          const candle: Candle = {
            openTime: k.t, open: parseFloat(k.o), high: parseFloat(k.h),
            low: parseFloat(k.l), close: parseFloat(k.c), volume: parseFloat(k.v), closeTime: k.T,
          };
          setCandleMap((prev) => {
            const current = prev[wsInterval] || [];
            const last = current[current.length - 1];
            if (last && last.openTime === candle.openTime) {
              return { ...prev, [wsInterval]: [...current.slice(0, -1), candle] };
            }
            return { ...prev, [wsInterval]: [...current, candle].slice(-500) };
          });
          setKlineWsState("live");
          backoffMs = 1000; // reset bij succes
        } catch { /* ignore */ }
      };
      ws.onerror = () => setKlineWsState("error");
      ws.onclose = () => {
        if (destroyed) return;
        setKlineWsState("offline");
        timer = setTimeout(connect, backoffMs);
        backoffMs = Math.min(backoffMs * 2, 30_000);
      };
    }

    connect();
    return () => {
      destroyed = true;
      if (timer) clearTimeout(timer);
      klineWsRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, wsInterval, isBinance]);

  // Zone alert toast + browser notificatie
  useEffect(() => {
    const inZone = (signalAsset === asset) && livePrice >= signal.entryZoneLow && livePrice <= signal.entryZoneHigh;
    if (inZone && !wasInZoneRef.current) {
      const ticker = assetDef?.ticker ?? asset.replace("USDT", "");
      const msg = `🟢 ${ticker} is in de koopzone! $${Math.round(livePrice).toLocaleString("en-US")} — overweeg een entry.`;
      setZoneAlert(msg);
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
      alertTimerRef.current = setTimeout(() => setZoneAlert(null), 8000);
      // Browser notificatie (ook als tabblad op achtergrond staat)
      if (notifAllowed && "Notification" in window) {
        new Notification(`${ticker} koopzone bereikt!`, {
          body: `Prijs: $${Math.round(livePrice).toLocaleString("en-US")} staat in de koopzone`,
          icon: "/favicon.ico",
          tag: `zone-${ticker}`,
        });
      }
    }
    wasInZoneRef.current = inZone;
  }, [livePrice, signal.entryZoneLow, signal.entryZoneHigh, asset, signalAsset, notifAllowed, assetDef]);

  const chartPrice = useMemo(() => livePrice || signal.price, [livePrice, signal.price]);
  const visibleCandles = useMemo(() => candleMap[activeInterval === "multi" ? "1d" : activeInterval] || [], [candleMap, activeInterval]);
  const activeTf = TIMEFRAMES.find((t) => t.key === activeInterval) ?? TIMEFRAMES[0];
  const liveMode = isBinance ? priceWsState === "live" && klineWsState === "live" : priceWsState === "live";

  // Finnhub stocks: als chart leeg is voor huidig timeframe, toon melding en switch naar 1D
  const candlesEmpty = !isBinance && activeInterval !== "multi" && visibleCandles.length === 0;
  const dailyCandles = candleMap["1d"] || [];
  useEffect(() => {
    if (!isBinance && activeInterval !== "multi" && activeInterval !== "1d") {
      // Wacht tot candles geladen zijn, dan check of ze leeg zijn
      const timer = setTimeout(() => {
        const c = candleMap[activeInterval];
        if (c !== undefined && c.length === 0) setActiveInterval("1d");
      }, 3000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBinance, activeInterval, candleMap]);


  function handleAssetChange(sym: string) {
    localStorage.setItem("bitcoin-mentor-selected-asset", sym);
    setAsset(sym);
    setBottomTab("chat");
  }

  async function refreshSignal(sym?: string) {
    if (refreshing) return;
    const targetAsset = sym ?? asset;
    setRefreshing(true);
    try {
      const res = await fetch("/api/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: targetAsset }),
      });
      if (res.ok) {
        const data = await res.json();
        setSignal(data);
        setSignalAsset(targetAsset);
        setLastRefresh(new Date().toLocaleTimeString("nl-BE"));
      }
    } catch { /* ignore */ }
    setRefreshing(false);
  }

  useEffect(() => { refreshSignal(asset); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [asset]);
  useEffect(() => {
    const iv = setInterval(() => refreshSignal(), 15 * 60 * 1000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset]);

  const statusTone =
    signal.status === "Goed moment" ? "terminal-badge-green"
    : signal.status === "Nog even wachten" ? "terminal-badge-orange"
    : "terminal-badge-red";

  const signalReady = signalAsset === asset;

  const coachAnalysis = useMemo(() => {
    const inBuyZone = chartPrice >= signal.entryZoneLow && chartPrice <= signal.entryZoneHigh;
    const aboveBuyZone = chartPrice > signal.entryZoneHigh;
    const belowBuyZone = chartPrice < signal.entryZoneLow;
    if (signal.blockers.length > 0) return {
      headline: t("advice_no_buy_title"),
      verdict: t("advice_no_buy_verdict"),
      bestAction: t("advice_no_buy_action"),
      biggestMistake: t("advice_no_buy_mistake"),
      lesson: t("advice_no_buy_lesson"),
      marketTone: t("advice_no_buy_tone"),
    };
    if (signal.status === "Goed moment" && inBuyZone) return {
      headline: t("advice_entry_title"),
      verdict: t("advice_entry_verdict"),
      bestAction: t("advice_entry_action"),
      biggestMistake: t("advice_entry_mistake"),
      lesson: t("advice_entry_lesson"),
      marketTone: signal.trend4h === "bullish" ? t("advice_entry_tone_bull") : t("advice_entry_tone_mixed"),
    };
    if (aboveBuyZone) return {
      headline: t("advice_too_high_title"),
      verdict: t("advice_too_high_verdict"),
      bestAction: `${t("advice_too_high_action_prefix")} $${Math.round(signal.entryZoneLow).toLocaleString("en-US")}–$${Math.round(signal.entryZoneHigh).toLocaleString("en-US")}.`,
      biggestMistake: t("advice_too_high_mistake"),
      lesson: t("advice_too_high_lesson"),
      marketTone: t("advice_too_high_tone"),
    };
    if (belowBuyZone) return {
      headline: t("advice_wait_title"),
      verdict: t("advice_wait_verdict"),
      bestAction: t("advice_wait_action"),
      biggestMistake: t("advice_wait_mistake"),
      lesson: t("advice_wait_lesson"),
      marketTone: t("advice_wait_tone"),
    };
    return {
      headline: t("advice_default_title"),
      verdict: t("advice_default_verdict"),
      bestAction: t("advice_default_action"),
      biggestMistake: t("advice_default_mistake"),
      lesson: t("advice_default_lesson"),
      marketTone: t("advice_default_tone"),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartPrice, signal, lang]);

  const marketContext = useMemo(() =>
    [
      `Asset: ${assetDef ? `${assetDef.name} (${assetDef.ticker}) [${assetDef.type}]` : asset}`,
      `Prijs: $${fmtPrice(chartPrice, asset)}`,
      `24h: ${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%`,
      `Status: ${signal.status} — ${signal.action}`,
      `Score: ${signal.score}/100, Grade: ${signal.setupGrade}`,
      `Trends: Dagelijks ${nlTrend(signal.trend1d, lang)}, 4H ${nlTrend(signal.trend4h, lang)}, 1H ${nlTrend(signal.trend1h, lang)}`,
      `RSI: 4H ${signal.rsi4h.toFixed(1)}, Dagelijks ${signal.rsi1d.toFixed(1)}`,
      `Koopzone: ${signal.entryZoneText}`,
      `Support: $${Math.round(signal.supportZoneLow).toLocaleString("en-US")}–$${Math.round(signal.supportZoneHigh).toLocaleString("en-US")}`,
      `Resistance: $${Math.round(signal.resistanceZoneLow).toLocaleString("en-US")}–$${Math.round(signal.resistanceZoneHigh).toLocaleString("en-US")}`,
      `Stop-loss: $${Math.round(signal.stopLoss).toLocaleString("en-US")}, R/R: ${signal.riskRewardEstimate}`,
      isBinance ? `Funding rate: ${fundingRate}` : "",
      isBinance ? `Open interest: ${openInterest}` : "",
      signal.blockers.length > 0 ? `Blockers: ${signal.blockers.join(", ")}` : "",
      signal.warnings.length > 0 ? `Warnings: ${signal.warnings.join(", ")}` : "",
    ].filter(Boolean).join("\n"),
  [asset, chartPrice, change24h, signal, fundingRate, openInterest, isBinance, assetDef]
  );

  return (
    <main className="terminal-page">

      {/* ── Asset picker overlay ── */}
      {assetPickerOpen && (
        <div className="asset-overlay-backdrop" onClick={() => setAssetPickerOpen(false)}>
          <div className="asset-overlay-panel" onClick={e => e.stopPropagation()}>
            <div className="asset-overlay-header">
              <span>{t("asset_picker_title")}</span>
              <button className="asset-overlay-close" onClick={() => setAssetPickerOpen(false)}>✕</button>
            </div>
            {ASSET_GROUPS.map((group) => {
              const groupAssets = SCAN_ASSETS.filter(a => group.types.includes(a.type));
              return (
                <div key={group.label} className="asset-overlay-group">
                  <div className="asset-overlay-group-label">{group.label}</div>
                  <div className="asset-overlay-grid">
                    {groupAssets.map((a) => (
                      <button
                        key={a.symbol}
                        className={`asset-overlay-btn${asset === a.symbol ? " active" : ""}`}
                        onClick={() => { handleAssetChange(a.symbol); setAssetPickerOpen(false); }}
                      >
                        <span className="asset-overlay-emoji">{a.emoji}</span>
                        <span className="asset-overlay-ticker">{a.ticker}</span>
                        <span className="asset-overlay-name">{a.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Compacte topbar ── */}
      <section className="terminal-topbar">
        {/* Links: asset-knop + prijs */}
        <div className="terminal-topbar-left">
          <button className="asset-select-btn" onClick={() => setAssetPickerOpen(true)}>
            <span>{assetDef?.emoji ?? "💰"}</span>
            <span className="asset-select-ticker">{assetDef?.ticker ?? asset}</span>
            <span className="asset-select-caret">▾</span>
          </button>
          <div>
            <div className="terminal-topbar-price">${fmtPrice(chartPrice, asset)}</div>
            <div className="terminal-topbar-meta">
              <span className={`terminal-change-badge${change24h >= 0 ? " pos" : " neg"}`}>
                {change24h >= 0 ? "▲" : "▼"} {Math.abs(change24h).toFixed(2)}%
              </span>
              &nbsp;
              {liveMode
                ? <span style={{ color: "#22c55e", fontSize: 11 }}>● Live</span>
                : <span style={{ color: "#f59e0b", fontSize: 11 }}>⟳</span>
              }
            </div>
          </div>
        </div>

        {/* Rechts: status badge + refresh icoon */}
        <div className="terminal-topbar-right">
          <span className={`terminal-status-badge ${statusTone}`}>
            {signal.status === "Goed moment" ? t("status_good_moment")
              : signal.status === "Nog even wachten" ? t("status_wait")
              : t("status_no_buy")}
          </span>
          {!notifAllowed && "Notification" in (typeof window !== "undefined" ? window : {}) && (
            <button
              className="topbar-icon-btn"
              onClick={requestNotifPermission}
              title="Meldingen inschakelen"
            >🔔</button>
          )}
          <button
            className="topbar-icon-btn"
            onClick={() => refreshSignal()}
            disabled={refreshing}
            title={lastRefresh ? `${t("status_analysis_prefix")} ${lastRefresh}` : t("status_loading_analysis")}
          >
            {refreshing ? "⟳" : "↻"}
          </button>
        </div>
      </section>

      {/* ── Hoofdgrid ── */}
      <section className="terminal-main-grid">
        <div className="terminal-chart-col">

          {/* Timeframe tabs */}
          <div className="terminal-tf-bar">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.key}
                className={`terminal-tf-btn${activeInterval === tf.key ? " active" : ""}`}
                onClick={() => setActiveInterval(tf.key)}
                title={tf.desc}
              >
                {tf.label}
              </button>
            ))}
            <span className="terminal-tf-desc">{activeTf.desc}</span>
          </div>

          {/* Geen intraday data melding voor aandelen/grondstoffen */}
          {candlesEmpty && dailyCandles.length > 0 && (
            <div className="chart-market-closed-banner">
              {t("notif_market_closed")}
            </div>
          )}
          {candlesEmpty && dailyCandles.length === 0 && (
            <div className="chart-market-closed-banner">
              {t("status_loading_chart")}
            </div>
          )}

          {/* Chart */}
          {activeInterval === "multi" ? (
            <div className="terminal-multi-charts">
              {MULTI_TFS.map((tf) => {
                const tfCandles = candleMap[tf.key] || [];
                return (
                  <div key={tf.key} className="terminal-multi-chart-wrap">
                    <div className="terminal-multi-chart-header">
                      <span className="terminal-multi-chart-label">{tf.label}</span>
                      <span className="terminal-multi-chart-hint">{tf.hint}</span>
                      {tfCandles.length === 0 && <span className="terminal-multi-chart-loading">{t("loading")}</span>}
                    </div>
                    <TradingChart
                      candles={tfCandles}
                      currentPrice={chartPrice}
                      entryZoneLow={signalReady ? signal.entryZoneLow : 0}
                      entryZoneHigh={signalReady ? signal.entryZoneHigh : 0}
                      stopLoss={signalReady ? signal.stopLoss : 0}
                      resistanceZoneLow={signalReady ? signal.resistanceZoneLow : 0}
                      resistanceZoneHigh={signalReady ? signal.resistanceZoneHigh : 0}
                      mode="analysis"
                      height={220}
                      compact={true}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <TradingChart
              candles={visibleCandles}
              currentPrice={chartPrice}
              entryZoneLow={signalReady ? signal.entryZoneLow : 0}
              entryZoneHigh={signalReady ? signal.entryZoneHigh : 0}
              stopLoss={signalReady ? signal.stopLoss : 0}
              resistanceZoneLow={signalReady ? signal.resistanceZoneLow : 0}
              resistanceZoneHigh={signalReady ? signal.resistanceZoneHigh : 0}
              mode={activeInterval === "1m" || activeInterval === "5m" || activeInterval === "15m" ? "fast" : "analysis"}
            />
          )}

          {/* Marcus — altijd zichtbaar onder de chart */}
          <div className="marcus-below-chart">
            <MentorChat key={asset} marketContext={marketContext} asset={asset} />
          </div>

          {/* Signaalstrip — altijd zichtbaar boven tabs */}
          {signalReady && (
            <div className={`signal-strip${signalStripOpen ? " open" : ""}`} onClick={() => setSignalStripOpen(v => !v)}>
              <div className="signal-strip-row">
                <span className={`signal-strip-badge ${signal.action === "Kleine koop mogelijk" ? "green" : signal.action === "Wacht op betere prijs" ? "yellow" : "red"}`}>
                  {signal.action}
                </span>
                <span className="signal-strip-zone">Zone ${Math.round(signal.entryZoneLow).toLocaleString("en-US")}–${Math.round(signal.entryZoneHigh).toLocaleString("en-US")}</span>
                <span className="signal-strip-sl">SL ${Math.round(signal.stopLoss).toLocaleString("en-US")}</span>
                <span className="signal-strip-rr">R:R {signal.riskRewardEstimate}</span>
                <span className="signal-strip-toggle">{signalStripOpen ? "▲" : "▼"}</span>
              </div>
              {signalStripOpen && (
                <div className="signal-strip-detail" onClick={e => e.stopPropagation()}>
                  <div className="signal-strip-grid">
                    <div className="ssd-item"><span className="ssd-label">Entry zone</span><span className="ssd-val">${Math.round(signal.entryZoneLow).toLocaleString("en-US")} – ${Math.round(signal.entryZoneHigh).toLocaleString("en-US")}</span></div>
                    <div className="ssd-item"><span className="ssd-label">Stop-loss</span><span className="ssd-val ssd-red">${Math.round(signal.stopLoss).toLocaleString("en-US")}</span></div>
                    <div className="ssd-item"><span className="ssd-label">Target</span><span className="ssd-val ssd-green">${Math.round(signal.resistanceZoneLow).toLocaleString("en-US")} – ${Math.round(signal.resistanceZoneHigh).toLocaleString("en-US")}</span></div>
                    <div className="ssd-item"><span className="ssd-label">R:R ratio</span><span className="ssd-val">{signal.riskRewardEstimate}</span></div>
                    <div className="ssd-item"><span className="ssd-label">Score</span><span className="ssd-val">{signal.score}/100 · {signal.setupGrade}</span></div>
                    <div className="ssd-item"><span className="ssd-label">RSI 4H / 1D</span><span className="ssd-val">{signal.rsi4h.toFixed(0)} / {signal.rsi1d.toFixed(0)}</span></div>
                    <div className="ssd-item"><span className="ssd-label">Trend 4H</span><span className="ssd-val">{nlTrend(signal.trend4h, lang)}</span></div>
                    <div className="ssd-item"><span className="ssd-label">Trend 1D</span><span className="ssd-val">{nlTrend(signal.trend1d, lang)}</span></div>
                    {signal.blockers.length > 0 && (
                      <div className="ssd-item ssd-full"><span className="ssd-label">⚠ Blockers</span><span className="ssd-val ssd-red">{signal.blockers.join(" · ")}</span></div>
                    )}
                  </div>
                  <button className="signal-strip-trade-btn" onClick={() => { setBottomTab("paper"); setSignalStripOpen(false); }}>
                    {t("signal_strip_trade_btn")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bottom tab bar — 4 tabs */}
          <div className="bottom-tab-bar">
            {BOTTOM_TABS.filter(tab => PRIMARY_TABS.includes(tab.key)).map(tab => (
              <button
                key={tab.key}
                className={`bottom-tab-btn${bottomTab === tab.key ? " active" : ""}`}
                onClick={() => setBottomTab(tab.key)}
              >
                <span className="bottom-tab-icon">{tab.icon}</span>
                <span className="bottom-tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="bottom-tab-content">
            {bottomTab === "paper" && (
              <TerminalPaperPanel
                currentPrice={chartPrice} status={signal.status} action={signal.action}
                entryZoneText={signal.entryZoneText} entryZoneLow={signal.entryZoneLow}
                entryZoneHigh={signal.entryZoneHigh} stopLoss={signal.stopLoss}
                resistanceZoneLow={signal.resistanceZoneLow} resistanceZoneHigh={signal.resistanceZoneHigh}
                riskRewardEstimate={signal.riskRewardEstimate} asset={asset}
                autoExecuteAmount={autoExecuteAmount}
              />
            )}
            {bottomTab === "checklist" && (
              <>
                {!signalReady ? (
                  <div className="terminal-side-card" style={{ color: "var(--text-secondary)", fontSize: 13, textAlign: "center", padding: 24 }}>
                    {t("checklist_loading")} {assetDef?.ticker ?? asset}…
                  </div>
                ) : (
                  <EntryChecklist
                    currentPrice={chartPrice} entryZoneLow={signal.entryZoneLow}
                    entryZoneHigh={signal.entryZoneHigh} rsi4h={signal.rsi4h}
                    trend4h={signal.trend4h} trend1d={signal.trend1d}
                    blockers={signal.blockers} stopLoss={signal.stopLoss}
                    riskRewardEstimate={signal.riskRewardEstimate}
                  />
                )}
                <details className="accordion-details">
                  <summary className="accordion-details-summary">🧮 {t("trade_accordion_calculator")}</summary>
                  <div className="accordion-details-body">
                    <RisicoCalculator currentPrice={chartPrice} stopLoss={signal.stopLoss} />
                  </div>
                </details>
              </>
            )}
            {bottomTab === "briefing" && <MarcusBriefing />}
            {bottomTab === "nieuws" && <NewsPanel asset={asset} />}
          </div>
        </div>
      </section>

      {/* Zone toast */}
      {zoneAlert && (
        <div className="terminal-zone-toast" onClick={() => setZoneAlert(null)}>
          <span>{zoneAlert}</span>
          <span className="terminal-zone-toast-close">✕</span>
        </div>
      )}
    </main>
  );
}
