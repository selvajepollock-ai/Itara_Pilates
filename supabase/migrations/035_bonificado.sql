-- Bonificado: el alumno ocupa lugar pero el estudio no le cobra
-- (vale, canje, beca, staff, prueba...). No cuenta como $ ni como deuda.

-- Suscripción sin cargo: persiste hasta que se desmarca.
alter table public.subscriptions
  add column if not exists comp boolean not null default false,
  add column if not exists comp_reason text;

-- Clase suelta / cargo extra bonificado: la clase ocurrió pero no se cobra.
alter table public.extra_charges
  add column if not exists comp boolean not null default false;
