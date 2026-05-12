
-- =========================================================
-- FASE 1: Auth real + estructura completa con RLS por auth.uid()
-- =========================================================

-- 1) PROFILES (FK a auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  bio text,
  body_weight numeric,
  height numeric,
  age integer,
  goal text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone (public info)"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- View pública que excluye datos sensibles (peso, altura, edad)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT id, username, display_name, avatar_url, bio, goal, created_at
FROM public.profiles;

-- 2) Trigger: crear profile al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
BEGIN
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  -- garantizar unicidad
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
    v_username := v_username || floor(random()*1000)::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    v_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', v_username)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) updated_at trigger genérico
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) WORKOUTS
CREATE TABLE IF NOT EXISTS public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Entrenamiento',
  notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_minutes integer,
  total_volume numeric,
  estimated_calories integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workouts visible to everyone (social feed)"
  ON public.workouts FOR SELECT USING (true);

CREATE POLICY "Users can insert their own workouts"
  ON public.workouts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workouts"
  ON public.workouts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workouts"
  ON public.workouts FOR DELETE USING (auth.uid() = user_id);

-- 5) WORKOUT_SETS
CREATE TABLE IF NOT EXISTS public.workout_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  muscle_group text NOT NULL,
  set_number integer NOT NULL DEFAULT 1,
  weight numeric NOT NULL,
  reps integer NOT NULL,
  rpe numeric,
  rest_seconds integer,
  is_personal_record boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sets visible to everyone (social feed)"
  ON public.workout_sets FOR SELECT USING (true);

CREATE POLICY "Users can insert their own sets"
  ON public.workout_sets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sets"
  ON public.workout_sets FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sets"
  ON public.workout_sets FOR DELETE USING (auth.uid() = user_id);

-- 6) PERSONAL_RECORDS
CREATE TABLE IF NOT EXISTS public.personal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workout_id uuid REFERENCES public.workouts(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  weight numeric NOT NULL,
  reps integer NOT NULL,
  achieved_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pr_exercise ON public.personal_records(exercise_name, weight DESC);

ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PRs visible to everyone (ranking)"
  ON public.personal_records FOR SELECT USING (true);

CREATE POLICY "Users can insert their own PRs"
  ON public.personal_records FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PRs"
  ON public.personal_records FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PRs"
  ON public.personal_records FOR DELETE USING (auth.uid() = user_id);

-- 7) AI_CHATS
CREATE TABLE IF NOT EXISTS public.ai_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI chats"
  ON public.ai_chats FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI chats"
  ON public.ai_chats FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI chats"
  ON public.ai_chats FOR DELETE USING (auth.uid() = user_id);

-- 8) FOLLOWS (mantener compat con código existente)
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are visible to everyone"
  ON public.follows FOR SELECT USING (true);

CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- 9) Reescribir RLS de la tabla `exercises` legacy para que sea read-only
DROP POLICY IF EXISTS "Anyone can insert exercises" ON public.exercises;
DROP POLICY IF EXISTS "Anyone can view exercises" ON public.exercises;

CREATE POLICY "Exercises visible to everyone"
  ON public.exercises FOR SELECT USING (true);

-- (sin INSERT público: la app nueva escribe en workout_sets)
