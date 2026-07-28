create table public.announcements (
  id uuid primary key default uuid_generate_v4(),
  message text not null,
  expires_at date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

create policy "announcements_select_all" on public.announcements for select using ( true );

create policy "announcements_admin_write" on public.announcements for all
  using ( public.has_role('admin') ) with check ( public.has_role('admin') );
