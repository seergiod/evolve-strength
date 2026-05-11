import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const GOALS = [
  "Ganar fuerza",
  "Ganar masa muscular (hipertrofia)",
  "Perder peso / definición",
  "Mejorar resistencia",
  "Tonificar y mantenerme en forma",
];
const LEVELS = ["Principiante", "Intermedio", "Avanzado"];
const DAYS = ["3", "4", "5", "6"];

function renderMarkdown(md: string) {
  // Tiny markdown: headings, bold, lists
  const lines = md.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("### "))
      return (
        <h4 key={i} className="font-display text-base font-bold text-accent mt-3">
          {line.slice(4)}
        </h4>
      );
    if (line.startsWith("## "))
      return (
        <h3 key={i} className="font-display text-lg font-bold text-gradient mt-4">
          {line.slice(3)}
        </h3>
      );
    if (line.startsWith("# "))
      return (
        <h2 key={i} className="font-display text-xl font-bold mt-4">
          {line.slice(2)}
        </h2>
      );
    if (line.startsWith("- ") || line.startsWith("* "))
      return (
        <li key={i} className="ml-5 list-disc text-sm">
          {boldify(line.slice(2))}
        </li>
      );
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return (
      <p key={i} className="text-sm leading-relaxed">
        {boldify(line)}
      </p>
    );
  });
}

function boldify(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="text-foreground">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function AIAssistant() {
  const [goal, setGoal] = useState(GOALS[0]);
  const [level, setLevel] = useState(LEVELS[1]);
  const [days, setDays] = useState("4");
  const [routine, setRoutine] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setRoutine("");
    try {
      const res = await fetch("/api/ai-routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, level, days: Number(days) }),
      });
      if (!res.ok) {
        const txt = await res.text();
        toast.error(txt || "Error generando rutina");
        return;
      }
      const data = (await res.json()) as { routine: string };
      setRoutine(data.routine);
    } catch (e) {
      toast.error("Error de red");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-elevated rounded-2xl p-5 md:p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent glow-neon">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <h2 className="font-display text-lg font-bold">Asistente de Rutinas IA</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="space-y-1.5 sm:col-span-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Objetivo
          </Label>
          <Select value={goal} onValueChange={setGoal}>
            <SelectTrigger className="bg-input/60 border-border/60 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOALS.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Nivel
          </Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="bg-input/60 border-border/60 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Días/semana
          </Label>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="bg-input/60 border-border/60 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-1 flex items-end">
          <Button
            onClick={generate}
            disabled={loading}
            className="w-full h-11 font-semibold bg-gradient-to-r from-accent to-primary text-primary-foreground hover:opacity-90 glow-neon"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generar rutina
              </>
            )}
          </Button>
        </div>
      </div>

      {routine && (
        <div className="mt-4 rounded-xl border border-border/40 bg-background/50 p-4 max-h-[500px] overflow-auto space-y-1">
          {renderMarkdown(routine)}
        </div>
      )}
    </div>
  );
}
