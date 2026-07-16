-- =====================================================================
-- ESTUDIO DE PILATES — SCHEMA INICIAL
-- Ejecutar completo en el SQL Editor de Supabase (proyecto nuevo/vacío)
-- =====================================================================

create extension if not exists "uuid-ossp";

-- =====================================================================
-- 1. PROFILES (extiende auth.users, con roles como array)
-- =====================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  roles text[] not null default array['student']::text[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint valid_roles check (roles <@ array['admin','instructor','student']::text[])
);

comment on column public.profiles.roles is
  'Array de roles. Un usuario puede ser admin + instructor a la vez. Ej: {admin,instructor}';

-- Trigger: al crear un usuario en auth.users, crear su profile automáticamente como student
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, roles)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Sin nombre'),
    array['student']::text[]
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: chequea si el usuario actual tiene un rol determinado
create or replace function public.has_role(role_name text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role_name = any(roles) and active = true
  );
$$;

-- =====================================================================
-- 2. CLASS TYPES (Mat, Reformer, etc.)
-- =====================================================================
create table public.class_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 3. CLASSES (horario recurrente semanal: día/hora/sala/instructor)
-- =====================================================================
create table public.classes (
  id uuid primary key default uuid_generate_v4(),
  class_type_id uuid not null references public.class_types(id),
  instructor_id uuid references public.profiles(id),
  room text not null default 'Sala principal',
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=domingo ... 6=sábado
  start_time time not null,
  end_time time not null,
  capacity smallint not null default 8,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_classes_instructor on public.classes(instructor_id);
create index idx_classes_day on public.classes(day_of_week);

-- Helper: chequea si el usuario actual es el instructor de una clase
create or replace function public.is_class_instructor(p_class_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.classes
    where id = p_class_id and instructor_id = auth.uid()
  );
$$;

-- =====================================================================
-- 4. PLANS (mensual, bono de 8/12 clases, etc.)
-- =====================================================================
create table public.plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('monthly','bundle')),
  classes_included integer, -- null = ilimitado (mensual full)
  duration_days integer not null default 30,
  price numeric(10,2) not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 5. SUBSCRIPTIONS (plan activo de cada alumno)
-- =====================================================================
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id),
  plan_id uuid not null references public.plans(id),
  start_date date not null default current_date,
  end_date date not null,
  classes_remaining integer, -- null = ilimitado
  status text not null default 'active' check (status in ('active','expired','cancelled')),
  created_at timestamptz not null default now()
);

create index idx_subscriptions_student on public.subscriptions(student_id);
create index idx_subscriptions_status on public.subscriptions(status);

-- =====================================================================
-- 6. PAYMENTS (historial de pagos — registro manual por ahora)
-- =====================================================================
create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid not null references public.subscriptions(id),
  amount numeric(10,2) not null,
  paid_at timestamptz not null default now(),
  method text not null default 'manual', -- 'manual' | 'mercadopago' (a futuro)
  external_reference text, -- id de la pasarela, cuando se integre
  notes text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_payments_subscription on public.payments(subscription_id);

-- =====================================================================
-- 7. ENROLLMENTS (el "horario fijo" del alumno — a qué clase está anotado)
-- =====================================================================
create table public.enrollments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id),
  class_id uuid not null references public.classes(id),
  subscription_id uuid references public.subscriptions(id),
  status text not null default 'active' check (status in ('active','paused','cancelled')),
  created_at timestamptz not null default now(),
  unique(student_id, class_id)
);

create index idx_enrollments_student on public.enrollments(student_id);
create index idx_enrollments_class on public.enrollments(class_id);

-- =====================================================================
-- 8. SESSION CANCELLATIONS (cancelación puntual de una fecha específica)
-- =====================================================================
create table public.session_cancellations (
  id uuid primary key default uuid_generate_v4(),
  enrollment_id uuid not null references public.enrollments(id),
  student_id uuid not null references public.profiles(id),
  class_id uuid not null references public.classes(id),
  session_date date not null,
  cancelled_at timestamptz not null default now(),
  within_deadline boolean not null,
  created_at timestamptz not null default now(),
  unique(enrollment_id, session_date)
);

