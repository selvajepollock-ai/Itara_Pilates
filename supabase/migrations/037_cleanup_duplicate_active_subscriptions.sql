-- Limpieza puntual: algunos alumnos quedaron con más de una suscripción "active"
-- por una carrera vieja en assignPlan (ver app/admin/pagos/actions.ts). Esto
-- inflaba el contador de "Cuotas vencidas" del inicio (contaba cada fila duplicada).
-- Nos quedamos con la de fecha "pagado hasta" más nueva por alumno y marcamos
-- las demás como 'cancelled' (no se borran, por las dudas).
with ranked as (
  select
    id,
    row_number() over (
      partition by student_id
      order by end_date desc, created_at desc
    ) as rn
  from public.subscriptions
  where status = 'active'
)
update public.subscriptions
set status = 'cancelled'
where id in (select id from ranked where rn > 1);
t