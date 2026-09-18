-- Cupo extra "pendiente" por clase: para cargar hoy los lugares nuevos que va a
-- haber cuando lleguen las camas, sin que se puedan ocupar todavía. Un admin
-- activa el cupo con un botón el día que las camas están instaladas, y recién
-- ahí se suma a la capacidad real (capacity).
alter table public.classes
  add column pending_extra_capacity smallint not null default 0;
