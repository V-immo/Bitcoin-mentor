"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ProSuccessPage() {
  const { lang } = useLanguage();
  const isNL = lang === "nl";

  return (
    <div className="pro-page">
      <div className="pro-success-card">
        <div className="pro-success-icon">★</div>
        <h1 className="pro-success-title">
          {isNL ? "Welkom bij Marcus Pro" : "Welcome to Marcus Pro"}
        </h1>
        <p className="pro-success-text">
          {isNL
            ? "Je betaling is bevestigd. Alle PRO-functies zijn nu actief — curriculum niveau 3–10, onbeperkte coaching, Marcus Bot en Live Ready certificaat."
            : "Your payment is confirmed. All PRO features are now active — curriculum levels 3–10, unlimited coaching, Marcus Bot and Live Ready certificate."}
        </p>
        <Link href="/leren" className="pro-success-back">
          {isNL ? "Start met leren →" : "Start learning →"}
        </Link>
      </div>
    </div>
  );
}
