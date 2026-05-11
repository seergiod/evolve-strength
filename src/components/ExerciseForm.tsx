import { useState } from "react";
import { CheckCircle2, Play, Plus, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MUSCLE_GROUPS, MUSCLE_GROUP_LIST } from "@/lib/exercises-data";

type Props = {
  userId?: string;
};

export function ExerciseForm({ userId }: Props) {
  const [muscle, setMuscle] = useState<string>("");
  const [exercise, setExercise] = useState<string>("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [sets, setSets] = useState("3");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!muscle || !exercise || !weight || !reps) {
      toast.error("Completa todos los campos");
      return;
    }

    setLoading(true);
    const totalVolume = Number(weight) * Number(reps) * Number(sets);

    try {
      if (userId) {
        const { data: workout, error: workoutError } = await supabase
          .from("workouts")
          .insert({
            user_id: userId,
            title: exercise,
            total_volume: totalVolume,
          })
          .select("id")
          .single();

        if (workoutError || !workout) throw workoutError;

        const setsData = Array.from({ length: Number(sets) }, (_, i) => ({
          workout_id: workout.id,
          user_id: userId,
          exercise_name: exercise,
          muscle_group: muscle,
          set_number: i + 1,
          weight: Number(weight),
          reps: Number(reps),
        }));

        const { error: setsError } = await supabase.from("workout_sets").insert(setsData);
        if (setsError) throw setsError;

        const { data: existingPR } = await supabase
          .from("personal_records")
          .select("weight")
          .eq("user_id", userId)
          .eq("exercise_name", exercise)
          .single();

        if (!existingPR || Number(weight) > Number(existingPR.weight)) {
          await supabase
            .from("personal_records")
            .upsert(
              {
                user_id: userId,
                exercise_name: exercise,
                weight: Number(weight),
                reps: Number(reps),
                workout_id: workout.id,
                achieved_at: new Date().toISOString(),
              },
              { onConflict: "user_id,exercise_name" },
            );

          if (existingPR) {
            toast.success(`Nuevo record personal: ${exercise} · ${weight}kg`, {
              description: `Anterior: ${existingPR.weight}kg`,
            });
          }
        }
      }

      toast.success("Serie completada", {
        description: `${exercise} · ${weight}kg x ${reps} reps x ${sets} series`,
      });

      setShowSuccess(true);
      window.setTimeout(() => setShowSuccess(false), 950);
      setExercise("");
      setWeight("");
      setReps("");
      setSets("3");
    } catch (e) {
      toast.error("Error al guardar el entrenamiento");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const volume = Number(weight) * Number(reps) * Number(sets);

  return (
    <form onSubmit={submit} className="card-elevated premium-card rounded-3xl p-5 md:p-6 space-y-5">
      {showSuccess && (
        <div className="success-pop pointer-events-none absolute left-1/2 top-1/2 z-20 flex h-24 w-24 items-center justify-center rounded-full border border-primary/40 bg-background/90 shadow-[0_0_50px_-10px_oklch(0.86_0.24_145_/_0.9)]">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className="confetti-piece absolute h-2 w-2 rounded-sm bg-accent"
              style={{
                left: `${18 + ((i * 17) % 64)}%`,
                top: `${52 + ((i * 11) % 22)}%`,
                animationDelay: `${i * 42}ms`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 glow-primary">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-accent">Sesion activa</p>
            <h2 className="font-display text-xl font-bold">Diario de entrenamiento</h2>
          </div>
        </div>
        <Sparkles className="hidden h-5 w-5 text-accent sm:block" />
      </div>

      <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Grupo muscular</Label>
          <Select
            value={muscle}
            onValueChange={(v) => {
              setMuscle(v);
              setExercise("");
            }}
          >
            <SelectTrigger className="touch-target rounded-2xl border-border/70 bg-input/70">
              <SelectValue placeholder="Selecciona..." />
            </SelectTrigger>
            <SelectContent>
              {MUSCLE_GROUP_LIST.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Ejercicio</Label>
          <Select value={exercise} onValueChange={setExercise} disabled={!muscle}>
            <SelectTrigger className="touch-target rounded-2xl border-border/70 bg-input/70">
              <SelectValue placeholder={muscle ? "Elige ejercicio" : "Primero el grupo"} />
            </SelectTrigger>
            <SelectContent>
              {muscle &&
                MUSCLE_GROUPS[muscle].map((ex) => (
                  <SelectItem key={ex} value={ex}>
                    {ex}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Peso (kg)</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="80"
            className="touch-target rounded-2xl border-border/70 bg-input/70 text-base"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Repeticiones</Label>
          <Input
            type="number"
            min="1"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="10"
            className="touch-target rounded-2xl border-border/70 bg-input/70 text-base"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Series</Label>
          <div className="grid grid-cols-5 gap-2">
            {["1", "2", "3", "4", "5"].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSets(n)}
                className={`touch-target rounded-2xl border text-sm font-bold transition-all active:scale-95 ${
                  sets === n
                    ? "border-primary bg-primary text-primary-foreground glow-primary"
                    : "border-border/70 bg-input/50 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {weight && reps && sets && (
        <div className="relative grid grid-cols-3 gap-2 rounded-2xl border border-accent/20 bg-background/45 p-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Volumen</p>
            <p className="font-display text-lg font-bold text-accent">{volume.toLocaleString()} kg</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Series</p>
            <p className="font-display text-lg font-bold">{sets}</p>
          </div>
          <div className="flex items-center justify-end">
            <Zap className="h-6 w-6 text-primary" />
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="pulse-cta touch-target relative w-full rounded-2xl bg-gradient-to-r from-primary to-accent text-base font-black text-primary-foreground hover:opacity-95 active:scale-[0.99]"
      >
        {!loading && <Play className="mr-2 h-5 w-5 fill-current" />}
        {loading ? "Guardando serie..." : "Iniciar entrenamiento"}
      </Button>
    </form>
  );
}
