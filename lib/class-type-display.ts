// El alumno le dice "Pilates" a lo que en el sistema (y para el admin) es "Reformer".
// Esto es solo cosmético para las pantallas del alumno — no toca la base de datos
// ni las pantallas de admin, que siguen necesitando distinguir Reformer de Fuerza.
export function displayClassType(name: string | null | undefined): string {
  if (!name) return 'Clase'
  if (name.trim().toLowerCase() === 'reformer') return 'Pilates'
  return name
}
