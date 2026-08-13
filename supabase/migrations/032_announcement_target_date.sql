alter table public.announcements
  add column if not exists target_date date;
