"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getAssetDef } from "@/lib/assets";

export type Currency = "EUR" | "USD";

type CurrencyContextType = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  eurRate: number;          // 1 USD = X EUR
  symbol: string;           // "€" of "$"
  convertFromUSD: (usd: number) => number;
  formatPrice: (usd: number, assetSymbol: string) => string;
};

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "EUR",
  setCurrency: () => {},
  eurRate: 0.92,
  symbol: "€",
  convertFromUSD: (usd) => usd * 0.92,
  formatPrice: (usd) => usd.toFixed(2),
});

function fmtNumber(price: number, assetSymbol: string): string {
  const def = getAssetDef(assetSymbol);
  if (def?.type === "crypto") {
    if (price >= 1000) return price.toLocaleString("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    if (price >= 10)   return price.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toLocaleString("nl-NL", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
  return price.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("EUR");
  const [eurRate, setEurRate] = useState(0.92); // fallback rate

  // Laad voorkeur vanuit DB
  useEffect(() => {
    fetch("/api/me/settings")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const c = d?.preferredCurrency;
        if (c === "USD" || c === "EUR") {
          setCurrencyState(c);
          if (typeof window !== "undefined") localStorage.setItem("app_currency", c);
        }
      })
      .catch(() => {});

    // Haal actuele EUR/USD koers op
    fetch("https://open.er-api.com/v6/latest/USD")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const rate = d?.rates?.EUR;
        if (rate && typeof rate === "number") setEurRate(rate);
      })
      .catch(() => {}); // gebruik fallback 0.92

    // Snelle initialisatie vanuit localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("app_currency") as Currency | null;
      if (stored === "EUR" || stored === "USD") setCurrencyState(stored);
    }
  }, []);

  function setCurrency(c: Currency) {
    setCurrencyState(c);
    if (typeof window !== "undefined") localStorage.setItem("app_currency", c);
    // Sla op in DB
    fetch("/api/me/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredCurrency: c }),
    }).catch(() => {});
  }

  const symbol = currency === "EUR" ? "€" : "$";

  const convertFromUSD = useCallback((usd: number): number => {
    return currency === "EUR" ? usd * eurRate : usd;
  }, [currency, eurRate]);

  const formatPrice = useCallback((usd: number, assetSymbol: string): string => {
    const converted = convertFromUSD(usd);
    return symbol + fmtNumber(converted, assetSymbol);
  }, [convertFromUSD, symbol]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, eurRate, symbol, convertFromUSD, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
