-- Asigna el profesor real a cada clase activa, segun los horarios reales:
-- Yani: lunes, miercoles y viernes 7hs + lunes a viernes 14hs
-- Rodri: lunes a jueves 8-10hs y 16-20hs, viernes 8-9hs y 17-19hs
-- Fabi: lunes, martes y jueves 15hs
--
-- Rodrigo Schulz: b423ad06-07b3-4937-9d9d-6eced4637fda
-- Yanina Cervino: fb798a2c-28a9-4f81-bed2-d4a0a8759601
-- Fabi: e76fccce-2637-482d-8d42-978c74251af5

update public.classes
set instructor_id = 'fb798a2c-28a9-4f81-bed2-d4a0a8759601' -- Yani
where active = true
  and (
    (day_of_week in (1,3,5) and start_time = '07:00:00')
    or start_time = '14:00:00'
  );

update public.classes
set instructor_id = 'b423ad06-07b3-4937-9d9d-6eced4637fda' -- Rodri
where active = true
  and (
    (day_of_week in (1,2,3,4) and start_time in ('08:00:00','09:00:00','10:00:00','16:00:00','17:00:00','18:00:00','19:00:00','20:00:00'))
    or (day_of_week = 5 and start_time in ('08:00:00','09:00:00','17:00:00','18:00:00','19:00:00'))
  );

update public.classes
set instructor_id = 'e76fccce-2637-482d-8d42-978c74251af5' -- Fabi
where active = true
  and day_of_week in (1,2,4)
  and start_time = '15:00:00';

-- Verificacion: no debería quedar ninguna clase activa sin profesor.
select day_of_week, start_time, instructor_id from public.classes where active = true and instructor_id is null;
