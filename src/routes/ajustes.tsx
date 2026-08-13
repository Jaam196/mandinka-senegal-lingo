import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useIdentity } from "@/lib/identity";
import { clearAllLocalData, useFavorites, useHistory } from "@/lib/localStore";
import { useSpeechSpeed } from "@/lib/prefs";

export const Route = createFileRoute("/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes · Traductor Mandinka de Senegal" },
      {
        name: "description",
        content: "Modo oscuro, privacidad, historial y acceso al panel de administración del diccionario.",
      },
      { property: "og:title", content: "Ajustes · Traductor Mandinka de Senegal" },
      { property: "og:description", content: "Controla tus datos, el tema y el historial de traducciones." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [dark, setDark] = useState(false);
  const history = useHistory();
  const favorites = useFavorites();
  const identity = useIdentity();
  const [name, setName] = useState("");
  const speech = useSpeechSpeed();

  useEffect(() => setName(identity.displayName), [identity.displayName]);

  useEffect(() => {
    const stored = window.localStorage.getItem("mnk_theme") === "dark";
    setDark(stored);
    document.documentElement.classList.toggle("dark", stored);
  }, []);

  function toggleTheme(value: boolean) {
    setDark(value);
    document.documentElement.classList.toggle("dark", value);
    window.localStorage.setItem("mnk_theme", value ? "dark" : "light");
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">⚙️ Ajustes</h1>

      <section className="mt-4 space-y-3">
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <div>
            <p className="font-medium">Modo oscuro</p>
            <p className="text-sm text-muted-foreground">Más cómodo con poca luz.</p>
          </div>
          <Switch checked={dark} onCheckedChange={toggleTheme} />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <div>
            <p className="font-medium">Pronunciación lenta</p>
            <p className="text-sm text-muted-foreground">Reproduce el audio más despacio para practicar.</p>
          </div>
          <Switch
            checked={speech.speed === "slow"}
            onCheckedChange={(v) => speech.setSpeed(v ? "slow" : "normal")}
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-medium">Tu nombre en la comunidad</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Aparece junto a las correcciones y confirmaciones que envíes.
          </p>
          <div className="mt-3 flex gap-2">
            <Input value={name} maxLength={80} placeholder="Anónimo" onChange={(e) => setName(e.target.value)} />
            <Button
              onClick={() => {
                identity.setDisplayName(name);
                toast.success("Nombre guardado");
              }}
            >
              Guardar
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-medium">Privacidad</p>
          <p className="mt-1 text-sm text-muted-foreground">
            El historial y los favoritos se guardan solo en tu dispositivo. Las grabaciones de voz se usan
            únicamente para transcribir y no se almacenan.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                history.clear();
                toast.success("Historial eliminado");
              }}
            >
              Eliminar historial ({history.items.length})
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearAllLocalData();
                toast.success("Todos tus datos han sido eliminados");
              }}
            >
              Eliminar todos mis datos
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Favoritos guardados: {favorites.items.length}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-medium">Funcionamiento sin conexión</p>
          <p className="mt-1 text-sm text-muted-foreground">
            El diccionario, las frases, los favoritos y el historial que ya has consultado quedan guardados
            en el dispositivo. La traducción avanzada con IA y el audio necesitan conexión.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-medium">Otras secciones</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link to="/frases">💬 Frases útiles</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/aprender">🎓 Aprender</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/comunidad">🤝 Comunidad</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/admin">🔐 Administración</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-medium">Sobre la precisión</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta aplicación se centra exclusivamente en el mandinka de Senegal y no mezcla bambara, wolof,
            malinké ni mandinka de Gambia o Guinea-Bisáu. Cuando no existe una traducción documentada, se
            indica claramente y cualquier sugerencia de IA aparece marcada como NO VERIFICADA.
          </p>
        </div>
      </section>
    </AppShell>
  );
}