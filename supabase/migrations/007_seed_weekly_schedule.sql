-- IMPORTANTE: correr esta migración UNA sola vez (genera 80 clases nuevas).

-- 1. Asegurar los tipos de clase correctos
insert into public.class_types (name, description)
values
  ('Reformer', 'Pilates con máquina reformer'),
  ('Fuerza', 'Ejercicio de fuerza')
on conflict (name) do nothing;

-- Desactivar "Mat" si existe (no se borra, solo deja de estar disponible para clases nuevas)
update public.class_types set active = false where name = 'Mat';

-- 2. Generar el horario recurrente: Lunes a Viernes, 8-11 y 15-20, turnos de 1 hora
with days as (
  select unnest(array[1,2,3,4,5]) as day_of_week
),
hours as (
  select unnest(array[8,9,10,15,16,17,18,19]) as start_hour
),
reformer_type as (
  select id from public.class_types where name = 'Reformer'
),
fuerza_type as (
  select id from public.class_types where name = 'Fuerza'
)
insert into public.classes (class_type_id, room, day_of_week, start_time, end_time, capacity)
select r.id, 'Sala Reformer', d.day_of_week, make_time(h.start_hour, 0, 0), make_time(h.start_hour + 1, 0, 0), 6
from days d cross join hours h cross join reformer_type r
union all
select f.id, 'Sala Reformer', d.day_of_week, make_time(h.start_hour, 0, 0), make_time(h.start_hour + 1, 0, 0), 1
from days d cross join hours h cross join fuerza_type f;
