-- Elimina definitivamente todo lo relacionado con clases de Fuerza:
-- clases, inscripciones, asistencia, cancelaciones, creditos de recuperacion y el tipo.
-- NO SE PUEDE DESHACER. Corre todo junto en el SQL Editor de Supabase.
begin;

create temp table _fz_types on commit drop as
  select id from public.class_types where lower(name) like '%fuerza%';

create temp table _fz_classes on commit drop as
  select id from public.classes where class_type_id in (select id from _fz_types);

create temp table _fz_enrollments on commit drop as
  select id from public.enrollments where class_id in (select id from _fz_classes);

create temp table _fz_cancellations on commit drop as
  select id from public.session_cancellations
  where class_id in (select id from _fz_classes)
     or enrollment_id in (select id from _fz_enrollments);

create temp table _fz_credits on commit drop as
  select id from public.recovery_credits
  where class_type_id in (select id from _fz_types)
     or source_cancellation_id in (select id from _fz_cancellations)
     or used_class_id in (select id from _fz_classes)
     or requested_class_id in (select id from _fz_classes);

-- session_cancellations <-> recovery_credits se referencian mutuamente: romper el circulo.
update public.session_cancellations
  set recovery_credit_id = null
  where recovery_credit_id in (select id from _fz_credits);

delete from public.attendance
  where class_id in (select id from _fz_classes)
     or enrollment_id in (select id from _fz_enrollments)
     or recovery_credit_id in (select id from _fz_credits);

delete from public.recovery_credits where id in (select id from _fz_credits);
delete from public.session_cancellations where id in (select id from _fz_cancellations);
delete from public.class_cancellations where class_id in (select id from _fz_classes);
delete from public.waitlist where class_id in (select id from _fz_classes);
delete from public.enrollments where id in (select id from _fz_enrollments);
delete from public.classes where id in (select id from _fz_classes);
delete from public.class_types where id in (select id from _fz_types);

commit;
