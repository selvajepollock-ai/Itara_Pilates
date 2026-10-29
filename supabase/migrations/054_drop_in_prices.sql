-- Historial de precios de clases sueltas (escala 1 / 2 / 3 / 4+), con fecha de vigencia.
-- Igual que plan_prices: se puede cargar un aumento "desde el 1/11" antes de esa fecha.
-- El precio que corresponde es el vigente en la fecha de la clase.
-- studio_settings.drop_in_price_* queda como el último precio vigente al guardar (compatibilidad).
create table if not exists public.drop_in_prices (
  valid_from date primary key,
  price_1 numeric not null check (price_1 >= 0),
  price_2 numeric not null check (price_2 >= 0),
  price_3 numeric not null check (price_3 >= 0),
  price_4_plus numeric not null check (price_4_plus >= 0),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

alter table public.drop_in_prices enable row level security;

create policy "drop_in_prices_select_all" on public.drop_in_prices for select using ( true );
create policy "drop_in_prices_admin_write" on public.drop_in_prices for all
  using ( public.has_role('admin') ) with check ( public.has_role('admin') );

-- Precios actuales: vigentes "desde siempre".
insert into public.drop_in_prices (valid_from, price_1, price_2, price_3, price_4_plus)
select date '2000-01-01', drop_in_price_1, drop_in_price_2, drop_in_price_3, drop_in_price_4_plus
from public.studio_settings
where id = 1
on conflict (valid_from) do nothing;
