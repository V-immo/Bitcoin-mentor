"use client";

import { useState } from "react";
import MarcusBot from "@/components/MarcusBot";
import CopyMarcusPanel from "@/components/CopyMarcusPanel";

type Props = { isPro: boolean };

export default function BotsPageClient({ isPro }: Props) {
  const [tab, setTab] = useState<"bots" | "copy">("bots");

  return (
    <div>
      {/* Tab-balk — alleen zichtbaar boven de bestaande MarcusBot header */}
      <div style={{
        display: "flex",
        maxWidth: 640,
        margin: "0 auto",
        padding: "12px 16px 0",
        gap: 8,
      }}>
        {([
          { key: "bots" as const,  label: "Playbook" },
          { key: "copy" as const,  label: "Copy Marcus" },
        ] as const).map(item => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              border: "1px solid var(--border)",
              cursor: "pointer",
              background: tab === item.key ? "var(--accent)" : "transparent",
              color: tab === item.key ? "#fff" : "var(--text-secondary)",
              fontWeight: tab === item.key ? 700 : 400,
              fontSize: 13,
              transition: "all 0.15s",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "bots" && <MarcusBot isPro={isPro} />}
      {tab === "copy" && (
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px 32px" }}>
          <CopyMarcusPanel />
        </div>
      )}
    </div>
  );
}
