create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_memory_forge_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_memory_forge on auth.users;
create trigger on_auth_user_created_memory_forge
  after insert on auth.users
  for each row execute procedure public.handle_new_memory_forge_user();

create table if not exists public.learning_modules (
  module_key text primary key,
  name_vi text not null,
  status text not null check (status in ('active', 'planned', 'disabled')),
  content_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memory_items (
  id uuid primary key default gen_random_uuid(),
  module_key text not null references public.learning_modules(module_key) on delete restrict,
  item_key text not null check (item_key ~ '^[0-9]{2}$'),
  group_order smallint not null check (group_order between 0 and 9),
  default_label text not null,
  default_asset_key text not null,
  content_version integer not null default 1,
  created_at timestamptz not null default now(),
  unique (module_key, item_key)
);

create index if not exists memory_items_module_group_idx on public.memory_items (module_key, group_order);

create table if not exists public.user_item_overrides (
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_item_id uuid not null references public.memory_items(id) on delete cascade,
  custom_label text,
  image_path text,
  image_version integer not null default 0,
  image_checksum text,
  image_bytes integer,
  updated_at timestamptz not null default now(),
  primary key (user_id, memory_item_id)
);

create index if not exists user_item_overrides_user_updated_idx on public.user_item_overrides (user_id, updated_at desc);

create table if not exists public.module_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_key text not null references public.learning_modules(module_key) on delete restrict,
  max_scope_size smallint not null default 10 check (max_scope_size in (10, 50, 100)),
  current_level smallint not null default 1 check (current_level between 1 and 5),
  total_xp integer not null default 0 check (total_xp >= 0),
  unlocked_group_orders smallint[] not null default array[0]::smallint[],
  scoring_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, module_key)
);

create table if not exists public.item_performance (
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_item_id uuid not null references public.memory_items(id) on delete cascade,
  attempts integer not null default 0 check (attempts >= 0),
  correct_count integer not null default 0 check (correct_count >= 0 and correct_count <= attempts),
  best_ms integer check (best_ms > 0),
  ema_response_ms integer check (ema_response_ms > 0),
  last_practiced_at timestamptz,
  primary key (user_id, memory_item_id)
);

create index if not exists item_performance_user_practiced_idx on public.item_performance (user_id, last_practiced_at desc);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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
  idempotency_key text not null,
  scoring_version integer not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists practice_sessions_user_ended_idx on public.practice_sessions (user_id, ended_at desc);

create table if not exists public.achievement_definitions (
  achievement_key text primary key,
  module_key text references public.learning_modules(module_key) on delete restrict,
  criteria_version integer not null default 1,
  title_vi text not null,
  description_vi text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null references public.achievement_definitions(achievement_key) on delete restrict,
  unlocked_at timestamptz not null default now(),
  evidence_session_id uuid references public.practice_sessions(id) on delete set null,
  primary key (user_id, achievement_key)
);

create index if not exists user_achievements_user_unlocked_idx on public.user_achievements (user_id, unlocked_at desc);

insert into public.learning_modules (module_key, name_vi, status, content_version)
values
  ('number-memory', 'Nhớ số', 'active', 1),
  ('card-memory', 'Nhớ bài Tây', 'planned', 1),
  ('name-memory', 'Nhớ tên người', 'planned', 1)
on conflict (module_key) do update set name_vi = excluded.name_vi, status = excluded.status, content_version = excluded.content_version;

