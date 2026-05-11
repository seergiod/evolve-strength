import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Clock, Dumbbell } from "lucide-react";

type FeedItem = {
  id: string;
  username: string;
  muscle_group: string;
  exercise_name: string;
  weight: number;
  reps: number;
  created_at: string;
};

type WorkoutSetRow = {
  id: string;
  muscle_group: string;
  exercise_name: string;
  weight: number;
  reps: number;
  created_at: string;
  profiles: { username: string } | null;
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function Feed() {
  const [items, setItems] = useState<FeedItem[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("workout_sets")
      .select("id, muscle_group, exercise_name, weight, reps, created_at, profiles(username)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setItems(
        (data as WorkoutSetRow[]).map((row) => ({
          id: row.id,
          username: row.profiles?.username ?? "usuario",
          muscle_group: row.muscle_group,
          exercise_name: row.exercise_name,
          weight: Number(row.weight),
          reps: row.reps,
          created_at: row.created_at,
        })),
      );
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "workout_sets" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <div className="card-elevated premium-card rounded-3xl p-5 md:p-6">
      <div className="relative mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10">
          <Activity className="h-5 w-5 text-accent" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Comunidad</p>
          <h2 className="font-display text-lg font-bold">Feed de actividad</h2>
        </div>
        <span className="ml-auto rounded-full border border-border/60 bg-background/50 px-2 py-1 text-xs text-muted-foreground">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="relative py-8 text-center text-sm text-muted-foreground">
          No hay actividad todavia. Registra el primer ejercicio.
        </p>
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {items.map((it, index) => (
              <li
                key={it.id}
                className="stagger-in rounded-3xl border border-border/50 bg-background/45 p-4 shadow-[0_18px_40px_-28px_oklch(0_0_0_/_0.9)] transition-transform active:scale-[0.99]"
                style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                      <Dumbbell className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">@{it.username}</p>
                      <p className="truncate text-sm text-foreground/90">{it.exercise_name}</p>
                      <p className="text-xs text-muted-foreground">{it.muscle_group}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-xl font-bold text-accent">{Number(it.weight)}kg</p>
                    <p className="text-xs text-muted-foreground">x{it.reps} reps</p>
                    <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {timeAgo(it.created_at)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-2xl border border-border/40 md:block">
            <table className="w-full text-sm">
              <thead className="bg-background/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Usuario</th>
                  <th className="px-4 py-3 text-left font-medium">Ejercicio</th>
                  <th className="px-4 py-3 text-left font-medium">Grupo</th>
                  <th className="px-4 py-3 text-right font-medium">Peso</th>
                  <th className="px-4 py-3 text-right font-medium">Reps</th>
                  <th className="px-4 py-3 text-right font-medium">Hace</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, index) => (
                  <tr
                    key={it.id}
                    className="stagger-in border-t border-border/30 transition-colors hover:bg-background/40"
                    style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                  >
                    <td className="px-4 py-3 font-semibold">@{it.username}</td>
                    <td className="px-4 py-3">{it.exercise_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{it.muscle_group}</td>
                    <td className="px-4 py-3 text-right font-semibold text-accent">{Number(it.weight)} kg</td>
                    <td className="px-4 py-3 text-right">{it.reps}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {new Date(it.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
