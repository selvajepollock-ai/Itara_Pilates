-- Clases sueltas: una compra puede incluir varias clases (incluso de distintas semanas) y se cobra junta.
-- batch_id agrupa los cargos de una misma compra.
alter table public.extra_charges add column if not exists batch_id uuid;
create index if not exists idx_extra_charges_batch on public.extra_charges(batch_id);
