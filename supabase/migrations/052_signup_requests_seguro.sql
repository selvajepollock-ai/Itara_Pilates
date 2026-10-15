-- La solicitud de registro es pública (sin login), pero solo se puede crear "pendiente" y con datos de largo razonable.
-- Antes: with check (true), que permitía insertar filas con cualquier estado o textos enormes llamando a la API directo.
drop policy if exists "signup_requests_insert_public" on public.signup_requests;

create policy "signup_requests_insert_public" on public.signup_requests for insert
  with check (
    status = 'pending'
    and char_length(first_name) <= 60
    and char_length(last_name) <= 60
    and char_length(email) <= 120
    and coalesce(char_length(phone), 0) <= 30
    and char_length(username) <= 20
  );
