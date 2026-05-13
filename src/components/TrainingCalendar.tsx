import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Dumbbell, Calendar as CalIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, subMonths, addMonths } from "date-fns";
import { es } from "date-fns/locale";

type WorkoutDay = {
  date: string;
  workout_id: string;
  title: string;
  total_volume: number;
  exercise_count: number;
};

type CalendarEvent = {
  id: string;
  user_id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  repeat_weekly: boolean;
  repeat_days: string[] | null;
};

export function TrainingCalendar() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventTime, setEventTime] = useState("18:00");
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatDays, setRepeatDays] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    loadFriendIds();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchSchedule();
  }, [user, currentMonth, friendIds]);

  useEffect(() => {
    if (!selectedDay) {
      setSelectedDayEvents([]);
      return;
    }
    const dayKey = format(selectedDay, "yyyy-MM-dd");
    setSelectedDayEvents(events.filter((event) => event.event_date === dayKey));
  }, [selectedDay, events]);

  const loadFriendIds = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("friendships")
      .select("requester_id,receiver_id,status")
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq("status", "accepted");

    if (error) return;
    const ids = (data || []).map((rel) => (rel.requester_id === user.id ? rel.receiver_id : rel.requester_id));
    setFriendIds([...new Set(ids)]);
  };

  const fetchSchedule = async () => {
    if (!user) return;
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    const userIds = friendIds.length ? [user.id, ...friendIds] : [user.id];

    const { data: workouts } = await supabase
      .from("workouts")
      .select("id, title, total_volume, started_at, user_id")
      .in("user_id", userIds)
      .gte("started_at", start)
      .lte("started_at", `${end}T23:59:59`);

    if (workouts) {
      const days = workouts.map((workout) => ({
        date: format(new Date(workout.started_at), "yyyy-MM-dd"),
        workout_id: workout.id,
        title: workout.title,
        total_volume: workout.total_volume || 0,
        exercise_count: 0,
      }));
      setWorkoutDays(days);
    }

    const { data: eventData } = await supabase
      .from("calendar_events")
      .select("id, user_id, title, event_date, event_time, repeat_weekly, repeat_days")
      .in("user_id", userIds)
      .order("event_date", { ascending: true });

    if (eventData) {
      setEvents(eventData as CalendarEvent[]);
    }
  };

  const selectedEventsLabel = selectedDay ? format(selectedDay, "d 'de' MMMM, yyyy", { locale: es }) : "Selecciona un día";

  const createEvent = async () => {
    if (!user || !selectedDay || !eventTitle.trim()) return;
    const { error } = await supabase.from("calendar_events").insert({
      user_id: user.id,
      title: eventTitle.trim(),
      event_date: format(selectedDay, "yyyy-MM-dd"),
      event_time: eventTime,
      repeat_weekly: repeatWeekly,
      repeat_days: repeatWeekly ? repeatDays.map((d) => Number(d)) : null,
    });

    if (error) {
      toast.error("No se pudo crear el evento");
      return;
    }

    setEventTitle("");
    setRepeatWeekly(false);
    setRepeatDays([]);
    fetchSchedule();
  };

  const getWorkoutForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return workoutDays.find((day) => day.date === dateStr);
  };

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter((event) => event.event_date === dateStr);
  };

  const weekDays = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

  return (
    <div className="card-elevated premium-card rounded-3xl p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="float-soft flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/20">
            <CalIcon className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Calendario</p>
            <h2 className="font-display text-lg font-bold">Planifica tus entrenos y quedadas</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="tap-bounce flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-background/40 hover:bg-background/70 transition-colors"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[140px] text-center text-sm font-medium capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </div>
          <button
            className="tap-bounce flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-background/40 hover:bg-background/70 transition-colors"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs text-muted-foreground font-medium py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, index) => (
          <div key={`empty-${index}`} />
        ))}
        {eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }).map((day) => {
          const workout = getWorkoutForDay(day);
          const dayEvents = getEventsForDay(day);
          const isCurrentDay = isToday(day);
          const hasEvent = dayEvents.length > 0;
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDay(day)}
              className={`tap-bounce relative aspect-square flex flex-col items-center justify-center rounded-2xl border border-border/30 text-sm transition-all ${
                selectedDay && format(selectedDay, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
                  ? "bg-primary text-primary-foreground glow-cyan"
                  : workout
                  ? "bg-primary/15 hover:bg-primary/25 text-foreground"
                  : "bg-background/60 text-muted-foreground hover:bg-background/70"
              } ${isCurrentDay ? "ring-2 ring-primary/50" : ""}`}
            >
              <span className="font-medium">{format(day, "d")}</span>
              {hasEvent && <div className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />}
              {workout && <Dumbbell className="mt-1 h-3 w-3 text-foreground" />}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-border/40 bg-background/60 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Detalle del día</p>
            <h3 className="font-semibold mt-3">{selectedEventsLabel}</h3>
            {selectedDay ? (
              <div className="mt-4 space-y-3">
                {selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay eventos programados.</p>
                ) : (
                  selectedDayEvents.map((event) => (
                    <div key={event.id} className="rounded-3xl border border-border/40 bg-background p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{event.title}</p>
                        {event.user_id !== user?.id ? (
                          <span className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Amigo</span>
                        ) : (
                          <span className="text-[11px] uppercase tracking-[0.3em] text-primary">Tu evento</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {event.event_time ? `${event.event_time} · ` : ""}
                        {event.repeat_weekly ? "Repite semanalmente" : "Evento único"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-3">Selecciona un día para ver detalles y crear nuevas actividades.</p>
            )}
          </div>

          {selectedDay && (
            <div className="rounded-3xl border border-border/40 bg-background/60 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Crear evento</p>
              <div className="mt-4 space-y-3">
                <Input
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Nombre del evento"
                  className="bg-input/60"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input value={eventTime} onChange={(e) => setEventTime(e.target.value)} type="time" className="bg-input/60" />
                  <button
                    type="button"
                    onClick={() => setRepeatWeekly(!repeatWeekly)}
                    className={`rounded-2xl border px-3 py-2 text-sm transition ${
                      repeatWeekly ? "border-accent bg-accent/10 text-accent" : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    {repeatWeekly ? "Repetir semanal" : "Evento único"}
                  </button>
                </div>
                {repeatWeekly && (
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    {['Lun','Mar','Mie','Jue','Vie','Sab','Dom'].map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setRepeatDays((current) =>
                            current.includes(day)
                              ? current.filter((value) => value !== day)
                              : [...current, day],
                          );
                        }}
                        className={`rounded-2xl border px-2 py-2 ${repeatDays.includes(day) ? 'border-accent bg-accent/10 text-accent' : 'border-border/50 text-muted-foreground'}`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                )}
                <Button onClick={createEvent} className="w-full bg-gradient-to-r from-primary to-accent">
                  Crear evento
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border/40 bg-background/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Tu red</h3>
            <span className="text-xs text-muted-foreground">{friendIds.length} amigos conectados</span>
          </div>
          <div className="space-y-3">
            {events.slice(0, 4).map((event) => (
              <div key={event.id} className="rounded-3xl border border-border/40 p-4 bg-background">
                <p className="font-semibold">{event.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(event.event_date), "dd/MM/yyyy")} {event.event_time ?? ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
