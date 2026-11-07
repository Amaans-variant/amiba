-- =====================================================================
-- Study Dashboard — Supabase schema
-- Run this once in the SQL Editor of a fresh Supabase project (or via
-- `supabase db push` if you're using the CLI). Safe to re-run: every
-- statement is idempotent (create-if-not-exists / drop-then-create).
-- =====================================================================

create extension if not exists "pgcrypto"; -- gives us gen_random_uuid()

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'student' check (role in ('student', 'admin')),
  study_minutes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.grid_layouts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  layout jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_id_idx on public.tasks (user_id);

create table if not exists public.study_rooms (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.study_room_participants (
  room_id uuid not null references public.study_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.study_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_room_id_idx on public.chat_messages (room_id);

-- ---------------------------------------------------------------------
-- New-user provisioning: every auth.users row gets a matching profiles
-- row automatically, so the app never has to remember to create one.
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- is_admin(): a SECURITY DEFINER helper so RLS policies on `profiles`
-- can check the caller's role WITHOUT querying `profiles` directly from
-- inside its own policy — doing that naively ("infinite recursion
-- detected in policy for relation profiles") is the single most common
-- way people accidentally lock themselves out of their own Supabase
-- project. Routing the role check through this function sidesteps it
-- entirely, Nick-Fury-recruiting-the-Avengers style: don't do the risky
-- part yourself, delegate it to someone built for exactly this.
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Guards against a student granting themselves admin through a raw
-- PATCH to their own profile row — RLS lets them update their own row,
-- this trigger makes sure `role` is the one column that update can't
-- touch unless they're already an admin.
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and new.role is distinct from old.role then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_self_role_escalation on public.profiles;
create trigger profiles_prevent_self_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_self_role_escalation();

-- Atomic +1 for the Digital Timer widget — avoids a read-modify-write
-- race if the same account is open in two tabs.
create or replace function public.increment_study_minutes(minutes integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set study_minutes = study_minutes + minutes where id = auth.uid();
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.increment_study_minutes(integer) to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.grid_layouts enable row level security;
alter table public.tasks enable row level security;
alter table public.study_rooms enable row level security;
alter table public.study_room_participants enable row level security;
alter table public.chat_messages enable row level security;

-- profiles: everyone can read their own row; admins can read/update every
-- row (for the admin user-management page). Nobody can INSERT directly —
-- rows only ever come from the handle_new_user() trigger above.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- grid_layouts: strictly own-row. Nobody else has any reason to see how
-- you've arranged your widgets.
drop policy if exists "grid_layouts_all" on public.grid_layouts;
create policy "grid_layouts_all" on public.grid_layouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- tasks: strictly own-row.
drop policy if exists "tasks_all" on public.tasks;
create policy "tasks_all" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- study_rooms: any signed-in user can look a room up (that's how joining
-- by invite code works — the 6-character code is the actual access
-- control, the same trust model as a Kahoot/Meet code), but you can only
-- create a room as yourself.
drop policy if exists "study_rooms_select" on public.study_rooms;
create policy "study_rooms_select" on public.study_rooms
  for select using (auth.uid() is not null);

drop policy if exists "study_rooms_insert" on public.study_rooms;
create policy "study_rooms_insert" on public.study_rooms
  for insert with check (auth.uid() = created_by);

-- study_room_participants: you can add yourself to a room, and you can
-- see the roster of any room you're already in (or created).
drop policy if exists "study_room_participants_select" on public.study_room_participants;
create policy "study_room_participants_select" on public.study_room_participants
  for select using (
    user_id = auth.uid()
    or room_id in (select id from public.study_rooms where created_by = auth.uid())
  );

drop policy if exists "study_room_participants_insert" on public.study_room_participants;
create policy "study_room_participants_insert" on public.study_room_participants
  for insert with check (user_id = auth.uid());

-- chat_messages: only participants of a room can read or post in it.
drop policy if exists "chat_messages_select" on public.chat_messages;
create policy "chat_messages_select" on public.chat_messages
  for select using (
    exists (
      select 1 from public.study_room_participants sp
      where sp.room_id = chat_messages.room_id and sp.user_id = auth.uid()
    )
  );

drop policy if exists "chat_messages_insert" on public.chat_messages;
create policy "chat_messages_insert" on public.chat_messages
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.study_room_participants sp
      where sp.room_id = chat_messages.room_id and sp.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- Realtime: only chat_messages needs postgres_changes (the call itself
-- is signaled over an ephemeral Broadcast channel, not the database).
-- ---------------------------------------------------------------------

alter publication supabase_realtime add table public.chat_messages;

-- ---------------------------------------------------------------------
-- Optional: make yourself an admin after signing up once through the app
-- (swap in your own email, then run just this line):
--
-- update public.profiles set role = 'admin' where email = 'you@example.com';
-- ---------------------------------------------------------------------
