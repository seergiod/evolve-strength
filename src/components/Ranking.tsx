import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Trophy, Medal, Award } from "lucide-react";

type Exercise = Tables<"exercises">;

type RankRow = { username: string; weight: number; reps: number; created_at: string };

export function Ranking() {
  const [rows, setRows] = useState<RankRow[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("exercises")
      .select("username, weight, reps, created_at")
      .eq("exercise_name", "Press de Banca")
      .order("weight", { ascending: false })
      .limit(50);
    if (!data) return;
    const best = new Map<string, RankRow>();
    for (const r of data) {
      const cur = best.get(r.username);
      if (!cur || Number(r.weight) > Number(cur.weight)) best.set(r.username, r);
    }
    setRows([...best.values()].sort((a, b) => Number(b.weight) - Number(a.weight)).slice(0, 5));
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("ranking")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "exercises" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  if (rows.length === 0) {
    return (
      <div className="card-elevated rounded-2xl p-6 text-center">
        <Trophy className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          Aún no hay datos en Press de Banca. ¡Sé el primero!
        </p>
      </div>
    );
  }

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const medals = [
    { icon: Trophy, color: "text-gold", bg: "from-gold/30 to-transparent", height: "h-32" },
    { icon: Medal, color: "text-silver", bg: "from-silver/30 to-transparent", height: "h-24" },
    { icon: Award, color: "text-bronze", bg: "from-bronze/30 to-transparent", height: "h-20" },
  ];
  const order = [1, 0, 2]; // visual order: silver, gold, bronze

  return (
    <div className="card-elevated rounded-2xl p-5 md:p-6">
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="h-5 w-5 text-gold" />
        <h2 className="font-display text-lg font-bold">Top Press de Banca</h2>
      </div>

      <div className="grid grid-cols-3 gap-3 items-end mb-4">
        {order.map((i) => {
          const r = podium[i];
          if (!r) return <div key={i} />;
          const M = medals[i];
          const Icon = M.icon;
          return (
            <div key={i} className="flex flex-col items-center">
              <Icon className={`h-7 w-7 ${M.color} mb-2`} />
              <p className="text-xs font-semibold truncate max-w-full">{r.username}</p>
              <p className="text-xs text-muted-foreground mb-2">{Number(r.weight)} kg</p>
              <div
                className={`w-full ${M.height} rounded-t-lg bg-gradient-to-t ${M.bg} border-t border-x border-border/40`}
              >
                <div className={`text-center pt-2 font-display font-bold ${M.color}`}>
                  #{i + 1}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <ul className="space-y-2 pt-3 border-t border-border/40">
          {rest.map((r, idx) => (
            <li
              key={r.username}
              className="flex items-center justify-between text-sm py-1"
            >
              <span className="flex items-center gap-3">
                <span className="text-muted-foreground w-5 text-xs">#{idx + 4}</span>
                <span className="font-medium">{r.username}</span>
              </span>
              <span className="text-accent font-semibold">{Number(r.weight)} kg</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
