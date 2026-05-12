-- create routines, friendships, chat_messages, calendar_events tables
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  name text not null,
  schedule jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create policy "Routines owner select" on public.routines for select using (user_id = auth.uid());
create policy "Routines friend select" on public.routines for select using (
  exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.receiver_id = user_id)
        or (f.receiver_id = auth.uid() and f.requester_id = user_id))
  )
);
create policy "Routines owner manage" on public.routines for insert with check (user_id = auth.uid());
create policy "Routines owner update" on public.routines for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Routines owner delete" on public.routines for delete using (user_id = auth.uid());

alter table public.routines enable row level security;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id),
  receiver_id uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now()
);

create policy "Friendships participant select" on public.friendships for select using (
  requester_id = auth.uid() or receiver_id = auth.uid()
);
create policy "Friendships send request" on public.friendships for insert with check (
  requester_id = auth.uid() and receiver_id <> auth.uid()
);
create policy "Friendships participant update" on public.friendships for update using (
  requester_id = auth.uid() or receiver_id = auth.uid()
) with check (
  requester_id = auth.uid() or receiver_id = auth.uid()
);
create policy "Friendships owner delete" on public.friendships for delete using (
  requester_id = auth.uid() or receiver_id = auth.uid()
);

alter table public.friendships enable row level security;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id),
  receiver_id uuid not null references public.profiles(id),
  content text not null,
  created_at timestamptz not null default now()
);

create policy "Chat select" on public.chat_messages for select using (
  sender_id = auth.uid() or receiver_id = auth.uid()
);
create policy "Chat insert" on public.chat_messages for insert with check (
  sender_id = auth.uid()
    and (receiver_id = auth.uid()
      or exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and ((f.requester_id = auth.uid() and f.receiver_id = receiver_id)
            or (f.receiver_id = auth.uid() and f.requester_id = receiver_id))
      ))
);
create policy "Chat owner delete" on public.chat_messages for delete using (sender_id = auth.uid());
create policy "Chat owner update" on public.chat_messages for update using (sender_id = auth.uid()) with check (sender_id = auth.uid());

alter table public.chat_messages enable row level security;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  title text not null,
  event_date date not null,
  event_time time not null,
  repeat_weekly boolean not null default false,
  repeat_days text[] not null default ARRAY[]::text[],
  created_at timestamptz not null default now()
);

create policy "Events owner select" on public.calendar_events for select using (user_id = auth.uid());
create policy "Events friend select" on public.calendar_events for select using (
  exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.receiver_id = user_id)
        or (f.receiver_id = auth.uid() and f.requester_id = user_id))
  )
);
create policy "Events owner insert" on public.calendar_events for insert with check (user_id = auth.uid());
create policy "Events owner update" on public.calendar_events for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Events owner delete" on public.calendar_events for delete using (user_id = auth.uid());

alter table public.calendar_events enable row level security;
