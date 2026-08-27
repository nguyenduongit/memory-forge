-- Memory Forge chỉ có một người sử dụng: mọi tiến độ được lưu vào một bộ dữ liệu chung.
drop trigger if exists on_auth_user_created_memory_forge on auth.users;
drop function if exists public.handle_new_memory_forge_user();

drop table if exists public.race_records;
drop table if exists public.user_achievements;
drop table if exists public.practice_sessions;
drop table if exists public.item_performance;
drop table if exists public.module_progress;
drop table if exists public.user_item_overrides;
drop table if exists public.profiles;

create table public.app_progress (
  module_key text primary key references public.learning_modules(module_key) on delete restrict,
  max_scope_size smallint not null default 10 check (max_scope_size in (10, 50, 100)),
  current_level smallint not null default 1 check (current_level between 1 and 5),
  total_xp integer not null default 0 check (total_xp >= 0),
  unlocked_group_orders smallint[] not null default array[0]::smallint[],
  current_streak integer not null default 0 check (current_streak >= 0),
  last_practiced_date date,
  scoring_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memory_item_overrides (
  memory_item_id uuid primary key references public.memory_items(id) on delete cascade,
  custom_label text,
  updated_at timestamptz not null default now()
);

create table public.item_performance (
  memory_item_id uuid primary key references public.memory_items(id) on delete cascade,
  attempts integer not null default 0 check (attempts >= 0),
  correct_count integer not null default 0 check (correct_count >= 0 and correct_count <= attempts),
  best_ms integer check (best_ms > 0),
  ema_response_ms integer check (ema_response_ms > 0),
  last_practiced_at timestamptz
);

create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  module_key text not null references public.learning_modules(module_key) on delete restrict,
  scope_size smallint not null check (scope_size in (10, 50, 100)),
  direction text not null check (direction in ('number_to_image', 'image_to_number', 'mixed')),
  level smallint not null check (level between 1 and 5),
  started_at timestamptz not null,
  ended_at timestamptz,
  correct_count integer not null default 0 check (correct_count >= 0),
  question_count integer not null default 0 check (question_count >= 0 and correct_count <= question_count),
  mean_response_ms integer check (mean_response_ms > 0),
  status text not null check (status in ('in_progress', 'completed', 'abandoned', 'paused')),
  scoring_version integer not null default 1,
  created_at timestamptz not null default now()
);

create index practice_sessions_ended_idx on public.practice_sessions (ended_at desc);

create table public.race_records (
  id uuid primary key default gen_random_uuid(),
  module_key text not null references public.learning_modules(module_key) on delete restrict,
  sequence_length smallint not null check (sequence_length in (20,30,40,50,60,70,80,90,100,120,150,200)),
  correct_positions smallint not null check (correct_positions >= 0),
  total_positions smallint not null check (total_positions > 0 and correct_positions <= total_positions),
  duration_ms integer not null check (duration_ms >= 0),
  exact boolean not null default false,
  created_at timestamptz not null default now()
);

create index race_records_length_created_idx on public.race_records (sequence_length, created_at desc);

alter table public.app_progress enable row level security;
alter table public.memory_item_overrides enable row level security;
alter table public.item_performance enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.race_records enable row level security;

create policy app_progress_shared_all on public.app_progress for all to anon, authenticated using (true) with check (true);
create policy memory_item_overrides_shared_all on public.memory_item_overrides for all to anon, authenticated using (true) with check (true);
create policy item_performance_shared_all on public.item_performance for all to anon, authenticated using (true) with check (true);
create policy practice_sessions_shared_all on public.practice_sessions for all to anon, authenticated using (true) with check (true);
create policy race_records_shared_all on public.race_records for all to anon, authenticated using (true) with check (true);

drop policy if exists catalog_read_authenticated on public.learning_modules;
create policy catalog_read_shared on public.learning_modules for select to anon, authenticated using (true);
drop policy if exists memory_items_read_authenticated on public.memory_items;
create policy memory_items_read_shared on public.memory_items for select to anon, authenticated using (true);
drop policy if exists achievement_definitions_read_authenticated on public.achievement_definitions;
create policy achievement_definitions_read_shared on public.achievement_definitions for select to anon, authenticated using (true);
