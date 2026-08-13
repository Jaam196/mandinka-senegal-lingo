import { useCallback, useEffect, useState } from "react";

export type Speed = "normal" | "slow";

const SPEED_KEY = "mnk_speech_speed";

export function getSpeechSpeed(): Speed {
  if (typeof window === "undefined") return "normal";
  return window.localStorage.getItem(SPEED_KEY) === "slow" ? "slow" : "normal";
}

export function setSpeechSpeed(value: Speed) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SPEED_KEY, value);
  window.dispatchEvent(new CustomEvent("mnk-prefs"));
}

export function useSpeechSpeed() {
  const [speed, setSpeed] = useState<Speed>("normal");

  useEffect(() => {
    const sync = () => setSpeed(getSpeechSpeed());
    sync();
    window.addEventListener("mnk-prefs", sync);
    return () => window.removeEventListener("mnk-prefs", sync);
  }, []);

  const update = useCallback((value: Speed) => {
    setSpeechSpeed(value);
    setSpeed(value);
  }, []);

  return { speed, setSpeed: update };
}

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  return online;
}
