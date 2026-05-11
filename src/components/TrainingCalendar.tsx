import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Flame, Dumbbell, Calendar as CalIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, subMonths, addMonths } from "date-fns";
import { es } from "date-fns/locale";

type WorkoutDay = {
  date: string;
  workout_id: string;
  title: string;
  total_volume: number;
  exercise_count: number;
};

export function TrainingCalendar() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchWorkouts();
  }, [user, currentMonth]);

  const fetchWorkouts = async () => {
    if (!user) return;
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    const { data } = await supabase
      .from("workouts")
      .select("id, title, total_volume, started_at, workout_sets(id)")
      .eq("user_id", user.id)
      .gte("started_at", start)
      .lte("started_at", end + "T23:59:59");

    if (data) {
      const days: WorkoutDay[] = data.map((w) => ({
        date: format(new Date(w.started_at), "yyyy-MM-dd"),
        workout_id: w.id,
        title: w.title,
        total_volume: w.total_volume || 0,
        exercise_count: w.workout_sets?.length || 0,
      }));
      setWorkoutDays(days);
    }

    // Calculate streak
    const { data: allWorkouts } = await supabase
      .from("workouts")
      .select("started_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });

    if (allWorkouts) {
      let s = 0;
      const today = new Date();
      const dates = allWorkouts.map((w) => format(new Date(w.started_at), "yyyy-MM-dd"));
      const uniqueDates = [...new Set(dates)];
      
      for (let i = 0; i < uniqueDates.length; i++) {
        const expected = format(subMonths(today, 0), "yyyy-MM-dd");
        // Simple streak: consecutive days
        if (i === 0) {
          const dayDiff = Math.floor((today.getTime() - new Date(uniqueDates[0]).getTime()) / 86400000);
          if (dayDiff > 1) break;
        }
        s++;
      }
      setStreak(Math.min(s, uniqueDates.length));
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const firstDayOfWeek = startOfMonth(currentMonth).getDay();
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const getWorkoutForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return workoutDays.find((w) => w.date === dateStr);
  };

  return (
    <div className="card-elevated rounded-2xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/20">
            <CalIcon className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">Calendario</h2>
            {streak > 0 && (
              <div className="flex items-center gap-1 text-xs text-amber-400">
                <Flame className="h-3 w-3" />
                <span>{streak} días seguidos</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/40 hover:bg-background/70 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-[120px] text-center capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/40 hover:bg-background/70 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map((day) => {
          const workout = getWorkoutForDay(day);
          const isCurrentDay = isToday(day);
          const isSelected = selectedDay && isSameDay(new Date(selectedDay.date), day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => workout && setSelectedDay(isSelected ? null : workout)}
              className={`
                relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all
                ${workout ? "cursor-pointer" : "cursor-default"}
                ${isCurrentDay ? "ring-2 ring-primary/60" : ""}
                ${isSelected ? "bg-primary text-primary-foreground" : workout ? "bg-red-500/20 hover:bg-red-500/30 text-foreground" : "text-foreground/60 hover:bg-background/40"}
              `}
            >
              <span className={`font-medium text-xs ${isCurrentDay && !isSelected ? "text-primary" : ""}`}>
                {format(day, "d")}
              </span>
              {workout && !isSelected && (
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-0.5" />
              )}
              {workout && isSelected && (
                <Dumbbell className="h-2.5 w-2.5 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-4 pt-4 border-t border-border/40 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-sm">{selectedDay.title}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(selectedDay.date), "d 'de' MMMM, yyyy", { locale: es })}
              </p>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-background/50 border border-border/40 p-3 text-center">
              <p className="text-lg font-bold text-accent">
                {(selectedDay.total_volume / 1000).toFixed(1)}t
              </p>
              <p className="text-xs text-muted-foreground">Volumen</p>
            </div>
            <div className="rounded-xl bg-background/50 border border-border/40 p-3 text-center">
              <p className="text-lg font-bold text-primary">
                {selectedDay.exercise_count}
              </p>
              <p className="text-xs text-muted-foreground">Series</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-400/30" />
          <span>Entrenamiento</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm ring-2 ring-primary/60" />
          <span>Hoy</span>
        </div>
      </div>
    </div>
  );
}
