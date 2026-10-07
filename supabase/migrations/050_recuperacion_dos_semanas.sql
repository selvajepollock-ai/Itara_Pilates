-- Las recuperaciones valen la semana de la clase y la siguiente.
-- Las que ya están disponibles (o pedidas) pasan a valer una semana más.
-- Se excluyen las clases sueltas pagadas (is_paid_extra), que son una reserva de una fecha puntual.
-- Solo se extienden las que, con la semana extra, todavía estarían vigentes (no revive las muy viejas).

update recovery_credits
set week_end = week_end + 7
where status in ('available', 'requested')
  and is_paid_extra is not true
  and week_end + 7 >= current_date;
