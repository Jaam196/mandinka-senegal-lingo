import { useCallback, useEffect, useRef, useState } from "react";
import { speakText, transcribeAudio } from "./translate.functions";

export type Speed = "normal" | "slow";

export type SpeakRequest = {
  text: string;
  languageCode?: string | null;
  pronunciation?: string | null;
  speed?: Speed;
};

let current: HTMLAudioElement | null = null;
let lastRequest: SpeakRequest | null = null;

function base64ToBlobUrl(base64: string, mime: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (bytes.byteLength === 0) throw new Error("El audio recibido está vacío.");
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

/** Generates (or reuses) audio, verifies it really plays and reports the true error otherwise. */
export async function playSpeech(request: SpeakRequest): Promise<{ notice: string | null }> {
  if (!request.text.trim() && !request.pronunciation?.trim()) {
    throw new Error("No hay texto para reproducir.");
  }
  lastRequest = request;
  const result = await speakText({
    data: {
      text: request.text.trim() || request.pronunciation!.trim(),
      languageCode: request.languageCode ?? null,
      pronunciation: request.pronunciation ?? null,
      speed: request.speed ?? "normal",
    },
  });

  const url = base64ToBlobUrl(result.audio, result.mime);
  current?.pause();
  const el = new Audio(url);
  current = el;
  el.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
  try {
    await el.play();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("El navegador ha bloqueado la reproducción. Toca de nuevo el botón de audio.");
  }
  return { notice: result.notice };
}

export function pauseSpeech() {
  current?.pause();
}

export function resumeSpeech() {
  void current?.play().catch(() => undefined);
}

export function stopSpeech() {
  if (!current) return;
  current.pause();
  current.currentTime = 0;
}

export async function repeatSpeech() {
  if (current) {
    current.currentTime = 0;
    await current.play().catch(() => undefined);
    return { notice: null };
  }
  if (lastRequest) return playSpeech(lastRequest);
  throw new Error("Todavía no hay ningún audio para repetir.");
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el audio."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(blob);
  });
}

type RecorderOptions = {
  /** When set, the recording is kept locally so the user can compare their pronunciation. */
  keepRecording?: boolean;
};

export function useRecorder(
  onText: (text: string) => void,
  onError: (message: string) => void,
  options: RecorderOptions = {},
) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [myRecordingUrl, setMyRecordingUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => () => {
    if (myRecordingUrl) URL.revokeObjectURL(myRecordingUrl);
  }, [myRecordingUrl]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 2048) {
          onError("La grabación es demasiado corta. Inténtalo de nuevo.");
          return;
        }
        if (options.keepRecording) setMyRecordingUrl(URL.createObjectURL(blob));
        setBusy(true);
        try {
          const base64 = await blobToBase64(blob);
          const { text } = await transcribeAudio({ data: { audio: base64, mime } });
          if (!text.trim()) onError("No se ha entendido el audio.");
          else onText(text.trim());
        } catch (error) {
          onError(error instanceof Error ? error.message : "Error al transcribir");
        } finally {
          setBusy(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      onError("No se pudo acceder al micrófono.");
    }
  }, [onError, onText, options.keepRecording]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }, []);

  const playMyRecording = useCallback(() => {
    if (!myRecordingUrl) return;
    void new Audio(myRecordingUrl).play().catch(() => undefined);
  }, [myRecordingUrl]);

  return { recording, busy, start, stop, myRecordingUrl, playMyRecording };
}
