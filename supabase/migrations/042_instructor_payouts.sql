-- Registro de lo que se le pago a cada profesor por mes (liquidaciones).
create table if not exists public.instructor_payouts (
  id uuid primary key default uuid_generate_v4(),
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  amount numeric not null check (amount >= 0),
  paid_at date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_instructor_payouts_month on public.instructor_payouts(month, instructor_id);

alter table public.instructor_payouts enable row level security;

create policy "instructor_payouts_admin_all" on public.instructor_payouts for all
  using ( public.has_role('admin') ) with check ( public.has_role('admin') );
