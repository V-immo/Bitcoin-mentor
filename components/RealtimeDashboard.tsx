"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import TradingChart from "./TradingChart";
import TerminalMentorPanel from "./TerminalMentorPanel";
import TerminalPaperPanel from "./TerminalPaperPanel";
import TradePartnerPanel from "./TradePartnerPanel";
import MentorChat from "./MentorChat";
import RisicoCalculator from "./RisicoCalculator";
import EntryChecklist from "./EntryChecklist";
import type { Candle, MentorSignal } from "@/lib/types";
import { SCAN_ASSETS, isFinnhubAsset, getAssetDef, getFinnhubSymbol } from "@/lib/assets";
import NewsPanel from "./NewsPanel";
import Leaderboard from "./Leaderboard";
import AITradeCoach from "./AITradeCoach";
import LiveSimpleMode from "./LiveSimpleMode";

type Props = { initialData: MentorSignal; initialAsset?: string };

const INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
type Interval = (typeof INTERVALS)[number];
type ViewMode = Interval | "multi";

// Crypto (Binance): alle timeframes inclusief native 4H
const TIMEFRAMES_CRYPTO: { key: ViewMode; label: string; desc: string }[] = [
  { key: "1m",    label: "1m",      desc: "Scalpen — ultrasnel" },
  { key: "5m",    label: "5m",      desc: "Scalpen — heel snel" },
  { key: "15m",   label: "15m",     desc: "Korte termijn" },
  { key: "1h",    label: "1H",      desc: "Dagtrend" },
  { key: "4h",    label: "4H",      desc: "Swing trading" },
  { key: "1d",    label: "1D",      desc: "Groot plaatje" },
  { key: "multi", label: "🔍 Multi", desc: "Pro-view: 1D + 4H + 1H tegelijk" },
];

// Aandelen/grondstoffen (Finnhub): geen 4H (bestaat niet als native interval)
const TIMEFRAMES_FINNHUB: { key: ViewMode; label: string; desc: string }[] = [
  { key: "1m",    label: "1m",      desc: "Scalpen — ultrasnel" },
  { key: "5m",    label: "5m",      desc: "Scalpen — heel snel" },
  { key: "15m",   label: "15m",     desc: "Korte termijn" },
  { key: "1h",    label: "1H",      desc: "Dagtrend" },
  { key: "1d",    label: "1D",      desc: "Groot plaatje" },
  { key: "multi", label: "🔍 Multi", desc: "Pro-view: 1D + 1H + 15m tegelijk" },
];

const MULTI_TFS_CRYPTO = [
  { key: "1d" as Interval, label: "1D — Grote trend",    hint: "Stijgt of daalt de markt op de lange termijn?" },
  { key: "4h" as Interval, label: "4H — Setup",          hint: "Is er een koopzone zichtbaar? Staat RSI laag?" },
  { key: "1h" as Interval, label: "1H — Instapmoment",   hint: "Is dit het juiste moment om in te stappen?" },
];

const MULTI_TFS_FINNHUB = [
  { key: "1d"  as Interval, label: "1D — Grote trend",    hint: "Stijgt of daalt de markt op de lange termijn?" },
  { key: "1h"  as Interval, label: "1H — Setup",          hint: "Is er een koopzone zichtbaar? Staat RSI laag?" },
  { key: "15m" as Interval, label: "15m — Instapmoment",  hint: "Is dit het juiste moment om in te stappen?" },
];

// Asset groepen voor de balk
const ASSET_GROUPS = [
  { label: "Crypto",    types: ["crypto"] },
  { label: "Aandelen",  types: ["stock", "etf"] },
  { label: "Grondstoffen", types: ["metal"] },
];

