import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Activity, Clock } from "lucide-react";

type Exercise = Tables<"exercises">;

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
  const [items, setItems] = useState<Exercise[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("exercises")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setItems(data);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "exercises" },
        (payload) => setItems((prev) => [payload.new as Exercise, ...prev].slice(0, 50)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <div className="card-elevated rounded-2xl p-5 md:p-6">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="h-5 w-5 text-accent" />
        <h2 className="font-display text-lg font-bold">Feed de Actividad</h2>
        <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No hay actividad todavía. Registra el primer ejercicio.
        </p>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {items.map((it) => (
              <li
                key={it.id}
                className="rounded-xl border border-border/40 bg-background/40 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{it.username}</p>
                    <p className="text-sm text-foreground/90 truncate">
                      {it.exercise_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {it.muscle_group}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-accent font-bold">
                      {Number(it.weight)}kg
                    </p>
                    <p className="text-xs text-muted-foreground">
                      x{it.reps} reps
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end mt-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(it.created_at)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-border/40">
            <table className="w-full text-sm">
              <thead className="bg-background/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium">Ejercicio</th>
                  <th className="text-left px-4 py-3 font-medium">Grupo</th>
                  <th className="text-right px-4 py-3 font-medium">Peso</th>
                  <th className="text-right px-4 py-3 font-medium">Reps</th>
                  <th className="text-right px-4 py-3 font-medium">Hace</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr
                    key={it.id}
                    className="border-t border-border/30 hover:bg-background/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold">{it.username}</td>
                    <td className="px-4 py-3">{it.exercise_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {it.muscle_group}
                    </td>
                    <td className="px-4 py-3 text-right text-accent font-semibold">
                      {Number(it.weight)} kg
                    </td>
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
