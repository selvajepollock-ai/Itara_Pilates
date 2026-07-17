-- El alta de usuario ahora define el rol y el usuario directamente en la creación
-- (antes dependía de un segundo update que podía no aplicarse correctamente).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, username, roles)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Sin nombre'),
    new.email,
    new.raw_user_meta_data->>'username',
    case
      when new.raw_user_meta_data ? 'roles' then
        array(select jsonb_array_elements_text(new.raw_user_meta_data->'roles'))
      else array['student']::text[]
    end
  );
  return new;
end;
$$;
