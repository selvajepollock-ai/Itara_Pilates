export type InboxItem = {
  key: string
  kind: 'signup' | 'recovery' | 'plan' | 'cancellation' | 'birthday'
  /** Texto completo (nombre + detalle), para quien lo necesite en una sola línea. */
  text: string
  /** Nombre de la persona (va en negrita en el panel). */
  name: string
  /** Lo que sigue al nombre: "pidió recuperar el jueves 8 a las 15:00". */
  rest: string
  href: string
  at: string | null
  /** Solo para avisos de ausencia: se avisó fuera de plazo. */
  late?: boolean
  /** Solo para pedidos de recuperación: el crédito sobre el que se puede aprobar o rechazar. */
  creditId?: string
}
