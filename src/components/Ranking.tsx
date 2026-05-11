import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Award, Medal, Trophy } from "lucide-react";

type RankRow = { username: string; weight: number; reps: number; created_at: string };
type PersonalRecordRow = {
  weight: number;
  reps: number;
  achieved_at: string;
  profiles: { username: string } | null;
};

export function Ranking() {
  const [rows, setRows] = useState<RankRow[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("personal_records")
      .select("weight, reps, achieved_at, profiles(username)")
      .eq("exercise_name", "Press de Banca")
      .order("weight", { ascending: false })
      .limit(5);
    if (!data) return;
    setRows(
      (data as PersonalRecordRow[]).map((r) => ({
        username: r.profiles?.username ?? "usuario",
        weight: Number(r.weight),
        reps: r.reps,
        created_at: r.achieved_at,
      })),
    );
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("ranking")
      .on("postgres_changes", { event: "*", schema: "public", table: "personal_records" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  if (rows.length === 0) {
    return (
      <div className="card-elevated premium-card shimmer-line rounded-3xl p-6 text-center">
        <Trophy className="float-soft mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Aun no hay datos en Press de Banca. Se el primero.</p>
      </div>
    );
  }

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const medals = [
    { icon: Trophy, color: "text-gold", bg: "from-gold/40 to-transparent", height: "h-32" },
    { icon: Medal, color: "text-silver", bg: "from-silver/35 to-transparent", height: "h-24" },
    { icon: Award, color: "text-bronze", bg: "from-bronze/35 to-transparent", height: "h-20" },
  ];
  const order = [1, 0, 2];

  return (
    <div className="card-elevated premium-card rounded-3xl p-5 md:p-6">
      <div className="relative mb-5 flex items-center gap-2">
        <Trophy className="float-soft h-5 w-5 text-gold" />
        <h2 className="font-display text-lg font-bold">Top Press de Banca</h2>
      </div>

      <div className="relative mb-4 grid grid-cols-3 items-end gap-3">
        {order.map((i) => {
          const r = podium[i];
          if (!r) return <div key={i} />;
          const M = medals[i];
          const Icon = M.icon;
          return (
            <div key={i} className="stagger-in flex flex-col items-center" style={{ animationDelay: `${i * 90}ms` }}>
              <Icon className={`float-soft mb-2 h-7 w-7 ${M.color}`} />
              <p className="max-w-full truncate text-xs font-semibold">@{r.username}</p>
              <p className="mb-2 text-xs text-muted-foreground">{Number(r.weight)} kg</p>
              <div
                className={`podium-rise w-full ${M.height} rounded-t-2xl bg-gradient-to-t ${M.bg} border-t border-x border-border/40`}
                style={{ animationDelay: `${i * 110}ms` }}
              >
                <div className={`pt-2 text-center font-display font-bold ${M.color}`}>#{i + 1}</div>
              </div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <ul className="space-y-2 border-t border-border/40 pt-3">
          {rest.map((r, idx) => (
            <li
              key={r.username}
              className="stagger-in tap-bounce flex items-center justify-between rounded-2xl bg-background/35 px-3 py-2 text-sm"
              style={{ animationDelay: `${idx * 70}ms` }}
            >
              <span className="flex items-center gap-3">
                <span className="w-5 text-xs text-muted-foreground">#{idx + 4}</span>
                <span className="font-medium">@{r.username}</span>
              </span>
              <span className="font-semibold text-accent">{Number(r.weight)} kg</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
