-- Guarda cual era el "pagado hasta" ANTES de este pago, para poder revertirlo
-- si el pago se anula por error (antes, anular un pago no tocaba esa fecha y el
-- alumno quedaba "al día" aunque el pago que lo justificaba ya no existiera).
alter table public.payments
  add column previous_end_date date;
