"use client";

/**
 * Analytics — Posthog
 * Alleen actief als NEXT_PUBLIC_POSTHOG_KEY is ingesteld.
 * Privacyvriendelijk: geen cookies, geen tracking zonder key.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    posthog?: {
      init: (key: string, opts: object) => void;
      capture: (event: string, props?: object) => void;
      identify: (id: string, props?: object) => void;
      reset: () => void;
    };
  }
}

let initialized = false;

function initPosthog(key: string) {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const script = document.createElement("script");
  script.src = "https://eu-assets.i.posthog.com/static/array.js";
  script.async = true;
  script.onload = () => {
    window.posthog?.init(key, {
      api_host: "https://eu.i.posthog.com",
      person_profiles: "identified_only",
      autocapture: false,          // geen automatische click-tracking
      capture_pageview: false,     // wij doen dit zelf per route-change
      persistence: "memory",       // geen cookies
      disable_session_recording: true,
    });
  };
  document.head.appendChild(script);
}

export function trackEvent(event: string, props?: object) {
  window.posthog?.capture(event, props);
}

export default function Analytics() {
  const pathname = usePathname();
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  useEffect(() => {
    if (!key) return;
    initPosthog(key);
  }, [key]);

  // Pageview bij elke route-change
  useEffect(() => {
    if (!key) return;
    window.posthog?.capture("$pageview", { path: pathname });
  }, [pathname, key]);

  return null;
}
