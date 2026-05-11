import { useState } from "react";
import { Plus, Zap } from "lucide-react";
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
  username: string;
  userId?: string;
};

export function ExerciseForm({ username, userId }: Props) {
  const [muscle, setMuscle] = useState<string>("");
  const [exercise, setExercise] = useState<string>("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [sets, setSets] = useState("3");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!muscle || !exercise || !weight || !reps) {
      toast.error("Completa todos los campos");
      return;
    }

    setLoading(true);
    const totalVolume = Number(weight) * Number(reps) * Number(sets);

    try {
      // If user has auth, create a workout and sets
      if (userId) {
        // Create or get today's workout
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

        // Insert sets
        const setsData = Array.from({ length: Number(sets) }, (_, i) => ({
          workout_id: workout.id,
          user_id: userId,
          exercise_name: exercise,
          muscle_group: muscle,
          set_number: i + 1,
          weight: Number(weight),
          reps: Number(reps),
        }));

        await supabase.from("workout_sets").insert(setsData);

        // Check for PR
        const { data: existingPR } = await supabase
          .from("personal_records")
          .select("weight")
          .eq("user_id", userId)
          .eq("exercise_name", exercise)
          .single();

        if (!existingPR || Number(weight) > Number(existingPR.weight)) {
          await supabase.from("personal_records").upsert({
            user_id: userId,
            exercise_name: exercise,
            weight: Number(weight),
            reps: Number(reps),
            workout_id: workout.id,
            achieved_at: new Date().toISOString(),
          }, { onConflict: "user_id,exercise_name" });

          if (existingPR) {
            toast.success(`¡Nuevo récord personal! 🏆 ${exercise} · ${weight}kg`, {
              description: `Anterior: ${existingPR.weight}kg`,
            });
          }
        }
      }

      // Also insert into the public exercises table for feed (backwards compat)
      await supabase.from("exercises").insert({
        username,
        muscle_group: muscle,
        exercise_name: exercise,
        weight: Number(weight),
        reps: Number(reps),
      });

      toast.success("¡Levantado! 💪", {
        description: `${exercise} · ${weight}kg × ${reps} reps × ${sets} series`,
      });

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

  return (
    <form onSubmit={submit} className="card-elevated rounded-2xl p-5 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 border border-primary/30">
          <Plus className="h-4 w-4 text-primary" />
        </div>
        <h2 className="font-display text-lg font-bold">Registrar ejercicio</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Grupo muscular</Label>
          <Select value={muscle} onValueChange={(v) => { setMuscle(v); setExercise(""); }}>
            <SelectTrigger className="bg-input/60 border-border/60 h-11">
              <SelectValue placeholder="Selecciona..." />
            </SelectTrigger>
            <SelectContent>
              {MUSCLE_GROUP_LIST.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Ejercicio</Label>
          <Select value={exercise} onValueChange={setExercise} disabled={!muscle}>
            <SelectTrigger className="bg-input/60 border-border/60 h-11">
              <SelectValue placeholder={muscle ? "Elige ejercicio" : "Primero el grupo"} />
            </SelectTrigger>
            <SelectContent>
              {muscle && MUSCLE_GROUPS[muscle].map((ex) => (
                <SelectItem key={ex} value={ex}>{ex}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Peso (kg)</Label>
          <Input type="number" step="0.5" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="80" className="bg-input/60 border-border/60 h-11" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Repeticiones</Label>
          <Input type="number" min="1" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="10" className="bg-input/60 border-border/60 h-11" />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Series</Label>
          <div className="flex gap-2">
            {["1", "2", "3", "4", "5"].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSets(n)}
                className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-all ${
                  sets === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/60 bg-input/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {weight && reps && sets && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/40 rounded-lg px-3 py-2">
          <Zap className="h-3 w-3 text-accent" />
          <span>Volumen: <strong className="text-accent">{(Number(weight) * Number(reps) * Number(sets)).toLocaleString()} kg</strong></span>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-11 font-semibold bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shadow-[0_0_20px_-4px_oklch(0.68_0.21_250_/_0.4)]"
      >
        {loading ? "Guardando..." : "Publicar levantamiento 💪"}
      </Button>
    </form>
  );
}
