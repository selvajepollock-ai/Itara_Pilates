/** Modelos de comunicado. Los textos se pueden ajustar acá; los [corchetes] se completan a mano. */
export const ANNOUNCEMENT_TEMPLATES: { label: string; text: string }[] = [
  {
    label: 'Feriado',
    text: 'El estudio permanece cerrado el [día] por feriado. ¡Nos vemos el [día siguiente]!',
  },
  {
    label: 'Clase cancelada',
    text: 'La clase del [día] a las [hora] se suspende. Podés recuperarla en otro horario desde la app.',
  },
  {
    label: 'Cambio de horario',
    text: 'A partir del [fecha], la clase de las [hora] pasa a las [nueva hora].',
  },
  {
    label: 'Recordatorio de cuota',
    text: 'Recordá que la cuota vence el día 1 y desde el 11 tiene un recargo del 10%.',
  },
]

/** Cantidad de caracteres a partir de la cual el contador se pone en rojo (solo informativo, no bloquea). */
export const MESSAGE_SOFT_LIMIT = 280
