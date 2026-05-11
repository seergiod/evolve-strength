import { useState } from "react";
import { Plus } from "lucide-react";
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

export function ExerciseForm({ username }: { username: string }) {
  const [muscle, setMuscle] = useState<string>("");
  const [exercise, setExercise] = useState<string>("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!muscle || !exercise || !weight || !reps) {
      toast.error("Completa todos los campos");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("exercises").insert({
      username,
      muscle_group: muscle,
      exercise_name: exercise,
      weight: Number(weight),
      reps: Number(reps),
    });
    setLoading(false);
    if (error) {
      toast.error("Error al guardar: " + error.message);
      return;
    }
    toast.success("¡Levantado! 💪", {
      description: `${exercise} · ${weight}kg x ${reps}`,
    });
    setExercise("");
    setWeight("");
    setReps("");
  };

  return (
    <form onSubmit={submit} className="card-elevated rounded-2xl p-5 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Plus className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg font-bold">Registrar ejercicio</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Grupo muscular
          </Label>
          <Select
            value={muscle}
            onValueChange={(v) => {
              setMuscle(v);
              setExercise("");
            }}
          >
            <SelectTrigger className="bg-input/60 border-border/60 h-11">
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
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Ejercicio
          </Label>
          <Select value={exercise} onValueChange={setExercise} disabled={!muscle}>
            <SelectTrigger className="bg-input/60 border-border/60 h-11">
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
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Peso (kg)
          </Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="80"
            className="bg-input/60 border-border/60 h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Repeticiones
          </Label>
          <Input
            type="number"
            min="1"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="10"
            className="bg-input/60 border-border/60 h-11"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-11 font-semibold bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 glow-primary"
      >
        {loading ? "Guardando..." : "Publicar levantamiento"}
      </Button>
    </form>
  );
}
