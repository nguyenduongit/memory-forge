create table if not exists public.race_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_key text not null references public.learning_modules(module_key) on delete restrict,
  sequence_length smallint not null check (sequence_length in (20,30,40,50,60,70,80,90,100,120,150,200)),
  correct_positions smallint not null check (correct_positions >= 0),
  total_positions smallint not null check (total_positions > 0 and correct_positions <= total_positions),
  duration_ms integer not null check (duration_ms >= 0),
  exact boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists race_records_user_length_created_idx on public.race_records (user_id, sequence_length, created_at desc);
alter table public.race_records enable row level security;
drop policy if exists race_records_owner_all on public.race_records;
create policy race_records_owner_all on public.race_records for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
