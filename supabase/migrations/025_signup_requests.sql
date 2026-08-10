create table public.signup_requests (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  accepted_student_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.signup_requests enable row level security;

-- Cualquiera (sin login) puede crear una solicitud
create policy "signup_requests_insert_public" on public.signup_requests for insert
  with check ( true );

-- Solo admin puede verlas y gestionarlas
create policy "signup_requests_admin_select" on public.signup_requests for select
  using ( public.has_role('admin') );

create policy "signup_requests_admin_update" on public.signup_requests for update
  using ( public.has_role('admin') );

create policy "signup_requests_admin_delete" on public.signup_requests for delete
  using ( public.has_role('admin') );
