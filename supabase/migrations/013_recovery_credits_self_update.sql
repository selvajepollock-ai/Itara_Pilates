-- El alumno necesita poder marcar su propio crédito como "usado" al reservar una recuperación.
create policy "recovery_update_own" on public.recovery_credits for update
  using ( student_id = auth.uid() )
  with check ( student_id = auth.uid() );
