"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

const STORAGE_KEY = "btcmentor-onboarded";

export default function OnboardingModal() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [startCapital, setStartCapital] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const alreadyOnboarded = localStorage.getItem(STORAGE_KEY);
    if (!alreadyOnboarded) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    fetch("/api/me/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.startCapital) setStartCapital(data.startCapital);
      })
      .catch(() => {});
  }, [visible]);

  function close() {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }

  function handleSkip() {
    close();
  }

  function handleNext() {
    if (step < 3) setStep(step + 1);
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  function goTo(path: string) {
    close();
    router.push(path);
  }

  if (!visible) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Skip button */}
        <button style={styles.skipBtn} onClick={handleSkip}>
          {t("onboarding_modal_skip")}
        </button>

        {/* Steps */}
        {step === 0 && (
          <div style={styles.stepContent}>
            <div style={styles.emoji}>📊</div>
            <h2 style={styles.title}>{t("onboarding_modal_step0_title")}</h2>
            <h3 style={styles.stepTitle}>{t("onboarding_modal_step0_who")}</h3>
            <p style={styles.text}>
              {t("onboarding_modal_step0_text")}
            </p>
          </div>
        )}

        {step === 1 && (
          <div style={styles.stepContent}>
            <div style={styles.emoji}>🎓</div>
            <h3 style={styles.stepTitle}>{t("onboarding_modal_step1_title")}</h3>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <span style={styles.bullet}>📝</span>
                <span>
                  <strong>{t("onboarding_modal_step1_quiz")}</strong> — {t("onboarding_modal_step1_quiz_desc")}
                </span>
              </li>
              <li style={styles.listItem}>
                <span style={styles.bullet}>📈</span>
                <span>
                  <strong>{t("onboarding_modal_step1_paper")}</strong> — {t("onboarding_modal_step1_paper_desc")}
                </span>
              </li>
              <li style={styles.listItem}>
                <span style={styles.bullet}>🤖</span>
                <span>
                  <strong>{t("onboarding_modal_step1_ai")}</strong> — {t("onboarding_modal_step1_ai_desc")}
                </span>
              </li>
            </ul>
          </div>
        )}

        {step === 2 && (
          <div style={styles.stepContent}>
            <div style={styles.emoji}>💰</div>
            <h3 style={styles.stepTitle}>{t("onboarding_modal_step2_title")}</h3>
            <div style={styles.capitalBox}>
              <span style={styles.capitalLabel}>{t("onboarding_modal_step2_label")}</span>
              <span style={styles.capitalValue}>
                {startCapital != null
                  ? `$${startCapital.toLocaleString("nl-NL")}`
                  : t("onboarding_modal_step2_loading")}
              </span>
            </div>
            <p style={styles.text}>
              {t("onboarding_modal_step2_text")}
            </p>
          </div>
        )}

        {step === 3 && (
          <div style={styles.stepContent}>
            <div style={styles.emoji}>🎉</div>
            <h3 style={styles.stepTitle}>{t("onboarding_modal_step3_title")}</h3>
            <p style={styles.text}>
              {t("onboarding_modal_step3_text")}
            </p>
            <div style={styles.ctaRow}>
              <button style={styles.ctaPrimary} onClick={() => goTo("/leren")}>
                {t("onboarding_modal_step3_learn")}
              </button>
              <button style={styles.ctaSecondary} onClick={() => goTo("/trade")}>
                {t("onboarding_modal_step3_trade")}
              </button>
            </div>
          </div>
        )}

        {/* Progress dots */}
        <div style={styles.dots}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                ...styles.dot,
                background: i === step ? "#e91e63" : "rgba(233,30,99,0.22)",
              }}
            />
          ))}
        </div>

        {/* Navigation */}
        <div style={styles.nav}>
          <button
            style={{ ...styles.navBtn, opacity: step === 0 ? 0.3 : 1 }}
            onClick={handleBack}
            disabled={step === 0}
          >
            {t("onboarding_modal_back")}
          </button>
          {step < 3 ? (
            <button style={styles.navBtnPrimary} onClick={handleNext}>
              {t("onboarding_modal_next")}
            </button>
          ) : (
            <button style={styles.navBtn} onClick={close}>
              {t("onboarding_modal_close")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background: "rgba(10, 3, 8, 0.88)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    backdropFilter: "blur(4px)",
  },
  card: {
    position: "relative",
    width: "100%",
    maxWidth: "480px",
    background: "#1f0d17",
    border: "1px solid rgba(233,30,99,0.22)",
    borderRadius: "14px",
    padding: "32px 28px 24px",
    boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
  },
  skipBtn: {
    position: "absolute",
    top: "14px",
    right: "16px",
    background: "transparent",
    border: "none",
    color: "rgba(252,232,240,0.5)",
    fontSize: "13px",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "6px",
  },
  stepContent: {
    minHeight: "220px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  emoji: {
    fontSize: "40px",
    lineHeight: 1,
    marginBottom: "4px",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 700,
    color: "#fce8f0",
  },
  stepTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600,
    color: "#e91e63",
  },
  text: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#bf7a99",
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  listItem: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    fontSize: "14px",
    color: "#fce8f0",
    lineHeight: 1.5,
  },
  bullet: {
    fontSize: "18px",
    flexShrink: 0,
    marginTop: "1px",
  },
  capitalBox: {
    background: "rgba(233,30,99,0.08)",
    border: "1px solid rgba(233,30,99,0.22)",
    borderRadius: "10px",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  capitalLabel: {
    fontSize: "12px",
    color: "#bf7a99",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  capitalValue: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#e91e63",
    fontVariantNumeric: "tabular-nums",
  },
  ctaRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "8px",
  },
  ctaPrimary: {
    flex: 1,
    minWidth: "140px",
    background: "#e91e63",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px 20px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
  },
  ctaSecondary: {
    flex: 1,
    minWidth: "140px",
    background: "transparent",
    color: "#e91e63",
    border: "1px solid rgba(233,30,99,0.5)",
    borderRadius: "8px",
    padding: "12px 20px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
  },
  dots: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    margin: "24px 0 16px",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    transition: "background 0.2s",
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navBtn: {
    background: "transparent",
    border: "1px solid rgba(233,30,99,0.3)",
    color: "#bf7a99",
    borderRadius: "8px",
    padding: "9px 18px",
    fontSize: "14px",
    cursor: "pointer",
  },
  navBtnPrimary: {
    background: "#e91e63",
    border: "none",
    color: "#fff",
    borderRadius: "8px",
    padding: "9px 18px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
