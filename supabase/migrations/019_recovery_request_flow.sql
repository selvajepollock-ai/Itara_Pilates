alter table public.recovery_credits add column if not exists requested_class_id uuid references public.classes(id);
alter table public.recovery_credits add column if not exists requested_session_date date;

alter table public.recovery_credits drop constraint if exists recovery_credits_status_check;
alter table public.recovery_credits add constraint recovery_credits_status_check
  check (status in ('available', 'requested', 'used', 'expired'));
