-- Permite que instructores tengan un "usuario" en vez de depender de email
alter table public.profiles add column if not exists username text;

create unique index if not exists profiles_username_key
  on public.profiles (username)
  where username is not null;
