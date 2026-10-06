-- Seguridad: las alumnas ya no escriben directamente en estas tablas.
-- Todas las escrituras de avisos, recuperaciones y asistencia las hace el servidor
-- (con las reglas de plazo, cupo, profesor y semana), no la sesión de la alumna.
drop policy if exists "recovery_insert_system" on public.recovery_credits;
drop policy if exists "recovery_update_own" on public.recovery_credits;
drop policy if exists "attendance_insert_own_recovery" on public.attendance;
drop policy if exists "cancellations_insert_own" on public.session_cancellations;

-- El estudio (admin) sigue pudiendo crear avisos: antes lo cubría la política de las alumnas.
create policy "cancellations_insert_admin" on public.session_cancellations for insert
  with check ( public.has_role('admin') );

-- Seguridad: una persona no puede cambiarse sola el rol ni el estado de alta/baja de su propio perfil.
-- (Hasta ahora podía editar cualquier columna de su fila, incluido "roles".)
-- Las llamadas del servidor (sin sesión de usuario) y las de un administrador no se ven afectadas.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
as $$
begin
  if auth.uid() is not null and not public.has_role('admin') then
    new.roles := old.roles;
    new.active := old.active;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_columns on public.profiles;
create trigger protect_profile_privileged_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();
