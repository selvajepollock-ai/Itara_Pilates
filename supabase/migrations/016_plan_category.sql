alter table public.plans add column if not exists category text not null default 'reformer'
  check (category in ('reformer', 'fuerza', 'ambos'));
