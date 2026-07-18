import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, DAY_ORDER, formatTime } from '@/lib/day-names'
import { getMonday, dateForDayOfWeek, toISODate, isInPast } from '@/lib/sessions'
import { CancelSessionButton } from '@/app/alumno/cancel-session-button'

type MyClassRow = {
  id: string
  class_id: string
  classes: {
    day_of_week: number
    start_time: string
    class_types: { name: string } | null
  } | null
}

export async function WeeklySessions({ studentId }: { studentId: string }) {
  const supabase = await createClient()
  const monday = getMonday(new Date())

  const [{ data }, { data: cancellations }, { data: credits }] = await Promise.all([
    supabase
      .from('enrollments')
      .select('id, class_id, classes(day_of_week, start_time, class_types(name))')
      .eq('student_id', studentId)
      .eq('status', 'active'),
    supabase
      .from('session_cancellations')
      .select('enrollment_id, session_date')
      .eq('student_id', studentId)
      .gte('session_date', toISODate(monday)),
    supabase
      .from('recovery_credits')
      .select('id, week_end, class_types(name)')
      .eq('student_id', studentId)
      .eq('status', 'available'),
  ])

  const enrollments = (data ?? []) as unknown as MyClassRow[]
  const cancelledKeys = new Set((cancellations ?? []).map((c) => `${c.enrollment_id}_${c.session_date}`))

  const thisWeek = DAY_ORDER.flatMap((day) =>
    enrollments
      .filter((e) => e.classes?.day_of_week === day)
      .map((e) => {
        const sessionDate = toISODate(dateForDayOfWeek(monday, day))
        return { ...e, day, sessionDate }
      })
  ).filter((e) => !isInPast(e.sessionDate, e.classes?.start_time ?? '23:59:00'))

  return (
    <div className="rounded-2xl border border-sand bg-white p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Esta semana</p>
      <p className="mt-1 font-display text-lg italic text-ink">Cancelar en nombre del alumno</p>

      <div className="mt-3 space-y-2">
        {thisWeek.map((e) => {
          const key = `${e.id}_${e.sessionDate}`
          const alreadyCancelled = cancelledKeys.has(key)
          return (
            <div key={e.id} className="flex items-center justify-between rounded-lg bg-linen/40 px-3 py-2">
              <span className="text-sm text-ink">
                {DAY_NAMES[e.day]} {formatTime(e.classes?.start_time ?? '')} —{' '}
                {e.classes?.class_types?.name}
              </span>
              {alreadyCancelled ? (
                <span className="text-xs text-ink/40">Cancelada</span>
              ) : (
                <CancelSessionButton
                  studentId={studentId}
                  enrollmentId={e.id}
                  classId={e.class_id}
                  sessionDate={e.sessionDate}
                />
              )}
            </div>
          )
        })}
        {thisWeek.length === 0 && (
          <p className="text-sm text-ink/40">No tiene clases pendientes esta semana.</p>
        )}
      </div>

      {credits && credits.length > 0 && (
        <div className="mt-4 border-t border-sand pt-4">
          <p className="text-xs uppercase tracking-wide text-clay">Créditos disponibles</p>
          <ul className="mt-2 space-y-1.5">
            {credits.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-ink/70">
                  {(c.class_types as unknown as { name: string } | null)?.name}
                </span>
                <Link
                  href={`/admin/alumnos/${studentId}/recuperar/${c.id}`}
                  className="text-xs font-medium text-clay hover:text-clay/70"
                >
                  Anotar recuperación
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
