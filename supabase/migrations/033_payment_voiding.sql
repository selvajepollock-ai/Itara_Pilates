-- Módulo Pagos: poder anular un pago mal cargado sin borrarlo (queda el rastro),
-- y acelerar los reportes por período.

alter table public.payments
  add column if not exists voided_at timestamptz,
  add column if not exists voided_reason text;

create index if not exists idx_payments_paid_at on public.payments(paid_at);
create index if not exists idx_extra_charges_paid_at on public.extra_charges(paid_at);

-- Nota: la columna payments.recorded_by ya existe desde el schema inicial;
-- a partir de ahora se completa con el admin que registra el pago.
