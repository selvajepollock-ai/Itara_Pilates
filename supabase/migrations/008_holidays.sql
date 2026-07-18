create table public.holidays (
  id uuid primary key default uuid_generate_v4(),
  date date not null unique,
  label text,
  created_at timestamptz not null default now()
);

alter table public.holidays enable row level security;

create policy "holidays_select_all" on public.holidays for select using ( true );

create policy "holidays_admin_write" on public.holidays for all
  using ( public.has_role('admin') ) with check ( public.has_role('admin') );