with catalog(default_label, position) as (
  select * from unnest(array[
    'Quả trứng','Cái dù','Con vịt','Trái tim','Cái ghế','Quả táo','Vỏ ốc','Cái rìu','Người tuyết','Hươu cao cổ',
    'Con heo','Cái thang','Cá mập','Con bướm','Chiếc thuyền buồm','Túi tiền','Ốc sên','Nốt nhạc','Đèn giao thông','Con chó',
    'Quả bom','Đèn cầy','Con thiên nga','Con công','Con sóc','Cần cẩu','Gà trống','Con chuột','Con thỏ','Chuột máy tính',
    'Ngọn núi','Bóng đèn','Vòi sen','Khúc xương','Dưa hấu','Đu đủ','Hoa hồng','Loa cầm tay','Nhẫn kim cương','Con tê giác',
    'Bút chì','Bình chữa cháy','Diều','Người lướt sóng','Rừng thông','Nam châm','Cung tên','Cầu thang','Doraemon','Ly tách',
    'Xe đạp','Sư tử','Ô tô','Chiếc răng','Người phục vụ','Găng tay đấm bốc','Phao cứu sinh','Cổng thành','Chú hề','Con mèo',
    'Cua','Kẹo mút','Điện thoại cổ','Xe máy','Binh lính','Cú mèo','Tai nghe','Con cá','Bình hồ lô','Bát quái',
    'Sầu riêng','Lá cờ','Con ma','Con trâu','Con đường','Xe tăng','Nước mía','Súng lục','Quả cà chua','Trái dừa',
    'Dấu chân','Loa thùng','Cá sấu','Cây nấm','Kéo','Hạt đậu','Nho','Mắt kính','Còng tay','Thuốc nổ',
    'Cái thớt','Bóng rổ','Bong bóng','Cúp chiến thắng','Gốc cây','Bác sĩ','Trống hoàng gia','Con dê','Con ong','Vợt cầu lông'
  ]::text[]) with ordinality
)
insert into public.memory_items (module_key, item_key, group_order, default_label, default_asset_key, content_version)
select 'number-memory', lpad((position - 1)::text, 2, '0'), ((position - 1) / 10)::smallint, default_label, 'number-' || lpad((position - 1)::text, 2, '0'), 1
from catalog
on conflict (module_key, item_key) do update set default_label = excluded.default_label, default_asset_key = excluded.default_asset_key, content_version = excluded.content_version;

insert into public.achievement_definitions (achievement_key, module_key, criteria_version, title_vi, description_vi)
values
  ('number-memory-first-session', 'number-memory', 1, 'Người thợ khởi đầu', 'Hoàn thành phiên luyện đầu tiên với nhóm 00–09.'),
  ('number-memory-first-reflex', 'number-memory', 1, 'Tia chớp đầu tiên', 'Trả lời đúng một câu dưới 2,5 giây.'),
  ('number-memory-map-50', 'number-memory', 1, 'Bản đồ 50', 'Mở khóa phạm vi luyện tập 50 mã số.'),
  ('number-memory-map-100', 'number-memory', 1, 'Bản đồ 100', 'Mở khóa phạm vi luyện tập toàn bộ 100 mã số.')
on conflict (achievement_key) do update set title_vi = excluded.title_vi, description_vi = excluded.description_vi, criteria_version = excluded.criteria_version;

alter table public.profiles enable row level security;
alter table public.learning_modules enable row level security;
alter table public.memory_items enable row level security;
alter table public.user_item_overrides enable row level security;
alter table public.module_progress enable row level security;
alter table public.item_performance enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.achievement_definitions enable row level security;
alter table public.user_achievements enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists catalog_read_authenticated on public.learning_modules;
create policy catalog_read_authenticated on public.learning_modules for select to authenticated using (true);
drop policy if exists memory_items_read_authenticated on public.memory_items;
create policy memory_items_read_authenticated on public.memory_items for select to authenticated using (true);
drop policy if exists achievement_definitions_read_authenticated on public.achievement_definitions;
create policy achievement_definitions_read_authenticated on public.achievement_definitions for select to authenticated using (true);

drop policy if exists user_item_overrides_owner_all on public.user_item_overrides;
create policy user_item_overrides_owner_all on public.user_item_overrides for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists module_progress_owner_all on public.module_progress;
create policy module_progress_owner_all on public.module_progress for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists item_performance_owner_all on public.item_performance;
create policy item_performance_owner_all on public.item_performance for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists practice_sessions_owner_all on public.practice_sessions;
create policy practice_sessions_owner_all on public.practice_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists user_achievements_owner_all on public.user_achievements;
create policy user_achievements_owner_all on public.user_achievements for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memory-images', 'memory-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists memory_images_select_own on storage.objects;
create policy memory_images_select_own on storage.objects for select to authenticated using (bucket_id = 'memory-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists memory_images_insert_own on storage.objects;
create policy memory_images_insert_own on storage.objects for insert to authenticated with check (bucket_id = 'memory-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists memory_images_update_own on storage.objects;
create policy memory_images_update_own on storage.objects for update to authenticated using (bucket_id = 'memory-images' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'memory-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists memory_images_delete_own on storage.objects;
create policy memory_images_delete_own on storage.objects for delete to authenticated using (bucket_id = 'memory-images' and (storage.foldername(name))[1] = auth.uid()::text);
