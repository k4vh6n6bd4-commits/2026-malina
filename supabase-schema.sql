-- MALINA PLANNER / Supabase cloud storage
-- Run once in Supabase Dashboard -> SQL Editor -> New query.

create table if not exists public.planner_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.planner_data enable row level security;

drop policy if exists "Users can read their own planner" on public.planner_data;
drop policy if exists "Users can insert their own planner" on public.planner_data;
drop policy if exists "Users can update their own planner" on public.planner_data;
drop policy if exists "Users can delete their own planner" on public.planner_data;

create policy "Users can read their own planner"
on public.planner_data for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own planner"
on public.planner_data for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own planner"
on public.planner_data for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own planner"
on public.planner_data for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on public.planner_data to authenticated;
