"use client";

import { useEffect } from "react";

export default function DevtoolsBlocker() {
  useEffect(() => {
    const BLOCKED_KEYS = new Set(["F12", "F11"]);

    function onKeyDown(e: KeyboardEvent) {
      const k = e.key;

      // F12 / F11
      if (BLOCKED_KEYS.has(k)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      // Ctrl+Shift+I / J / C / K (inspector, console, elements)
      if (e.ctrlKey && e.shiftKey) {
        const lower = k.toLowerCase();
        if (["i", "j", "c", "k"].includes(lower)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
      }

      // Ctrl+U (view source)
      if (e.ctrlKey && !e.shiftKey && !e.altKey && k.toLowerCase() === "u") {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      // Ctrl+S (save page)
      if (e.ctrlKey && !e.shiftKey && !e.altKey && k.toLowerCase() === "s") {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }

    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }

    // capture:true → loopt vóór alle andere handlers
    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("contextmenu", onContextMenu, { capture: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("contextmenu", onContextMenu, { capture: true });
    };
  }, []);

  return null;
}
