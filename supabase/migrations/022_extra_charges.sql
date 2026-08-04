alter table public.studio_settings add column if not exists drop_in_class_price numeric not null default 0;
alter table public.recovery_credits add column if not exists is_paid_extra boolean not null default false;

create table if not exists public.extra_charges (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  recovery_credit_id uuid references public.recovery_credits(id) on delete set null,
  description text not null default 'Clase extra',
  amount numeric not null,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.extra_charges enable row level security;

create policy "extra_charges_admin_all" on public.extra_charges for all
  using ( public.has_role('admin') ) with check ( public.has_role('admin') );

create policy "extra_charges_select_own" on public.extra_charges for select
  using ( student_id = auth.uid() );
