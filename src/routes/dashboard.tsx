import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Ranking } from "@/components/Ranking";
import { Feed } from "@/components/Feed";
import { ExerciseForm } from "@/components/ExerciseForm";
import { TrainingCalendar } from "@/components/TrainingCalendar";
import { ProfilePage } from "@/components/ProfilePage";
import { AICoach } from "@/components/AICoach";
import { RoutineManager } from "@/components/RoutineManager";
import { SocialPanel } from "@/components/SocialPanel";
import { useAuth } from "@/lib/auth";
import { MotionFade, MotionSlideUp } from "@/components/MotionFade";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — GYMBROS" },
      { name: "description", content: "Tu plataforma fitness AI-powered." },
    ],
  }),
});

type Tab = "home" | "calendar" | "profile" | "coach" | "social";

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "home", label: "Inicio", icon: LayoutDashboard },
  { id: "calendar", label: "Calendario", icon: Calendar },
  { id: "profile", label: "Perfil", icon: UserIcon },
  { id: "coach", label: "Coach IA", icon: Sparkles },
  { id: "social", label: "Social", icon: MessageSquare },
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
    <div className="min-h-screen w-full">
      <Toaster theme="dark" position="top-center" />

      {/* Header — edge to edge */}
      <header className="sticky top-0 z-30 glass-strong border-b border-border">
        <div className="w-full px-4 md:px-8 h-16 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent glow-cyan">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold leading-none text-gradient">GYMBROS</h1>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground hidden sm:block">
                Training Social App
              </p>
            </div>
          </motion.div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {TABS.map((t, i) => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.35 }}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === t.id
                    ? "bg-primary/15 text-primary glow-cyan border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </motion.button>
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
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border glass overflow-hidden"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main — edge to edge */}
      <main className="w-full px-4 md:px-8 py-6 md:py-8">
        <AnimatePresence mode="wait">
          {tab === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.2, 0.9, 0.2, 1] }}
              className="space-y-5"
            >
              <MotionFade>
                <h2 className="font-display text-2xl md:text-3xl font-bold mb-1">
                  Hola, <span className="text-gradient">{profile?.display_name || profile?.username}</span>
                </h2>
                <p className="text-sm text-muted-foreground">Registra tu próximo entrenamiento y sube en el ranking.</p>
              </MotionFade>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                  <MotionSlideUp delay={0.05}>
                    {profile && <ExerciseForm userId={user.id} />}
                  </MotionSlideUp>
                  <MotionSlideUp delay={0.15}>
                    <Feed />
                  </MotionSlideUp>
                  <MotionSlideUp delay={0.25}>
                    <RoutineManager />
                  </MotionSlideUp>
                </div>
                <div className="space-y-5">
                  <MotionSlideUp delay={0.1}>
                    <Ranking />
                  </MotionSlideUp>
                  <MotionSlideUp delay={0.2}>
                    <div className="card-elevated premium-card shimmer-line rounded-3xl p-4 text-center">
                      <Trophy className="float-soft h-8 w-8 text-amber-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold">Leaderboard Global</p>
                      <p className="text-xs text-muted-foreground mt-1">Compite con tu comunidad</p>
                      <button onClick={() => setTab("profile")} className="tap-bounce mt-3 rounded-full border border-primary/30 px-3 py-2 text-xs text-primary hover:bg-primary/10">
                        Ver mi perfil
                      </button>
                    </div>
                  </MotionSlideUp>
                </div>
              </div>
            </motion.div>
          )}

          {tab === "calendar" && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="space-y-5"
            >
              <div>
                <h2 className="font-display text-2xl font-bold mb-1">Calendario</h2>
                <p className="text-sm text-muted-foreground">Tu historial de entrenamientos</p>
              </div>
              <div className="max-w-2xl">
                <TrainingCalendar />
              </div>
            </motion.div>
          )}

          {tab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="space-y-5 max-w-3xl"
            >
              <div>
                <h2 className="font-display text-2xl font-bold mb-1">Mi Perfil</h2>
                <p className="text-sm text-muted-foreground">Estadísticas y progreso personal</p>
              </div>
              <ProfilePage />
            </motion.div>
          )}

          {tab === "coach" && (
            <motion.div
              key="coach"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="space-y-5 max-w-3xl"
            >
              <div>
                <h2 className="font-display text-2xl font-bold mb-1">Coach IA</h2>
                <p className="text-sm text-muted-foreground">Tu entrenador personal inteligente</p>
              </div>
              <AICoach />
            </motion.div>
          )}

          {tab === "social" && (
            <motion.div
              key="social"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="space-y-5 max-w-4xl"
            >
              <div>
                <h2 className="font-display text-2xl font-bold mb-1">Social</h2>
                <p className="text-sm text-muted-foreground">Amigos, chat y rutina compartida</p>
              </div>
              <SocialPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav — glass */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 glass-strong border-t border-border md:hidden">
        <div className="flex px-2 pb-2 pt-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`tap-bounce flex-1 flex flex-col items-center rounded-2xl py-3 gap-1 text-[10px] transition-all ${
                tab === t.id ? "nav-pop bg-primary/15 text-primary glow-cyan" : "text-muted-foreground"
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
