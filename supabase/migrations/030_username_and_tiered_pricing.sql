-- IMPORTANTE: antes de correr esto, verificá que no haya usernames duplicados hoy.
-- Corré esto primero; si devuelve filas, resolvé los duplicados antes de continuar:
--   select username, count(*) from public.profiles where username is not null
--   group by username having count(*) > 1;

alter table public.profiles
  add constraint profiles_username_unique unique (username);

alter table public.signup_requests
  add column if not exists username text;

alter table public.studio_settings
  add column if not exists drop_in_price_1 numeric not null default 10000,
  add column if not exists drop_in_price_2 numeric not null default 9000,
  add column if not exists drop_in_price_3 numeric not null default 8000,
  add column if not exists drop_in_price_4_plus numeric not null default 7000;
