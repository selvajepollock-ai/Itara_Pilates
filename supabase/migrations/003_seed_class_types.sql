-- Evita duplicar tipos de clase con el mismo nombre
alter table public.class_types add constraint class_types_name_key unique (name);

-- Seed inicial (podés agregar/editar más después desde el panel admin)
insert into public.class_types (name, description)
values
  ('Mat', 'Pilates en colchoneta'),
  ('Reformer', 'Pilates con máquina reformer')
on conflict (name) do nothing;