create index idx_cancellations_student on public.session_cancellations(student_id);

-- =====================================================================
-- 9. RECOVERY CREDITS (créditos "a recuperar" — misma semana, mismo tipo)
-- =====================================================================
create table public.recovery_credits (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id),
  source_cancellation_id uuid not null references public.session_cancellations(id),
  class_type_id uuid not null references public.class_types(id), -- debe recuperar en el mismo tipo
  week_start date not null,
  week_end date not null, -- vence al terminar la semana de la cancelación
  status text not null default 'available' check (status in ('available','used','expired')),
  used_class_id uuid references public.classes(id),
  used_session_date date,
  created_at timestamptz not null default now()
);

create index idx_recovery_student on public.recovery_credits(student_id);
create index idx_recovery_status on public.recovery_credits(status);

alter table public.session_cancellations
  add column recovery_credit_id uuid references public.recovery_credits(id);

-- =====================================================================
-- 10. WAITLIST (lista de espera por clase/fecha puntual)
-- =====================================================================
create table public.waitlist (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid not null references public.classes(id),
  session_date date not null,
  student_id uuid not null references public.profiles(id),
  status text not null default 'waiting' check (status in ('waiting','notified','enrolled','expired')),
  created_at timestamptz not null default now(),
  unique(class_id, session_date, student_id)
);

create index idx_waitlist_class_date on public.waitlist(class_id, session_date);

-- =====================================================================
-- 11. ATTENDANCE (asistencia por sesión concreta)
-- =====================================================================
create table public.attendance (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid not null references public.classes(id),
  session_date date not null,
  student_id uuid not null references public.profiles(id),
  status text not null default 'scheduled' check (status in ('scheduled','present','absent','recovering')),
  enrollment_id uuid references public.enrollments(id),
  recovery_credit_id uuid references public.recovery_credits(id),
  marked_by uuid references public.profiles(id),
  marked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(class_id, session_date, student_id)
);

create index idx_attendance_class_date on public.attendance(class_id, session_date);
create index idx_attendance_student on public.attendance(student_id);

-- =====================================================================
-- 12. STUDIO SETTINGS (config general — fila única)
-- =====================================================================
create table public.studio_settings (
  id smallint primary key default 1,
  cancellation_min_hours integer not null default 12,
  payment_reminder_days_before integer not null default 3,
  payment_reminder_days_after integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.studio_settings (id) values (1);

-- =====================================================================
-- 13. NOTIFICATIONS LOG
-- =====================================================================
create table public.notifications_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id),
  type text not null check (type in ('class_reminder','payment_due','waitlist_opened','general')),
  message text not null,
  channel text not null default 'push',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on public.notifications_log(user_id);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.class_types enable row level security;
alter table public.classes enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.enrollments enable row level security;
alter table public.session_cancellations enable row level security;
alter table public.recovery_credits enable row level security;
alter table public.waitlist enable row level security;
alter table public.attendance enable row level security;
alter table public.studio_settings enable row level security;
alter table public.notifications_log enable row level security;

-- ---- PROFILES ----
create policy "profiles_select" on public.profiles for select
  using ( id = auth.uid() or public.has_role('admin') or public.has_role('instructor') );

create policy "profiles_update_own_or_admin" on public.profiles for update
  using ( id = auth.uid() or public.has_role('admin') );

create policy "profiles_insert_admin" on public.profiles for insert
  with check ( public.has_role('admin') );

-- ---- CLASS TYPES / CLASSES / PLANS / SETTINGS (catálogo: todos ven, solo admin edita) ----
create policy "class_types_select_all" on public.class_types for select using ( true );
create policy "class_types_admin_write" on public.class_types for all
  using ( public.has_role('admin') ) with check ( public.has_role('admin') );

