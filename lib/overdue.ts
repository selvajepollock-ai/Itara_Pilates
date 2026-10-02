import { getDisplayStatus } from '@/lib/billing'

type SubRow = { student_id: string; end_date: string; comp: boolean | null }

/**
 * Cuotas vencidas, contando una sola vez por alumno (si hubiera más de una
 * suscripción activa, vale la de "pagado hasta" más lejano). Es el mismo cálculo
 * que usa Inicio, compartido para que el badge de Pagos del menú coincida.
 */
export function countOverdueSubscriptions(subs: SubRow[]) {
  const byStudent = new Map<string, SubRow>()
  for (const s of subs) {
    const prev = byStudent.get(s.student_id)
    if (!prev || s.end_date > prev.end_date) byStudent.set(s.student_id, s)
  }
  return [...byStudent.values()].filter((s) => !s.comp && getDisplayStatus(s.end_date) === 'vencido').length
}
