alter table public.module_progress
  add column if not exists current_streak integer not null default 0 check (current_streak >= 0),
  add column if not exists last_practiced_date date;
