import { Link } from "@tanstack/react-router";
import { BookOpen, Home, MessagesSquare, Settings, Star } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/diccionario", label: "Diccionario", icon: BookOpen },
  { to: "/conversacion", label: "Conversación", icon: MessagesSquare },
  { to: "/favoritos", label: "Favoritos", icon: Star },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-hero-gradient text-primary-foreground shadow-soft">
              🇸🇳
            </span>
            <span className="text-sm font-semibold leading-tight">
              Mandinka de Senegal
              <span className="block text-xs font-normal text-muted-foreground">↔ Español</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
                activeOptions={{ exact: to === "/" }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-3xl">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground"
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: to === "/" }}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}