create policy "classes_select_all" on public.classes for select using ( true );
create policy "classes_admin_write" on public.classes for all
  using ( public.has_role('admin') ) with check ( public.has_role('admin') );

create policy "plans_select_all" on public.plans for select using ( true );
create policy "plans_admin_write" on public.plans for all
  using ( public.has_role('admin') ) with check ( public.has_role('admin') );

create policy "settings_select_all" on public.studio_settings for select using ( true );
create policy "settings_admin_write" on public.studio_settings for update
  using ( public.has_role('admin') );

-- ---- SUBSCRIPTIONS ----
create policy "subscriptions_select" on public.subscriptions for select
  using ( student_id = auth.uid() or public.has_role('admin') );

create policy "subscriptions_admin_write" on public.subscriptions for all
  using ( public.has_role('admin') ) with check ( public.has_role('admin') );

-- ---- PAYMENTS ----
create policy "payments_select" on public.payments for select
  using (
    public.has_role('admin')
    or exists (
      select 1 from public.subscriptions s
      where s.id = payments.subscription_id and s.student_id = auth.uid()
    )
  );

create policy "payments_admin_write" on public.payments for all
  using ( public.has_role('admin') ) with check ( public.has_role('admin') );

-- ---- ENROLLMENTS ----
create policy "enrollments_select" on public.enrollments for select
  using (
    student_id = auth.uid()
    or public.has_role('admin')
    or public.is_class_instructor(class_id)
  );

create policy "enrollments_admin_write" on public.enrollments for all
  using ( public.has_role('admin') ) with check ( public.has_role('admin') );

-- ---- SESSION CANCELLATIONS ----
create policy "cancellations_select" on public.session_cancellations for select
  using (
    student_id = auth.uid()
    or public.has_role('admin')
    or public.is_class_instructor(class_id)
  );

create policy "cancellations_insert_own" on public.session_cancellations for insert
  with check ( student_id = auth.uid() or public.has_role('admin') );

create policy "cancellations_admin_update" on public.session_cancellations for update
  using ( public.has_role('admin') );

-- ---- RECOVERY CREDITS ----
create policy "recovery_select" on public.recovery_credits for select
  using ( student_id = auth.uid() or public.has_role('admin') or public.has_role('instructor') );

create policy "recovery_write" on public.recovery_credits for all
  using ( public.has_role('admin') ) with check ( public.has_role('admin') );

create policy "recovery_insert_system" on public.recovery_credits for insert
  with check ( student_id = auth.uid() or public.has_role('admin') );

-- ---- WAITLIST ----
create policy "waitlist_select" on public.waitlist for select
  using (
    student_id = auth.uid()
    or public.has_role('admin')
    or public.is_class_instructor(class_id)
  );

create policy "waitlist_insert_own" on public.waitlist for insert
  with check ( student_id = auth.uid() or public.has_role('admin') );

create policy "waitlist_delete_own_or_admin" on public.waitlist for delete
  using ( student_id = auth.uid() or public.has_role('admin') );

create policy "waitlist_update_admin" on public.waitlist for update
  using ( public.has_role('admin') or public.is_class_instructor(class_id) );

-- ---- ATTENDANCE ----
create policy "attendance_select" on public.attendance for select
  using (
    student_id = auth.uid()
    or public.has_role('admin')
    or public.is_class_instructor(class_id)
  );

create policy "attendance_write_instructor_or_admin" on public.attendance for all
  using ( public.has_role('admin') or public.is_class_instructor(class_id) )
  with check ( public.has_role('admin') or public.is_class_instructor(class_id) );

-- ---- NOTIFICATIONS LOG ----
create policy "notifications_select_own_or_admin" on public.notifications_log for select
  using ( user_id = auth.uid() or public.has_role('admin') );

create policy "notifications_admin_write" on public.notifications_log for all
  using ( public.has_role('admin') ) with check ( public.has_role('admin') );
