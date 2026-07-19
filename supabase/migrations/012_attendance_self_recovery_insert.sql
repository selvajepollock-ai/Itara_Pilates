-- Permite que un alumno inserte su propia fila de asistencia SOLO cuando está
-- usando un crédito de recuperación (no puede marcarse presente en una clase fija).
create policy "attendance_insert_own_recovery" on public.attendance for insert
  with check ( student_id = auth.uid() and recovery_credit_id is not null );
