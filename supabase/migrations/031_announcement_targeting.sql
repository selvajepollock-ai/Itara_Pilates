alter table public.announcements
  add column if not exists target_type text not null default 'all'
    check (target_type in ('all', 'people', 'class')),
  add column if not exists target_usernames text[],
  add column if not exists target_class_id uuid references public.classes(id) on delete set null;
