-- Cada persona puede cerrar ("descartar") un aviso del estudio: deja de mostrárselo a ella,
-- pero el comunicado sigue vigente para el resto.
create table if not exists public.announcement_dismissals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, announcement_id)
);

alter table public.announcement_dismissals enable row level security;

create policy "dismissals_select_own" on public.announcement_dismissals for select using (user_id = auth.uid());
create policy "dismissals_insert_own" on public.announcement_dismissals for insert with check (user_id = auth.uid());
create policy "dismissals_delete_own" on public.announcement_dismissals for delete using (user_id = auth.uid());
