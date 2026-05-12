
ALTER TABLE public.personal_records
  DROP CONSTRAINT IF EXISTS personal_records_user_exercise_unique;
ALTER TABLE public.personal_records
  ADD CONSTRAINT personal_records_user_exercise_unique UNIQUE (user_id, exercise_name);
