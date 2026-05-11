
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  reps INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view exercises"
  ON public.exercises FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert exercises"
  ON public.exercises FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_exercises_created_at ON public.exercises(created_at DESC);
CREATE INDEX idx_exercises_bench ON public.exercises(exercise_name, weight DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.exercises;
