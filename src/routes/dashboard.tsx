import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Dumbbell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Ranking } from "@/components/Ranking";
import { Feed } from "@/components/Feed";
import { ExerciseForm } from "@/components/ExerciseForm";
import { AIAssistant } from "@/components/AIAssistant";
import { clearUsername, getUsername } from "@/lib/session";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — IronFeed" },
      {
        name: "description",
        content: "Tu feed social de gimnasio: ranking, actividad y rutinas IA.",
      },
    ],
  }),
});

function Dashboard() {
  const navigate = useNavigate();
  const [username, setUsernameState] = useState<string | null>(null);

  useEffect(() => {
    const u = getUsername();
    if (!u) {
      navigate({ to: "/" });
      return;
    }
    setUsernameState(u);
  }, [navigate]);

  if (!username) return null;

  const logout = () => {
    clearUsername();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen">
      <Toaster theme="dark" position="top-center" />
      <header className="border-b border-border/40 backdrop-blur-md bg-background/40 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent glow-primary">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold leading-none">IronFeed</h1>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Social Gym
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Conectado</p>
              <p className="text-sm font-semibold text-accent">@{username}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6">
        <section>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-1">
            Hola, <span className="text-gradient">{username}</span> 👋
          </h2>
          <p className="text-sm text-muted-foreground">
            Registra tu próximo levantamiento y sube en el ranking.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <ExerciseForm username={username} />
            <Feed />
          </div>
          <div className="space-y-5">
            <Ranking />
            <AIAssistant />
          </div>
        </div>
      </main>
    </div>
  );
}
