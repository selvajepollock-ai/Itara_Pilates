import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

export async function WeeklySessions({
  studentId,
  weekOffset = 0,
}: {
  studentId: string
  weekOffset?: number
}) {
  const supabase = await createClient()
  const baseMonday = getMonday(new Date())
  const monday = new Date(baseMonday)
  monday.setDate(monday.getDate() + weekOffset * 7)

  const prevOffset = weekOffset - 1
  const nextOffset = weekOffset + 1

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
      .eq('status', 'available')
      .gte('week_end', toISODate(new Date())),
  ])

  const enrollments = (data ?? []) as unknown as MyClassRow[]
  const cancelledKeys = new Set((cancellations ?? []).map((c) => `${c.enrollment_id}_${c.session_date}`))

  const weekSessions = DAY_ORDER.flatMap((day) =>
    enrollments
      .filter((e) => e.classes?.day_of_week === day)
      .map((e) => {
        const sessionDate = toISODate(dateForDayOfWeek(monday, day))
        return { ...e, day, sessionDate }
      })
  ).filter((e) => weekOffset > 0 || !isInPast(e.sessionDate, e.classes?.start_time ?? '23:59:00'))

  const weekLabel = `${monday.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – ${new Date(
    monday.getTime() + 6 * 86400000
  ).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`

  return (
    <div className="rounded-2xl border border-sand bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-moss">
            {weekOffset === 0 ? 'Esta semana' : weekLabel}
          </p>
          <p className="mt-1 font-display text-lg italic text-ink">Cancelar / mover en nombre del alumno</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href={`?week=${prevOffset}`}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-sand text-ink/50 hover:border-moss hover:text-moss"
          >
            <ChevronLeft size={14} />
          </Link>
          <Link
            href={`?week=${nextOffset}`}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-sand text-ink/50 hover:border-moss hover:text-moss"
          >
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {weekSessions.map((e) => {
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
        {weekSessions.length === 0 && (
          <p className="text-sm text-ink/40">No tiene clases pendientes esa semana.</p>
        )}
      </div>

      {credits && credits.length > 0 && (
        <div className="mt-4 border-t border-sand pt-4">
          <p className="text-xs uppercase tracking-wide text-clay">Clases pendientes de recuperar</p>
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
                  Mover a otro horario
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
