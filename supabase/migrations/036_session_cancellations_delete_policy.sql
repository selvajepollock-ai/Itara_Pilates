-- Faltaba el permiso de BORRAR en session_cancellations para el admin.
-- Sin esto, al sacar a un alumno de un horario fijo, el codigo intenta limpiar
-- las cancelaciones viejas de esa inscripcion pero la base las ignora (RLS sin
-- policy de delete = 0 filas borradas, sin error), y despues el borrado de la
-- inscripcion choca con esa relacion ("session_cancellations_enrollment_id_fkey").
create policy "cancellations_delete_admin" on public.session_cancellations for delete
  using ( public.has_role('admin') );
