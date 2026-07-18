alter table public.studio_settings add column if not exists payment_due_day smallint not null default 10;