function nl(val: string): string {
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
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`
    );
    if (!res.ok) return [];
    const data = (await res.json()) as (string | number)[][];
    return data.map((k) => ({
      openTime: Number(k[0]),
      open: parseFloat(String(k[1])),
      high: parseFloat(String(k[2])),
      low: parseFloat(String(k[3])),
      close: parseFloat(String(k[4])),
      volume: parseFloat(String(k[5])),
      closeTime: Number(k[6]),
    }));
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

type BottomTab = "paper" | "analyse" | "chat" | "nieuws" | "checklist" | "leaderboard";
const BOTTOM_TABS: { key: BottomTab; label: string; icon: string }[] = [
  { key: "chat",        label: "Marcus AI",      icon: "🤖" },
  { key: "paper",       label: "Paper Trading",  icon: "💰" },
  { key: "analyse",     label: "Analyse",        icon: "📊" },
  { key: "checklist",   label: "Checklist",      icon: "✅" },
  { key: "nieuws",      label: "Nieuws",         icon: "📰" },
  { key: "leaderboard", label: "Ranking",        icon: "🏆" },
];

export default function RealtimeDashboard({ initialData, initialAsset = "BTCUSDT" }: Props) {
  const [asset, setAsset] = useState<string>(initialAsset);
  const [signal, setSignal] = useState<MentorSignal>(initialData);
  const [bottomTab, setBottomTab] = useState<BottomTab>("chat");
  const [signalAsset, setSignalAsset] = useState<string>(initialAsset);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState("");
  const [livePrice, setLivePrice] = useState<number>(initialData.price);
  const [change24h, setChange24h] = useState<number>(0);
  const [activeInterval, setActiveInterval] = useState<ViewMode>("4h");
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

  // Laad alle candles bij asset-wissel
  useEffect(() => {
    setCandleMap({ "1m": [], "5m": [], "15m": [], "1h": [], "4h": [], "1d": [] });
    async function loadAll() {
      const results = await Promise.all(INTERVALS.map((iv) => fetchCandles(asset, iv)));
      const map: Record<string, Candle[]> = {};
      INTERVALS.forEach((iv, i) => { map[iv] = results[i]; });
      setCandleMap(map);
    }
    loadAll();
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

  // Price WebSocket — Binance (live, ticker met 24h change)
  useEffect(() => {
    priceWsRef.current?.close();
    if (!isBinance) { setPriceWsState("offline"); return; }
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
        }
      } catch { /* ignore */ }
    };
    ws.onerror = () => setPriceWsState("error");
    ws.onclose = () => setPriceWsState("offline");
    return () => ws.close();
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

  // Kline WebSocket — live candles (Binance)
  const wsInterval: Interval = activeInterval === "multi" ? (isBinance ? "4h" : "1h") : activeInterval;
  useEffect(() => {
    klineWsRef.current?.close();
    if (!isBinance) { setKlineWsState("offline"); return; }
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
      } catch { /* ignore */ }
    };
    ws.onerror = () => setKlineWsState("error");
    ws.onclose = () => setKlineWsState("offline");
    return () => ws.close();
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
  const activeTf = TIMEFRAMES.find((t) => t.key === activeInterval)!;
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

  function handlePartnerExecute(amountEur: number) {
    setAutoExecuteAmount(amountEur);
    setTimeout(() => setAutoExecuteAmount(null), 300);
  }

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
      headline: "Ik zou je nu niet laten kopen",
      verdict: "Er is op dit moment iets fundamenteel zwaks. Ik bescherm je hier.",
      bestAction: "Blijf kijken. Begrijp wat de markt fout maakt.",
      biggestMistake: "Toch kopen omdat je hoopt dat de prijs ineens omkeert.",
      lesson: "Een slechte setup overslaan is zelf ook een goede beslissing.",
      marketTone: "De markt laat zwakte zien — wachten is de juiste move.",
    };
    if (signal.status === "Goed moment" && inBuyZone) return {
      headline: "Dit is een netter instapmoment",
      verdict: "De setup klopt en de prijs staat op een logische plek.",
      bestAction: "Blijf klein en gedisciplineerd. Dit is een oefentrade.",
      biggestMistake: "Te veel willen verdienen op één trade.",
      lesson: "Een goede trade is meestal saai, gecontroleerd en duidelijk.",
      marketTone: signal.trend4h === "bullish" ? "Trend helpt mee — positief." : "Gemengde trend — extra voorzichtig.",
    };
    if (aboveBuyZone) return {
      headline: "Te hoog om nu in te stappen",
      verdict: "De setup is niet slecht, maar de prijs staat te hoog voor een nette entry.",
      bestAction: `Wacht tot $${Math.round(signal.entryZoneLow).toLocaleString("en-US")}–$${Math.round(signal.entryZoneHigh).toLocaleString("en-US")}.`,
      biggestMistake: "Instappen uit FOMO dat de stijging zonder jou doorgaat.",
      lesson: "Waar je koopt is bijna even belangrijk als wat je koopt.",
      marketTone: "Prijs beweegt, maar jouw moment is er nog niet.",
    };
    if (belowBuyZone) return {
      headline: "Wacht op bevestiging",
      verdict: "Prijs staat onder de koopzone — kan interessant worden, maar extra risico.",
      bestAction: "Wacht tot de prijs laat zien dat hij wil stabiliseren.",
      biggestMistake: "Denken dat een lagere prijs automatisch een betere koop is.",
      lesson: "Een vallend mes vangen is vaak te vroeg.",
      marketTone: "Eerst bevestiging zien, dan vertrouwen.",
    };
    return {
      headline: "De markt is nog niet klaar",
      verdict: "Begrijp eerst wat je ziet voordat je iets doet.",
      bestAction: "Gebruik dit moment als training.",
      biggestMistake: "Traden uit verveling of ongeduld.",
      lesson: "Je leert sneller als je wacht op kwaliteit.",
      marketTone: "Nog niet klikken.",
    };
  }, [chartPrice, signal]);

  const marketContext = useMemo(() =>
    [
      `Asset: ${assetDef ? `${assetDef.name} (${assetDef.ticker}) [${assetDef.type}]` : asset}`,
      `Prijs: $${fmtPrice(chartPrice, asset)}`,
      `24h: ${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%`,
      `Status: ${signal.status} — ${signal.action}`,
      `Score: ${signal.score}/100, Grade: ${signal.setupGrade}`,
      `Trends: Dagelijks ${nl(signal.trend1d)}, 4H ${nl(signal.trend4h)}, 1H ${nl(signal.trend1h)}`,
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

      {/* ── Asset balk ── */}
      <div className="asset-bar">
        <Link href="/" className="asset-bar-back">← Scanner</Link>
        <div className="asset-bar-divider" />
        {ASSET_GROUPS.map((group) => {
          const groupAssets = SCAN_ASSETS.filter(a => group.types.includes(a.type));
          return (
            <div key={group.label} className="asset-bar-group">
              <span className="asset-bar-group-label">{group.label}</span>
              {groupAssets.map((a) => (
                <button
                  key={a.symbol}
                  className={`asset-bar-btn${asset === a.symbol ? " active" : ""}`}
                  onClick={() => handleAssetChange(a.symbol)}
                  title={a.name}
                >
                  <span className="asset-bar-emoji">{a.emoji}</span>
                  <span className="asset-bar-ticker">{a.ticker}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* ── Prijs balk ── */}
      <section className="terminal-topbar">
        <div className="terminal-topbar-left">
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div className="terminal-topbar-price">${fmtPrice(chartPrice, asset)}</div>
            <div className={`terminal-change-badge${change24h >= 0 ? " pos" : " neg"}`}>
              {change24h >= 0 ? "▲" : "▼"} {Math.abs(change24h).toFixed(2)}%
            </div>
          </div>
          <div className="terminal-topbar-meta">
            {assetDef ? `${assetDef.name} · ${assetDef.currency}` : asset}
            &nbsp;·&nbsp;
            {liveMode ? (
              <span style={{ color: "#22c55e" }}>● Live {isBinance ? "WebSocket" : "10s"}</span>
            ) : (
              <span style={{ color: "#f59e0b" }}>○ Verbinden…</span>
            )}
            {lastTickLabel && <>&nbsp;· {lastTickLabel}</>}
          </div>
        </div>
        <div className="terminal-topbar-right">
          <span className={`terminal-status-badge ${statusTone}`}>{signal.status}</span>
          <span className="terminal-soft-badge">{signal.action}</span>
          <span className="terminal-soft-badge">Analyse: {lastRefresh || "bij laden"}</span>
          {!notifAllowed && "Notification" in (typeof window !== "undefined" ? window : {}) && (
            <button
              className="terminal-btn terminal-btn-muted"
              onClick={requestNotifPermission}
              title="Ontvang een melding als de prijs de koopzone raakt"
              style={{ height: 30, fontSize: 12, padding: "0 12px" }}
            >
              🔔 Meldingen aan
            </button>
          )}
          {notifAllowed && (
            <span className="terminal-soft-badge" title="Browser meldingen actief" style={{ fontSize: 11 }}>
              🔔 Meldingen actief
            </span>
          )}
          <button
            className="terminal-btn terminal-btn-muted"
            onClick={() => refreshSignal()}
            disabled={refreshing}
            style={{ height: 30, fontSize: 12, padding: "0 12px" }}
          >
            {refreshing ? "⟳ Laden…" : "↻ Vernieuwen"}
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
              🕐 Geen recente intraday data — beurs is gesloten of data niet beschikbaar.
              Dagelijkse historische grafiek (1D) wordt getoond.
            </div>
          )}
          {candlesEmpty && dailyCandles.length === 0 && (
            <div className="chart-market-closed-banner">
              ⏳ Chartdata laden…
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
                      {tfCandles.length === 0 && <span className="terminal-multi-chart-loading">laden…</span>}
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

          {/* Bottom tab bar */}
          <div className="bottom-tab-bar">
            {BOTTOM_TABS.map(t => (
              <button
                key={t.key}
                className={`bottom-tab-btn${bottomTab === t.key ? " active" : ""}`}
                onClick={() => setBottomTab(t.key)}
              >
                <span className="bottom-tab-icon">{t.icon}</span>
                <span className="bottom-tab-label">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="bottom-tab-content">
            {bottomTab === "paper" && (
              <>
                <div className="paper-step-label">
                  <span className="paper-step-num">Stap 1</span>
                  <span className="paper-step-title">AI Analyse — moet ik deze trade doen?</span>
                </div>
                <TradePartnerPanel
                  signal={signal} currentPrice={chartPrice} asset={asset}
                  signalReady={signalReady} onExecuteTrade={handlePartnerExecute}
                />
                <div className="paper-step-label" style={{ marginTop: 8 }}>
                  <span className="paper-step-num">Stap 2</span>
                  <span className="paper-step-title">Voer de trade uit met je paper geld</span>
                </div>
                <TerminalPaperPanel
                  currentPrice={chartPrice} status={signal.status} action={signal.action}
                  entryZoneText={signal.entryZoneText} entryZoneLow={signal.entryZoneLow}
                  entryZoneHigh={signal.entryZoneHigh} stopLoss={signal.stopLoss}
                  resistanceZoneLow={signal.resistanceZoneLow} resistanceZoneHigh={signal.resistanceZoneHigh}
                  riskRewardEstimate={signal.riskRewardEstimate} asset={asset}
                  autoExecuteAmount={autoExecuteAmount}
                />
              </>
            )}
            {bottomTab === "chat" && (
              <MentorChat key={asset} marketContext={marketContext} asset={asset} />
            )}
            {bottomTab === "analyse" && (
              <>
                {signalReady && (
                  <AITradeCoach
                    status={signal.status} action={signal.action} currentPrice={chartPrice}
                    entryZoneLow={signal.entryZoneLow} entryZoneHigh={signal.entryZoneHigh}
                    stopLoss={signal.stopLoss} resistanceZoneLow={signal.resistanceZoneLow}
                    resistanceZoneHigh={signal.resistanceZoneHigh}
                    riskRewardEstimate={signal.riskRewardEstimate} score={signal.score}
                    setupGrade={signal.setupGrade} blockers={signal.blockers} warnings={signal.warnings}
                    trend4h={signal.trend4h} trend1h={signal.trend1h} structure4h={signal.structure4h}
                    rsi4h={signal.rsi4h} liveMode={liveMode} lastTickLabel={lastTickLabel}
                  />
                )}
                {signalReady && (
                  <LiveSimpleMode
                    currentPrice={chartPrice} entryZoneLow={signal.entryZoneLow}
                    entryZoneHigh={signal.entryZoneHigh} stopLoss={signal.stopLoss}
                    resistanceZoneLow={signal.resistanceZoneLow} resistanceZoneHigh={signal.resistanceZoneHigh}
                    status={signal.status} action={signal.action}
                    livePriceConnected={liveMode} liveCandleConnected={liveMode}
                    lastTickLabel={lastTickLabel} tickKey={Math.round(chartPrice)}
                  />
                )}
                <TerminalMentorPanel
                  status={signal.status} action={signal.action} currentPrice={chartPrice}
                  entryZoneLow={signal.entryZoneLow} entryZoneHigh={signal.entryZoneHigh}
                  stopLoss={signal.stopLoss} resistanceZoneLow={signal.resistanceZoneLow}
                  resistanceZoneHigh={signal.resistanceZoneHigh} score={signal.score}
                  setupGrade={signal.setupGrade} riskRewardEstimate={signal.riskRewardEstimate}
                  trend4h={signal.trend4h} trend1h={signal.trend1h} rsi4h={signal.rsi4h}
                  blockers={signal.blockers} warnings={signal.warnings}
                  lastTickLabel={lastTickLabel}
                />
                <div className="terminal-data-grid" style={{ marginTop: 12 }}>
                  {[
                    ["Trend 1H", nl(signal.trend1h)], ["Trend 4H", nl(signal.trend4h)],
                    ["Trend dagelijks", nl(signal.trend1d)],
                    ["RSI 1H", signal.rsi1h.toFixed(1)], ["RSI 4H", signal.rsi4h.toFixed(1)],
                    ["RSI dagelijks", signal.rsi1d.toFixed(1)],
                    ["Score", `${signal.score}/100`], ["Grade", signal.setupGrade],
                    ["R/R verhouding", String(signal.riskRewardEstimate)],
                    ["Ruimte naar boven", `${signal.distanceToResistancePct.toFixed(1)}%`],
                    ...(isBinance ? [["Funding rate", fundingRate], ["Open interest", openInterest]] : []),
                  ].map(([label, value]) => (
                    <div key={label} className="terminal-data-box">
                      <span className="terminal-data-label">{label}</span>
                      <span className="terminal-data-value">{value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {bottomTab === "checklist" && (
              <>
                {!signalReady ? (
                  <div className="terminal-side-card" style={{ color: "var(--text-secondary)", fontSize: 13, textAlign: "center", padding: 24 }}>
                    ⟳ Analyse laden voor {assetDef?.ticker ?? asset}…
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
                <RisicoCalculator currentPrice={chartPrice} stopLoss={signal.stopLoss} />
              </>
            )}
            {bottomTab === "nieuws" && <NewsPanel asset={asset} />}
            {bottomTab === "leaderboard" && <Leaderboard />}
          </div>
        </div>

        {/* Desktop rechter kolom — sticky chat */}
        <div className="terminal-side-col desktop-only">
          <MentorChat key={`side-${asset}`} marketContext={marketContext} asset={asset} />
          {signalReady && (
            <EntryChecklist
              currentPrice={chartPrice} entryZoneLow={signal.entryZoneLow}
              entryZoneHigh={signal.entryZoneHigh} rsi4h={signal.rsi4h}
              trend4h={signal.trend4h} trend1d={signal.trend1d}
              blockers={signal.blockers} stopLoss={signal.stopLoss}
              riskRewardEstimate={signal.riskRewardEstimate}
            />
          )}
          <RisicoCalculator currentPrice={chartPrice} stopLoss={signal.stopLoss} />
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
