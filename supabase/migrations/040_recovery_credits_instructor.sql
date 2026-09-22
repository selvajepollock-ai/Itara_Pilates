-- Un alumno solo puede recuperar con el mismo profesor que le dio la clase original.
-- Guarda el instructor de la clase cancelada en el credito, para poder filtrar despues.
alter table public.recovery_credits
  add column instructor_id uuid references public.profiles(id) on delete set null;
