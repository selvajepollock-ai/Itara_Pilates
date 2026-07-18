create table public.plan_change_requests (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id),
  requested_plan_id uuid references public.plans(id),
  note text,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.plan_change_requests enable row level security;

create policy "plan_requests_select" on public.plan_change_requests for select
  using ( student_id = auth.uid() or public.has_role('admin') );

create policy "plan_requests_insert_own" on public.plan_change_requests for insert
  with check ( student_id = auth.uid() or public.has_role('admin') );

create policy "plan_requests_admin_update" on public.plan_change_requests for update
  using ( public.has_role('admin') );
