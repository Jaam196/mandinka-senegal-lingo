import { useCallback, useEffect, useState } from "react";

const DEVICE_KEY = "mnk_device_id";
const NAME_KEY = "mnk_display_name";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getDisplayName(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(NAME_KEY) ?? "";
}

/** Identidad ligera por dispositivo: sin registro, pero con nombre visible. */
export function useIdentity() {
  const [deviceId, setDeviceId] = useState("");
  const [displayName, setName] = useState("");

  useEffect(() => {
    setDeviceId(getDeviceId());
    setName(getDisplayName());
    const sync = () => setName(getDisplayName());
    window.addEventListener("mnk-identity", sync);
    return () => window.removeEventListener("mnk-identity", sync);
  }, []);

  const setDisplayName = useCallback((value: string) => {
    const clean = value.trim().slice(0, 80);
    window.localStorage.setItem(NAME_KEY, clean);
    window.dispatchEvent(new CustomEvent("mnk-identity"));
    setName(clean);
  }, []);

  return { deviceId, displayName, setDisplayName, label: displayName || "Anónimo" };
}
