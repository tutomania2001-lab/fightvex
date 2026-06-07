-- ============================================================
-- FightVex — initial Supabase schema (Postgres + Supabase Auth)
--
-- Auth (email/password, sessions) is handled by Supabase's built-in
-- `auth.users`. This migration adds the application tables, keyed to the
-- auth user id, with Row Level Security so each user only ever touches
-- their own rows. The Stripe webhook and other trusted server code use the
-- service_role key, which bypasses RLS.
--
-- Stays in Upstash Redis (NOT migrated): brute-force rate-limit counters,
-- the live odds time-series, and the predictions KV — all ephemeral /
-- time-series data with no need for SQL.
-- ============================================================

-- Subscription tier. Matches PLAN_RANK in src/lib/entitlements.ts.
do $$ begin
  create type plan as enum ('free', 'pro', 'elite');
exception when duplicate_object then null; end $$;

-- ---- profiles: app-level user data (1:1 with auth.users) ----
create table if not exists public.profiles (
  id                      uuid primary key references auth.users(id) on delete cascade,
  email                   text not null,
  name                    text not null default '',
  plan                    plan not null default 'free',
  stripe_customer_id      text unique,
  stripe_subscription_id  text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ---- engagement stats (streak + lifetime sim counter) ----
create table if not exists public.user_stats (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  streak       integer not null default 0,
  last_active  date,
  sims         integer not null default 0
);

-- ---- saved simulations ("insights"), with later grading fields ----
create table if not exists public.insights (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  a_id                text not null,
  a_name              text not null,
  b_id                text not null,
  b_name              text not null,
  winner_name         text not null,
  method              text not null,
  confidence          double precision not null,   -- 0..1
  prob_a              double precision not null,    -- 0..1
  rounds              integer not null,
  runs                integer not null,
  note                text,
  -- set at save time when the matchup is a real scheduled bout
  bout_id             text,
  fight_date          timestamptz,
  -- appended once the fight happened and we graded it
  graded              boolean not null default false,
  graded_at           timestamptz,
  actual_winner_name  text,
  correct_winner      boolean,
  created_at          timestamptz not null default now()
);
create index if not exists insights_user_created_idx on public.insights (user_id, created_at desc);

-- ---- fighter watchlist ----
create table if not exists public.watchlist (
  user_id     uuid not null references auth.users(id) on delete cascade,
  fighter_id  text not null,
  name        text not null,
  added_at    timestamptz not null default now(),
  primary key (user_id, fighter_id)
);

-- ---- bets / bankroll (Elite CLV + bankroll tracking) ----
create table if not exists public.bets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  bout_id       text,
  selection     text not null,              -- fighter id / market label
  stake         double precision not null,  -- units
  odds_taken    integer not null,           -- American odds at bet time
  closing_odds  integer,                    -- for CLV, filled at close
  result        text,                       -- 'win' | 'loss' | 'push' | null (open)
  placed_at     timestamptz not null default now(),
  settled_at    timestamptz
);
create index if not exists bets_user_placed_idx on public.bets (user_id, placed_at desc);

-- ============================================================
-- Row Level Security: every table is owner-scoped via auth.uid().
-- service_role (Stripe webhook, server jobs) bypasses RLS entirely.
-- ============================================================
alter table public.profiles   enable row level security;
alter table public.user_stats enable row level security;
alter table public.insights   enable row level security;
alter table public.watchlist  enable row level security;
alter table public.bets       enable row level security;

-- profiles: read/update own row. Inserts happen via the signup trigger
-- (service-side); plan changes happen via the Stripe webhook (service_role),
-- so the client cannot self-upgrade.
create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- generic owner policies for the per-user tables
create policy "own stats"     on public.user_stats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own insights"  on public.insights   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own watchlist" on public.watchlist  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own bets"      on public.bets        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Auto-provision a profile (+ stats row) when a new auth user signs up.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''))
    on conflict (id) do nothing;
  insert into public.user_stats (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep profiles.updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_touch_updated on public.profiles;
create trigger profiles_touch_updated
  before update on public.profiles
  for each row execute function public.touch_updated_at();
