-- Historial de precios de cada plan, con fecha de vigencia.
-- Permite cargar un aumento "desde el 1/11" antes de esa fecha: lo que se cobra
-- de noviembre usa el precio nuevo, y las deudas de meses anteriores mantienen el viejo.
-- plans.price queda como el último precio vigente al momento de guardar (compatibilidad);
-- la app calcula el precio de cada mes con esta tabla.
create table if not exists public.plan_prices (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  price numeric(10,2) not null check (price >= 0),
  valid_from date not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  unique (plan_id, valid_from)
);

create index if not exists idx_plan_prices_plan on public.plan_prices(plan_id, valid_from desc);

alter table public.plan_prices enable row level security;

-- Igual que plans: todos ven los precios, solo admin los cambia.
create policy "plan_prices_select_all" on public.plan_prices for select using ( true );
create policy "plan_prices_admin_write" on public.plan_prices for all
  using ( public.has_role('admin') ) with check ( public.has_role('admin') );

-- Precio inicial de cada plan existente: vigente "desde siempre".
insert into public.plan_prices (plan_id, price, valid_from)
select id, price, date '2000-01-01' from public.plans
on conflict (plan_id, valid_from) do nothing;
