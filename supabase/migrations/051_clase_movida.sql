-- Marca las recuperaciones que en realidad son una clase movida por el estudio (no generan crédito disponible).
alter table recovery_credits add column if not exists moved_by_studio boolean not null default false;
