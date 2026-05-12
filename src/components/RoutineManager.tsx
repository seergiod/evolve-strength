import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, LayoutList, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

type RoutineSchedule = Record<string, { exercise: string; sets: string; reps: string }[]>;

type RoutineRow = {
  id: string;
  name: string;
  schedule: Json;
  created_at: string;
};

const WEEK_DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const emptySchedule = WEEK_DAYS.reduce((acc, day) => ({ ...acc, [day]: [] }), {} as RoutineSchedule);

export function RoutineManager() {
  const { user } = useAuth();
  const [routines, setRoutines] = useState<RoutineRow[]>([]);
  const [name, setName] = useState("");
  const [activeDay, setActiveDay] = useState(WEEK_DAYS[0]);
  const [routineSchedule, setRoutineSchedule] = useState<RoutineSchedule>(emptySchedule);
  const [loading, setLoading] = useState(false);
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) loadRoutines();
  }, [user]);

  const loadRoutines = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("routines")
      .select("id, name, schedule, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("No se pudieron cargar las rutinas");
      return;
    }
    setRoutines(data || []);
  };

  const addExercise = () => {
    if (!exercise || !sets || !reps) {
      toast.error("Completa ejercicio, series y repeticiones");
      return;
    }
    setRoutineSchedule((prev) => ({
      ...prev,
      [activeDay]: [...prev[activeDay], { exercise, sets, reps }],
    }));
    setExercise("");
    setSets("");
    setReps("");
  };

  const clearSchedule = () => setRoutineSchedule(emptySchedule);

  const createRoutine = async () => {
    if (!user) return;
    if (!name) {
      toast.error("Pon un nombre para tu rutina");
      return;
    }
    const daysWithExercises = Object.values(routineSchedule).some((list) => list.length > 0);
    if (!daysWithExercises) {
      toast.error("Agrega ejercicios a la rutina");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("routines")
      .insert([{ user_id: user.id, name, schedule: routineSchedule }])
      .select("id, name, schedule, created_at")
      .single();

    setLoading(false);
    if (error) {
      toast.error("No se pudo crear la rutina");
      return;
    }
    toast.success("Rutina guardada");
    setRoutines((prev) => [data, ...prev]);
    setName("");
    clearSchedule();
  };

  const filteredRoutines = useMemo(
    () => routines.filter((routine) => routine.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [routines, searchTerm],
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className="card-elevated premium-card rounded-3xl p-6"
    >
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Rutinas Premium</p>
          <h3 className="font-display text-xl font-bold">Gestiona tus rutinas</h3>
          <p className="text-sm text-muted-foreground">Crea, guarda y comparte entrenamientos por día.</p>
        </div>
        <div className="text-secondary text-3xl">
          <Sparkles className="h-8 w-8" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nombre de rutina</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Upper body split" className="bg-input/60" />
            </div>
            <div className="space-y-2">
              <Label>Buscar rutinas</Label>
              <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Filtrar por nombre" className="bg-input/60" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 overflow-x-auto pb-2">
            {WEEK_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setActiveDay(day)}
                className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  activeDay === day
                    ? "bg-primary text-primary-foreground glow-cyan"
                    : "bg-background/70 text-muted-foreground hover:bg-background/90"
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-border/60 bg-background/60 p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-sm font-semibold">Ejercicios para {activeDay}</p>
                <p className="text-xs text-muted-foreground">Añade sets y repeticiones.</p>
              </div>
              <button type="button" onClick={clearSchedule} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Limpiar plan
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input value={exercise} onChange={(e) => setExercise(e.target.value)} placeholder="Ejercicio" className="bg-input/60" />
              <Input value={sets} onChange={(e) => setSets(e.target.value)} placeholder="Series" className="bg-input/60" />
              <Input value={reps} onChange={(e) => setReps(e.target.value)} placeholder="Reps" className="bg-input/60" />
            </div>
            <Button onClick={addExercise} className="mt-4 w-full gap-2 bg-gradient-to-r from-primary to-accent">
              <Plus className="h-4 w-4" /> Añadir ejercicio
            </Button>
            <div className="mt-4 space-y-2">
              {routineSchedule[activeDay].map((item, index) => (
                <div key={`${activeDay}-${index}`} className="flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-background/50 px-3 py-2">
                  <div>
                    <p className="font-semibold">{item.exercise}</p>
                    <p className="text-xs text-muted-foreground">{item.sets} x {item.reps}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setRoutineSchedule((prev) => ({
                        ...prev,
                        [activeDay]: prev[activeDay].filter((_, i) => i !== index),
                      }))
                    }
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={createRoutine} disabled={loading} className="w-full bg-gradient-to-r from-primary to-accent">
            Guardar rutina
          </Button>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-border/40 bg-background/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold">Rutinas guardadas</p>
                <p className="text-xs text-muted-foreground">Accede a tus planes premium.</p>
              </div>
              <LayoutList className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-3">
              {filteredRoutines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay rutinas guardadas aún.</p>
              ) : (
                filteredRoutines.map((routine) => (
                  <div key={routine.id} className="rounded-3xl border border-border/30 bg-background/80 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{routine.name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(routine.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="text-xs text-primary">{Object.keys(routine.schedule as Record<string, unknown>).filter((day) => (routine.schedule as Record<string, unknown>)[day].length > 0).length} días</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                      {WEEK_DAYS.filter((day) => (routine.schedule as Record<string, { exercise: string }[]>)[day]?.length > 0).map((day) => (
                        <div key={day} className="rounded-2xl bg-background/70 p-2">
                          <p className="font-semibold text-[11px] text-primary">{day}</p>
                          <p>{(routine.schedule as Record<string, { exercise: string }[]>)[day].map((item) => item.exercise).join(", ")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
