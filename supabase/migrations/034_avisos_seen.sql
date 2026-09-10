-- Avisos: recordar cuándo el admin miró la "actividad reciente" por última vez,
-- para separar lo nuevo de lo ya visto y que el historial se limpie solo.
alter table public.studio_settings add column if not exists avisos_seen_at timestamptz;
