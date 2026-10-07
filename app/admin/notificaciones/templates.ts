/**
 * Modelos de comunicado. Son fijos (se editan acá, en el código): no se crean ni se guardan desde la pantalla.
 *
 * En los textos:
 *  - {llaves}: se completan solas con los datos de la persona o de la clase elegidas.
 *  - [corchetes]: los completa Vane a mano antes de publicar.
 */
export type Recipient = 'all' | 'people' | 'class'

export type AnnouncementModel = {
  id: string
  emoji: string
  /** Color de fondo del cuadrado del emoji. */
  bg: string
  name: string
  hint: string
  /** Destinatario habitual de este modelo (se sugiere al elegirlo). */
  recipient: Recipient
  text: string
}

export const ANNOUNCEMENT_MODELS: AnnouncementModel[] = [
  {
    id: 'cumpleanos',
    emoji: '🎂',
    bg: '#FCE4EF',
    name: 'Cumpleaños',
    hint: 'Para una persona',
    recipient: 'people',
    text: '¡Feliz cumpleaños, {nombre}! 🎉 Todo el equipo de Itara te desea un año lleno de movimiento y bienestar.',
  },
  {
    id: 'clase-cancelada',
    emoji: '🚫',
    bg: '#FDE6E1',
    name: 'Clase cancelada',
    hint: 'Una clase · con recuperación',
    recipient: 'class',
    text: 'La clase del {día} a las {hora} se suspende. Ya tenés tu recuperación disponible en la app para usar esa semana o la siguiente.',
  },
  {
    id: 'cierre',
    emoji: '⚠️',
    bg: '#FDE6E1',
    name: 'Cierre del estudio',
    hint: 'Fuerza mayor · con recuperación',
    recipient: 'all',
    text: 'Por [motivo], el estudio permanece cerrado el [día]. Si tenías clase ese día, tu recuperación ya está disponible en la app.',
  },
  {
    id: 'feriado',
    emoji: '🗓️',
    bg: '#FDF0D5',
    name: 'Feriado',
    hint: 'Para todos · sin recuperación',
    recipient: 'all',
    text: 'El [día] es feriado y el estudio permanece cerrado. Las clases de ese día no se recuperan. ¡Nos vemos a la vuelta!',
  },
  {
    id: 'cuota',
    emoji: '💳',
    bg: '#E3F4E6',
    name: 'Recordatorio de cuota',
    hint: 'Para todos',
    recipient: 'all',
    text: 'Recordá que la cuota vence el día 1 y desde el día 11 tiene un recargo del 10%. Podés abonar en el estudio.',
  },
  {
    id: 'bienvenida',
    emoji: '👋',
    bg: '#EFE7FB',
    name: 'Bienvenida',
    hint: 'Para alumnos nuevos',
    recipient: 'people',
    text: '¡Te damos la bienvenida a Itara, {nombre}! Desde la app ves tus clases y podés avisar si un día no venís.',
  },
  {
    id: 'novedades',
    emoji: '✨',
    bg: '#FDF0D5',
    name: 'Novedades',
    hint: 'Para todos',
    recipient: 'all',
    text: '¡Tenemos novedades en Itara! [Contá la novedad acá]. Cualquier consulta, escribinos.',
  },
]

/** Cantidad de caracteres a partir de la cual el contador se pone en rojo (solo informativo, no bloquea). */
export const MESSAGE_SOFT_LIMIT = 280

/** ¿Quedan partes entre [corchetes] por completar? */
export const hasBrackets = (text: string) => /\[[^\]]+\]/.test(text)

export type FillData = {
  /** Nombres de pila de las personas elegidas. */
  names: string[]
  /** "martes 6" */
  day?: string
  /** "18:00" */
  time?: string
}

/**
 * Completa {nombre}, {día} y {hora}. Con una sola persona usa su nombre de pila; con varias, saca ", {nombre}"
 * (queda "¡Feliz cumpleaños!"); si todavía no hay dato, deja [nombre], [día] o [hora] para completar a mano.
 */
export function fillTemplate(text: string, data: FillData) {
  let out = text
  if (data.names.length === 1) out = out.split('{nombre}').join(data.names[0])
  else if (data.names.length > 1) out = out.split(', {nombre}').join('').split('{nombre}').join('')
  else out = out.split('{nombre}').join('[nombre]')
  out = out.split('{día}').join(data.day ?? '[día]')
  out = out.split('{hora}').join(data.time ?? '[hora]')
  return out
}
