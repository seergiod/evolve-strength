import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Dumbbell, Flame, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setUsername, getUsername } from "@/lib/session";

export const Route = createFileRoute("/")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "IronFeed — Gimnasio Social" },
      {
        name: "description",
        content:
          "Comparte tus entrenamientos, sube en el ranking y entrena con IA.",
      },
    ],
  }),
});

function LoginPage() {
  const [name, setName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const u = getUsername();
    if (u) navigate({ to: "/dashboard" });
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    setUsername(trimmed);
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-30">
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-primary blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-accent blur-[120px]" />
      </div>

      <div className="w-full max-w-md card-elevated rounded-2xl p-8 md:p-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent glow-primary">
            <Dumbbell className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">IronFeed</h1>
            <p className="text-xs text-muted-foreground">
              Gimnasio social · Powered by AI
            </p>
          </div>
        </div>

        <h2 className="text-3xl md:text-4xl font-bold mb-3">
          Levanta. <span className="text-gradient">Comparte.</span> Domina.
        </h2>
        <p className="text-sm text-muted-foreground mb-8">
          Entra con tu nombre y empieza a competir con tus amigos.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre de usuario"
            className="h-12 text-base bg-input/60 border-border/60"
            autoFocus
          />
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 glow-primary"
          >
            Entrar al gimnasio
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </form>

        <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <Flame className="h-4 w-4 text-accent" />
          <span>Sin contraseñas. Sin emails. Solo hierro.</span>
        </div>
      </div>
    </main>
  );
}
