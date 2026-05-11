import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Dumbbell,
  LogOut,
  LayoutDashboard,
  Calendar,
  User as UserIcon,
  Sparkles,
  Trophy,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Ranking } from "@/components/Ranking";
import { Feed } from "@/components/Feed";
import { ExerciseForm } from "@/components/ExerciseForm";
import { TrainingCalendar } from "@/components/TrainingCalendar";
import { ProfilePage } from "@/components/ProfilePage";
import { AICoach } from "@/components/AICoach";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — IronFeed" },
      { name: "description", content: "Tu plataforma fitness AI-powered." },
    ],
  }),
});

type Tab = "home" | "calendar" | "profile" | "coach";

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "home", label: "Inicio", icon: LayoutDashboard },
  { id: "calendar", label: "Calendario", icon: Calendar },
  { id: "profile", label: "Perfil", icon: UserIcon },
  { id: "coach", label: "Coach IA", icon: Sparkles },
];

function Dashboard() {
  const navigate = useNavigate();
  const { profile, loading, signOut, user } = useAuth();
  const [tab, setTab] = useState<Tab>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/" });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Dumbbell className="h-6 w-6 text-primary animate-pulse" />
          <span className="text-muted-foreground">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen">
      <Toaster theme="dark" position="top-center" />

      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-md bg-background/40 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-[0_0_20px_-4px_oklch(0.68_0.21_250_/_0.5)]">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold leading-none">IronFeed</h1>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground hidden sm:block">
                AI Fitness Platform
              </p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Conectado</p>
              <p className="text-sm font-semibold text-accent">@{profile?.username}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
            <button
              className="md:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/40 bg-background/80 backdrop-blur-md">
            <nav className="flex flex-col p-2 gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setMobileMenuOpen(false); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    tab === t.id
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Home Tab */}
        {tab === "home" && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-1">
                Hola, <span className="text-gradient">{profile?.display_name || profile?.username}</span> 💪
              </h2>
              <p className="text-sm text-muted-foreground">Registra tu próximo entrenamiento y sube en el ranking.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-5">
                {profile && <ExerciseForm username={profile.username} userId={user.id} />}
                <Feed />
              </div>
              <div className="space-y-5">
                <Ranking />
                <div className="card-elevated rounded-2xl p-4 text-center">
                  <Trophy className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold">Leaderboard Global</p>
                  <p className="text-xs text-muted-foreground mt-1">Compite con tu comunidad</p>
                  <button onClick={() => setTab("profile")} className="mt-3 text-xs text-primary hover:underline">
                    Ver mi perfil →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Tab */}
        {tab === "calendar" && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-2xl font-bold mb-1">Calendario</h2>
              <p className="text-sm text-muted-foreground">Tu historial de entrenamientos</p>
            </div>
            <div className="max-w-lg">
              <TrainingCalendar />
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {tab === "profile" && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h2 className="font-display text-2xl font-bold mb-1">Mi Perfil</h2>
              <p className="text-sm text-muted-foreground">Estadísticas y progreso personal</p>
            </div>
            <ProfilePage />
          </div>
        )}

        {/* AI Coach Tab */}
        {tab === "coach" && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h2 className="font-display text-2xl font-bold mb-1">Coach IA</h2>
              <p className="text-sm text-muted-foreground">Tu entrenador personal inteligente</p>
            </div>
            <AICoach />
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border/40 z-30">
        <div className="flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center py-3 gap-1 text-[10px] transition-colors ${
                tab === t.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <t.icon className="h-5 w-5" />
              {t.label}
            </button>
          ))}
        </div>
      </nav>
      <div className="h-20 md:hidden" />
    </div>
  );
}
