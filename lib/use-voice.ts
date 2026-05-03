"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: { isFinal: boolean; [j: number]: { transcript: string } };
  };
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

/** Strip markdown zodat TTS geen **, *, # etc. uitspreekt */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#+\s/gm, "")
    .replace(/`[^`]+`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[-*]\s/g, "")
    .replace(/\n{2,}/g, ". ")
    .trim();
}

export type UseVoiceOptions = {
  lang?: string;           // bijv. "nl-NL" of "en-US"
  autoSubmit?: boolean;    // verstuur automatisch na herkenning
  onTranscript?: (text: string, final: boolean) => void;
};

export function useVoice(options: UseVoiceOptions = {}) {
  const { lang = "nl-NL", onTranscript } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef       = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setIsSupported(!!Ctor);
    setTtsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    if ("speechSynthesis" in window) synthRef.current = window.speechSynthesis;
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;

    // Stop lopende spraak
    synthRef.current?.cancel();
    setIsSpeaking(false);

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let final   = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      const text = final || interim;
      const isFinal = !!final;
      onTranscript?.(text, isFinal);
    };

    rec.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    rec.onerror = (e: { error: string }) => {
      if (e.error !== "no-speech") console.warn("SpeechRecognition error:", e.error);
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [lang, onTranscript]);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel(); // stop vorige utterance

    const clean = stripMarkdown(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = lang;
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Kies een goede stem op basis van taal
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith(lang.slice(0, 2)) && (v.name.includes("Google") || v.name.includes("Microsoft") || v.name.includes("Siri"))
    ) ?? voices.find(v => v.lang.startsWith(lang.slice(0, 2)));
    if (preferred) utterance.voice = preferred;

    utterance.onstart  = () => setIsSpeaking(true);
    utterance.onend    = () => { setIsSpeaking(false); currentUtteranceRef.current = null; };
    utterance.onerror  = () => { setIsSpeaking(false); currentUtteranceRef.current = null; };

    currentUtteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  }, [lang]);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      synthRef.current?.cancel();
    };
  }, []);

  return { isListening, isSpeaking, isSupported, ttsSupported, startListening, stopListening, speak, stopSpeaking };
}
