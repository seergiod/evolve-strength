import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Trophy, Flame, Dumbbell, TrendingUp, Edit2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format, subDays } from "date-fns";

type Stats = {
  totalWorkouts: number;
  totalVolume: number;
  totalSets: number;
  streak: number;
  benchPR: number;
  squatPR: number;
  deadliftPR: number;
};

type ProgressPoint = { date: string; volume: number };

export function ProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [progress, setProgress] = useState<ProgressPoint[]>([]);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ bio: "", body_weight: "", height: "", age: "" });

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchProgress();
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      setFormData({
        bio: profile.bio || "",
        body_weight: profile.body_weight?.toString() || "",
        height: profile.height?.toString() || "",
        age: profile.age?.toString() || "",
      });
    }
  }, [profile]);

  const fetchStats = async () => {
    if (!user) return;

    const [workoutsRes, setsRes, prsRes] = await Promise.all([
      supabase.from("workouts").select("total_volume").eq("user_id", user.id),
      supabase.from("workout_sets").select("id").eq("user_id", user.id),
      supabase.from("personal_records").select("exercise_name, weight").eq("user_id", user.id),
    ]);

    const workouts = workoutsRes.data || [];
    const sets = setsRes.data || [];
    const prs = prsRes.data || [];

    const benchPR = prs.find((p) => p.exercise_name.toLowerCase().includes("banca"))?.weight || 0;
    const squatPR = prs.find((p) => p.exercise_name.toLowerCase().includes("sentadilla"))?.weight || 0;
    const deadliftPR = prs.find((p) => p.exercise_name.toLowerCase().includes("muerto"))?.weight || 0;

    setStats({
      totalWorkouts: workouts.length,
      totalVolume: workouts.reduce((sum, w) => sum + (w.total_volume || 0), 0),
      totalSets: sets.length,
      streak: 0, // computed elsewhere
      benchPR: Number(benchPR),
      squatPR: Number(squatPR),
      deadliftPR: Number(deadliftPR),
    });
  };

  const fetchProgress = async () => {
    if (!user) return;
    const days = 30;
    const start = format(subDays(new Date(), days), "yyyy-MM-dd");

    const { data } = await supabase
      .from("workouts")
      .select("started_at, total_volume")
      .eq("user_id", user.id)
      .gte("started_at", start)
      .order("started_at");

    if (data) {
      const points = data.map((w) => ({
        date: format(new Date(w.started_at), "dd/MM"),
        volume: Math.round((w.total_volume || 0) / 1000),
      }));
      setProgress(points);
    }
  };

  const handleSave = async () => {
    const { error } = await updateProfile({
      bio: formData.bio,
      body_weight: formData.body_weight ? parseFloat(formData.body_weight) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      age: formData.age ? parseInt(formData.age) : null,
    });
    if (error) toast.error("Error al guardar perfil");
    else { toast.success("Perfil actualizado"); setEditing(false); }
  };

  const initials = profile?.username?.slice(0, 2).toUpperCase() || "??";

  return (
    <div className="space-y-5">
      {/* Profile Header */}
      <div className="card-elevated rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xl font-bold text-primary-foreground shadow-sm">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full rounded-2xl object-cover" />
                ) : initials}
              </div>
              <button className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-accent flex items-center justify-center shadow-sm">
                <Camera className="h-3 w-3 text-accent-foreground" />
              </button>
            </div>
            <div>
              <h2 className="text-xl font-bold font-display">{profile?.display_name || profile?.username}</h2>
              <p className="text-sm text-accent">@{profile?.username}</p>
              {profile?.bio && <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="gap-2">
            <Edit2 className="h-3 w-3" />
            {editing ? "Cancelar" : "Editar"}
          </Button>
        </div>

        {editing && (
          <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-2 gap-3 animate-in fade-in-0 duration-200">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Bio</Label>
              <Input value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Tu historia..." className="bg-input/60" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Peso corporal (kg)</Label>
              <Input type="number" value={formData.body_weight} onChange={(e) => setFormData({ ...formData, body_weight: e.target.value })} placeholder="80" className="bg-input/60" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Altura (cm)</Label>
              <Input type="number" value={formData.height} onChange={(e) => setFormData({ ...formData, height: e.target.value })} placeholder="175" className="bg-input/60" />
            </div>
            <div className="col-span-2">
              <Button onClick={handleSave} className="w-full bg-gradient-to-r from-primary to-accent">Guardar cambios</Button>
            </div>
          </div>
        )}

        {(profile?.body_weight || profile?.height || profile?.age) && !editing && (
          <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
            {profile.body_weight && <span>⚖️ {profile.body_weight} kg</span>}
            {profile.height && <span>📏 {profile.height} cm</span>}
            {profile.age && <span>🎂 {profile.age} años</span>}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Entrenos", value: stats.totalWorkouts, icon: Dumbbell, color: "text-primary" },
            { label: "Volumen total", value: `${(stats.totalVolume / 1000).toFixed(1)}t`, icon: TrendingUp, color: "text-accent" },
            { label: "Series totales", value: stats.totalSets, icon: Flame, color: "text-amber-400" },
            { label: "Racha", value: `${stats.streak}d`, icon: Flame, color: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="card-elevated rounded-xl p-4 text-center">
              <s.icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
              <p className={`text-xl font-bold font-display ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* PRs */}
      {stats && (
        <div className="card-elevated rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h3 className="font-display font-bold">Records Personales</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { name: "Press Banca", value: stats.benchPR, emoji: "🏋️" },
              { name: "Sentadilla", value: stats.squatPR, emoji: "🦵" },
              { name: "Peso Muerto", value: stats.deadliftPR, emoji: "💀" },
            ].map((pr) => (
              <div key={pr.name} className="rounded-xl bg-background/50 border border-border/40 p-3 text-center">
                <span className="text-2xl">{pr.emoji}</span>
                <p className="text-lg font-bold text-amber-400 mt-1">
                  {pr.value > 0 ? `${pr.value}kg` : "-"}
                </p>
                <p className="text-xs text-muted-foreground">{pr.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Chart */}
      {progress.length > 0 && (
        <div className="card-elevated rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-accent" />
            <h3 className="font-display font-bold">Progreso (últimos 30 días)</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={progress}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.025 250 / 0.3)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.7 0.025 250)" }} />
              <YAxis tick={{ fontSize: 10, fill: "oklch(0.7 0.025 250)" }} unit="t" />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.22 0.025 250)",
                  border: "1px solid oklch(0.3 0.025 250)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="volume"
                stroke="oklch(0.85 0.2 175)"
                strokeWidth={2}
                dot={{ fill: "oklch(0.85 0.2 175)", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
