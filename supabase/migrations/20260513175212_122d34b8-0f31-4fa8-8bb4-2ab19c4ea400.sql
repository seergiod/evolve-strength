
-- ROUTINES
CREATE TABLE IF NOT EXISTS public.routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Routines viewable by everyone" ON public.routines FOR SELECT USING (true);
CREATE POLICY "Users insert own routines" ON public.routines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own routines" ON public.routines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own routines" ON public.routines FOR DELETE USING (auth.uid() = user_id);

-- FRIENDSHIPS
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_id, receiver_id)
);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own friendships" ON public.friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
CREATE POLICY "Create friendship requests" ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Accept/update own friendships" ON public.friendships FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
CREATE POLICY "Delete own friendships" ON public.friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Friend check function
CREATE OR REPLACE FUNCTION public.are_friends(a uuid, b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = a AND receiver_id = b) OR (requester_id = b AND receiver_id = a))
  );
$$;

-- CALENDAR EVENTS
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  event_date date NOT NULL,
  event_time text,
  repeat_weekly boolean NOT NULL DEFAULT false,
  repeat_days int[],
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own or friends events" ON public.calendar_events FOR SELECT
  USING (auth.uid() = user_id OR public.are_friends(auth.uid(), user_id));
CREATE POLICY "Insert own events" ON public.calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own events" ON public.calendar_events FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Delete own events" ON public.calendar_events FOR DELETE
  USING (auth.uid() = user_id);

-- CHAT MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own messages" ON public.chat_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Send messages" ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- PROFILES_PUBLIC view: include extra fields used by ProfilePage
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public WITH (security_invoker = on) AS
SELECT id, username, display_name, avatar_url, bio, body_weight, height, age, goal, created_at
FROM public.profiles;
