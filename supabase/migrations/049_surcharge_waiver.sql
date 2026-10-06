-- "Perdonar recargo": se guarda el "pagado hasta" de la cuota perdonada. Cuando la persona paga,
-- el "pagado hasta" cambia y el perdón deja de valer solo (no hace falta limpiarlo).
alter table public.subscriptions add column if not exists surcharge_waived_end_date date;
