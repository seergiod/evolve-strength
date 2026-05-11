-- GYMBROS Full Platform Migration
-- Run this after connecting Supabase Auth
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  body_weight NUMERIC,
  height NUMERIC,
  age INTEGER,
  goal TEXT DEFAULT 'general_fitness',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Workouts table
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Workout',
  notes TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  total_volume NUMERIC DEFAULT 0,
  estimated_calories INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workouts are viewable by everyone"
  ON public.workouts FOR SELECT USING (true);

CREATE POLICY "Users can manage their own workouts"
  ON public.workouts FOR ALL USING (auth.uid() = user_id);

-- Workout sets table (replaces old exercises table for logged sets)
CREATE TABLE IF NOT EXISTS public.workout_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  set_number INTEGER NOT NULL DEFAULT 1,
  weight NUMERIC NOT NULL,
  reps INTEGER NOT NULL,
  rpe NUMERIC,
  rest_seconds INTEGER,
  is_personal_record BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workout sets are viewable by everyone"
  ON public.workout_sets FOR SELECT USING (true);

CREATE POLICY "Users can manage their own sets"
  ON public.workout_sets FOR ALL USING (auth.uid() = user_id);

-- Personal records table
CREATE TABLE IF NOT EXISTS public.personal_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  reps INTEGER NOT NULL,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_name)
);

ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PRs are viewable by everyone"
  ON public.personal_records FOR SELECT USING (true);

CREATE POLICY "Users can manage their own PRs"
  ON public.personal_records FOR ALL USING (auth.uid() = user_id);

-- AI chat history
CREATE TABLE IF NOT EXISTS public.ai_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own AI chats"
  ON public.ai_chats FOR ALL USING (auth.uid() = user_id);

-- Social follows
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by everyone"
  ON public.follows FOR SELECT USING (true);

CREATE POLICY "Users can manage their own follows"
  ON public.follows FOR ALL USING (auth.uid() = follower_id);

-- Indexes
CREATE INDEX idx_workout_sets_user_exercise ON public.workout_sets(user_id, exercise_name);
CREATE INDEX idx_workout_sets_workout ON public.workout_sets(workout_id);
CREATE INDEX idx_workouts_user ON public.workouts(user_id, started_at DESC);
CREATE INDEX idx_prs_user_exercise ON public.personal_records(user_id, exercise_name);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_sets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workouts;

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
BEGIN
  base_username := COALESCE(
    NULLIF(regexp_replace(new.raw_user_meta_data->>'username', '[^a-zA-Z0-9_]', '', 'g'), ''),
    NULLIF(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'), ''),
    'user'
  );

  final_username := lower(base_username);

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
    final_username := final_username || '_' || substr(new.id::text, 1, 8);
  END IF;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    new.id,
    final_username,
    COALESCE(NULLIF(new.raw_user_meta_data->>'display_name', ''), final_username)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
