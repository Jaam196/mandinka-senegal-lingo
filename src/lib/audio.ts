import { useCallback, useRef, useState } from "react";
import { speakText, transcribeAudio } from "./translate.functions";

let currentAudio: HTMLAudioElement | null = null;

export type SpeechStyle = "phonetic" | "natural";

/** Chooses what to read aloud: Spanish output is read naturally, Mandinka uses the phonetic guide. */
export function speechFor(
  direction: "es-mnk" | "mnk-es",
  translation: string | null | undefined,
  pronunciation?: string | null,
): { text: string; style: SpeechStyle } {
  if (direction === "mnk-es") return { text: translation ?? "", style: "natural" };
  return { text: pronunciation || translation || "", style: "phonetic" };
}

export async function playSpeech(text: string, style: SpeechStyle = "phonetic") {
  if (!text.trim()) throw new Error("No hay texto para reproducir");
  const { audio } = await speakText({ data: { text, style } });
  currentAudio?.pause();
  const el = new Audio(`data:audio/mpeg;base64,${audio}`);
  currentAudio = el;
  await el.play();
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el audio"));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(blob);
  });
}

export function useRecorder(onText: (text: string) => void, onError: (message: string) => void) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
  }, [onError, onText]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }, []);

  return { recording, busy, start, stop };
}