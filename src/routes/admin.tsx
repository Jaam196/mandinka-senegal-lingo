import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useCategories, useEntries, type Entry } from "@/lib/dictionary";

type Confidence = "verified" | "probable" | "approximate";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administración del diccionario mandinka" },
      {
        name: "description",
        content: "Panel protegido para añadir, editar, importar y verificar entradas del diccionario.",
      },
      { property: "og:title", content: "Administración del diccionario mandinka" },
      { property: "og:description", content: "Gestión de entradas, fuentes y niveles de confianza." },
    ],
  }),
  ssr: false,
  component: AdminPage,
});

type FormState = {
  id?: string;
  mandinka: string;
  spanish: string;
  pronunciation: string;
  ipa: string;
  category_slug: string;
  example_mandinka: string;
  example_spanish: string;
  region: string;
  source_name: string;
  source_url: string;
  confidence: Confidence;
  verified: boolean;
};

const EMPTY: FormState = {
  mandinka: "",
  spanish: "",
  pronunciation: "",
  ipa: "",
  category_slug: "",
  example_mandinka: "",
  example_spanish: "",
  region: "senegal",
  source_name: "",
  source_url: "",
  confidence: "probable",
  verified: false,
};

function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [search, setSearch] = useState("");
  const [csv, setCsv] = useState("");
  const entries = useEntries();
  const categories = useCategories();
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        setSignedIn(false);
        setChecking(false);
        return;
      }
      setSignedIn(true);
      const { data: admin } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
      if (cancelled) return;
      setIsAdmin(Boolean(admin));
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const duplicates = useMemo(() => {
    const seen = new Map<string, number>();
    (entries.data ?? []).forEach((e) => {
      const key = e.mandinka.toLowerCase();
      seen.set(key, (seen.get(key) ?? 0) + 1);
    });
    return [...seen.entries()].filter(([, count]) => count > 1).map(([key]) => key);
  }, [entries.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return (entries.data ?? []).slice(0, 25);
    return (entries.data ?? [])
      .filter((e) => e.mandinka.toLowerCase().includes(q) || e.spanish.toLowerCase().includes(q))
      .slice(0, 25);
  }, [entries.data, search]);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["entries"] });
  }

  function validate(state: FormState) {
    if (!state.mandinka.trim()) return "Falta la palabra en mandinka.";
    if (!state.spanish.trim()) return "Falta la traducción al español.";
    if (!state.pronunciation.trim()) return "Falta la pronunciación.";
    if (!state.source_name.trim()) return "Falta la fuente.";
    if (!state.region.trim()) return "Falta la región.";
    const duplicate = (entries.data ?? []).find(
      (e) =>
        e.id !== state.id &&
        e.mandinka.toLowerCase() === state.mandinka.trim().toLowerCase() &&
        e.spanish.toLowerCase() === state.spanish.trim().toLowerCase(),
    );
    if (duplicate) return "Ya existe una entrada idéntica.";
    return null;
  }

  async function save() {
    const error = validate(form);
    if (error) {
      toast.error(error);
      return;
    }
    const payload = {
      mandinka: form.mandinka.trim(),
      spanish: form.spanish.trim(),
      pronunciation: form.pronunciation.trim(),
      ipa: form.ipa.trim() || null,
      category_slug: form.category_slug || null,
      example_mandinka: form.example_mandinka.trim() || null,
      example_spanish: form.example_spanish.trim() || null,
      region: form.region.trim(),
      source_name: form.source_name.trim(),
      source_url: form.source_url.trim() || null,
      confidence: form.confidence as Confidence,
      verified: form.verified,
    };
    const query = form.id
      ? supabase.from("dictionary_entries").update(payload).eq("id", form.id)
      : supabase.from("dictionary_entries").insert(payload);
    const { error: dbError } = await query;
    if (dbError) {
      toast.error(dbError.message);
      return;
    }
    toast.success(form.id ? "Entrada actualizada" : "Entrada añadida");
    setForm(EMPTY);
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("dictionary_entries").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Entrada eliminada");
    refresh();
  }

  async function importCsv() {
    const lines = csv.trim().split("\n").filter(Boolean);
    if (lines.length < 2) {
      toast.error("Pega una cabecera y al menos una fila.");
      return;
    }
    const headers = lines[0]!.split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const cells = line.split(",").map((c) => c.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
      return row;
    });
    const invalid = rows.filter((r) => !r["mandinka"] || !r["spanish"]);
    if (invalid.length > 0) {
      toast.error(`${invalid.length} filas sin mandinka o español.`);
      return;
    }
    const payload = rows.map((r) => ({
      mandinka: r["mandinka"]!,
      spanish: r["spanish"]!,
      pronunciation: r["pronunciation"] || null,
      ipa: r["ipa"] || null,
      category_slug: r["category"] || null,
      example_mandinka: r["example_mandinka"] || null,
      example_spanish: r["example_spanish"] || null,
      region: r["region"] || "senegal",
      source_name: r["source"] || null,
      confidence: (r["confidence"] || "probable") as Confidence,
    }));
    const { error } = await supabase.from("dictionary_entries").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${payload.length} entradas importadas`);
    setCsv("");
    refresh();
  }

  function exportCsv() {
    const headers = [
      "mandinka",
      "spanish",
      "pronunciation",
      "ipa",
      "category",
      "example_mandinka",
      "example_spanish",
      "region",
      "source",
      "confidence",
    ];
    const rows = (entries.data ?? []).map((e) =>
      [
        e.mandinka,
        e.spanish,
        e.pronunciation ?? "",
        e.ipa ?? "",
        e.category_slug ?? "",
        e.example_mandinka ?? "",
        e.example_spanish ?? "",
        e.region,
        e.source_name ?? "",
        e.confidence,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diccionario-mandinka.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (checking) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Comprobando permisos...</p>
      </AppShell>
    );
  }

  if (!signedIn) {
    return (
      <AppShell>
        <h1 className="text-2xl font-bold">🔐 Administración</h1>
        <p className="mt-2 text-sm text-muted-foreground">Necesitas iniciar sesión.</p>
        <Button asChild className="mt-4">
          <Link to="/auth">Iniciar sesión</Link>
        </Button>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <h1 className="text-2xl font-bold">🔐 Administración</h1>
        <p className="mt-2 rounded-2xl bg-muted p-4 text-sm">
          Tu cuenta no tiene permisos de administrador del diccionario.
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => {
            void supabase.auth.signOut();
            window.location.reload();
          }}
        >
          Cerrar sesión
        </Button>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">🛠️ Administración del diccionario</h1>

      <section className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold">{form.id ? "Editar entrada" : "Nueva entrada"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Mandinka</Label>
            <Input value={form.mandinka} onChange={(e) => setForm({ ...form, mandinka: e.target.value })} />
          </div>
          <div>
            <Label>Español</Label>
            <Input value={form.spanish} onChange={(e) => setForm({ ...form, spanish: e.target.value })} />
          </div>
          <div>
            <Label>Pronunciación</Label>
            <Input
              value={form.pronunciation}
              onChange={(e) => setForm({ ...form, pronunciation: e.target.value })}
            />
          </div>
          <div>
            <Label>IPA</Label>
            <Input value={form.ipa} onChange={(e) => setForm({ ...form, ipa: e.target.value })} />
          </div>
          <div>
            <Label>Categoría</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.category_slug}
              onChange={(e) => setForm({ ...form, category_slug: e.target.value })}
            >
              <option value="">Sin categoría</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Confianza</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.confidence}
              onChange={(e) => setForm({ ...form, confidence: e.target.value as Confidence })}
            >
              <option value="verified">Confirmada</option>
              <option value="probable">Probable</option>
              <option value="approximate">Aproximada</option>
            </select>
          </div>
          <div>
            <Label>Ejemplo (mandinka)</Label>
            <Input
              value={form.example_mandinka}
              onChange={(e) => setForm({ ...form, example_mandinka: e.target.value })}
            />
          </div>
          <div>
            <Label>Ejemplo (español)</Label>
            <Input
              value={form.example_spanish}
              onChange={(e) => setForm({ ...form, example_spanish: e.target.value })}
            />
          </div>
          <div>
            <Label>Región</Label>
            <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </div>
          <div>
            <Label>Fuente</Label>
            <Input
              value={form.source_name}
              onChange={(e) => setForm({ ...form, source_name: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>URL de la fuente</Label>
            <Input
              value={form.source_url}
              onChange={(e) => setForm({ ...form, source_url: e.target.value })}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.verified}
            onChange={(e) => setForm({ ...form, verified: e.target.checked })}
          />
          Marcar como verificada
        </label>
        <div className="flex gap-2">
          <Button onClick={save}>{form.id ? "Guardar cambios" : "Añadir palabra"}</Button>
          {form.id ? (
            <Button variant="ghost" onClick={() => setForm(EMPTY)}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold">Importar / exportar CSV</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Cabecera: mandinka,spanish,pronunciation,ipa,category,example_mandinka,example_spanish,region,source,confidence
        </p>
        <Textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder="Pega aquí el CSV..."
          className="mt-2 min-h-28 font-mono text-xs"
        />
        <div className="mt-2 flex gap-2">
          <Button onClick={importCsv}>Importar</Button>
          <Button variant="secondary" onClick={exportCsv}>
            Exportar
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold">Entradas ({entries.data?.length ?? 0})</h2>
        {duplicates.length > 0 ? (
          <p className="mt-2 rounded-xl bg-gold/20 p-2 text-xs">
            Posibles duplicados: {duplicates.join(", ")}
          </p>
        ) : null}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar entrada..."
          className="mt-2"
        />
        <ul className="mt-3 space-y-2">
          {filtered.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border p-2 text-sm"
            >
              <span>
                <strong>{entry.mandinka}</strong> · {entry.spanish}
                <span className="block text-xs text-muted-foreground">
                  {entry.pronunciation} · {entry.confidence}
                </span>
              </span>
              <span className="flex gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setForm({
                      id: entry.id,
                      mandinka: entry.mandinka,
                      spanish: entry.spanish,
                      pronunciation: entry.pronunciation ?? "",
                      ipa: entry.ipa ?? "",
                      category_slug: entry.category_slug ?? "",
                      example_mandinka: entry.example_mandinka ?? "",
                      example_spanish: entry.example_spanish ?? "",
                      region: entry.region,
                      source_name: entry.source_name ?? "",
                      source_url: entry.source_url ?? "",
                      confidence: entry.confidence as Confidence,
                      verified: entry.verified,
                    })
                  }
                >
                  Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(entry.id)}>
                  Borrar
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}