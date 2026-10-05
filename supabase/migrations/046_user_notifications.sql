-- Bandeja de notificaciones de cada persona (alumnas e instructores): lo que les avisamos,
-- con leído / no leído. Se borran solas a los 30 días (lo hace la app al cargar la bandeja).
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'info',
  title text not null,
  body text not null default '',
  url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_notifications_user on public.user_notifications(user_id, created_at desc);

alter table public.user_notifications enable row level security;

-- Cada persona ve, marca como leídas y borra las suyas. Las crea el servidor (clave de servicio).
create policy "notif_select_own" on public.user_notifications for select using (user_id = auth.uid());
create policy "notif_update_own" on public.user_notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notif_delete_own" on public.user_notifications for delete using (user_id = auth.uid());

-- Comunicados importantes: se muestran además como ventana emergente al entrar.
alter table public.announcements add column if not exists urgent boolean not null default false;
