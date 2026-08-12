import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { LanguageSelect } from "@/components/LanguageSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCommunityTranslation, useSaveCommunityTranslation } from "@/lib/community";
import { useIdentity } from "@/lib/identity";

export type EditorInitial = {
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  translation: string;
  pronunciation: string;
  notes: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: EditorInitial;
  /** "new" permite elegir texto e idiomas; "edit" solo corrige la traducción. */
  mode: "new" | "edit";
  onSaved?: () => void;
};

export function TranslationEditorDialog({ open, onOpenChange, initial, mode, onSaved }: Props) {
  const [form, setForm] = useState<EditorInitial>(initial);
  const save = useSaveCommunityTranslation();
  const { displayName, setDisplayName } = useIdentity();
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setForm(initial);
      setName(displayName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const existing = useCommunityTranslation(form.sourceText, form.sourceLang, form.targetLang);
  const duplicate = mode === "new" && existing.data ? existing.data : null;

  const set = (patch: Partial<EditorInitial>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "new" ? "➕ Añadir traducción" : "✏️ Proponer corrección"}</DialogTitle>
          <DialogDescription>
            El cambio se guarda al instante para todos los usuarios y queda registrado en el historial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="ct-source">Texto original</Label>
            <Input
              id="ct-source"
              value={form.sourceText}
              maxLength={600}
              disabled={mode === "edit"}
              onChange={(e) => set({ sourceText: e.target.value })}
              className="mt-1"
            />
          </div>

          {mode === "new" ? (
            <div className="flex gap-2">
              <LanguageSelect
                label="Idioma de origen"
                value={form.sourceLang}
                exclude={form.targetLang}
                onChange={(code) => set({ sourceLang: code })}
              />
              <LanguageSelect
                label="Idioma de destino"
                value={form.targetLang}
                exclude={form.sourceLang}
                onChange={(code) => set({ targetLang: code })}
              />
            </div>
          ) : null}

          {duplicate ? (
            <div className="rounded-xl bg-muted p-3 text-sm">
              ⚠️ Ya existe una traducción para este texto: <strong>{duplicate.translation}</strong>. Si
              guardas, se creará una nueva versión de esa entrada en lugar de un duplicado.
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() =>
                  set({
                    translation: duplicate.translation,
                    pronunciation: duplicate.pronunciation ?? "",
                    notes: duplicate.notes ?? "",
                  })
                }
              >
                Cargar valores actuales
              </Button>
            </div>
          ) : null}

          <div>
            <Label htmlFor="ct-translation">Traducción</Label>
            <Textarea
              id="ct-translation"
              value={form.translation}
              maxLength={600}
              onChange={(e) => set({ translation: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="ct-pron">Pronunciación (para hispanohablantes)</Label>
            <Input
              id="ct-pron"
              value={form.pronunciation}
              maxLength={600}
              onChange={(e) => set({ pronunciation: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="ct-notes">Notas</Label>
            <Textarea
              id="ct-notes"
              value={form.notes}
              maxLength={1000}
              onChange={(e) => set({ notes: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="ct-name">Tu nombre (visible en el historial)</Label>
            <Input
              id="ct-name"
              value={name}
              maxLength={80}
              placeholder="Anónimo"
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!form.sourceText.trim() || !form.translation.trim() || save.isPending}
            onClick={() => {
              setDisplayName(name);
              save.mutate(form, {
                onSuccess: () => {
                  toast.success("Guardado. Ya es la versión actual para todos.");
                  onOpenChange(false);
                  onSaved?.();
                },
                onError: (error: Error) => toast.error(error.message),
              });
            }}
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Guardar versión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
