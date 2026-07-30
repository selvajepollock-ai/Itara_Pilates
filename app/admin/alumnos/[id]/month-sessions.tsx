import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, formatTime } from '@/lib/day-names'
import { toISODate, isInPast } from '@/lib/sessions'
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

export async function MonthSessions({
  studentId,
  monthOffset = 0,
}: {
  studentId: string
  monthOffset?: number
}) {
  const supabase = await createClient()

  const today = new Date()
  const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)
  const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0)

  const prevOffset = monthOffset - 1
  const nextOffset = monthOffset + 1
  const monthLabel = targetMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  const [{ data }, { data: cancellations }, { data: confirmedThisMonth }] = await Promise.all([
    supabase
      .from('enrollments')
      .select('id, class_id, classes(day_of_week, start_time, class_types(name))')
      .eq('student_id', studentId)
      .eq('status', 'active'),
    supabase
      .from('session_cancellations')
      .select('enrollment_id, session_date')
      .eq('student_id', studentId)
      .gte('session_date', toISODate(monthStart))
      .lte('session_date', toISODate(monthEnd)),
    supabase
      .from('attendance')
      .select('id, session_date, classes(start_time, class_types(name))')
      .eq('student_id', studentId)
      .not('recovery_credit_id', 'is', null)
      .gte('session_date', toISODate(monthStart))
      .lte('session_date', toISODate(monthEnd))
      .order('session_date', { ascending: true }),
  ])

  const enrollments = (data ?? []) as unknown as MyClassRow[]
  const cancelledKeys = new Set((cancellations ?? []).map((c) => `${c.enrollment_id}_${c.session_date}`))

  // Generar cada fecha del mes que coincide con el día de semana de cada inscripción fija
  const occurrences: { enrollmentId: string; classId: string; sessionDate: string; classInfo: MyClassRow['classes'] }[] = []
  for (const e of enrollments) {
    if (!e.classes) continue
    const dow = e.classes.day_of_week
    const cursor = new Date(monthStart)
    while (cursor <= monthEnd) {
      if (cursor.getDay() === dow) {
        occurrences.push({
          enrollmentId: e.id,
          classId: e.class_id,
          sessionDate: toISODate(cursor),
          classInfo: e.classes,
        })
      }
      cursor.setDate(cursor.getDate() + 1)
    }
  }
  occurrences.sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))
  const futureOccurrences = occurrences.filter(
    (o) => monthOffset > 0 || !isInPast(o.sessionDate, o.classInfo?.start_time ?? '23:59:00')
  )

  return (
    <div className="rounded-2xl border border-sand bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase capitalize tracking-[0.25em] text-moss">{monthLabel}</p>
          <p className="mt-1 font-display text-lg italic text-ink">Calendario del alumno</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href={`?month=${prevOffset}`}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-sand text-ink/50 hover:border-moss hover:text-moss"
          >
            <ChevronLeft size={14} />
          </Link>
          <Link
            href={`?month=${nextOffset}`}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-sand text-ink/50 hover:border-moss hover:text-moss"
          >
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {futureOccurrences.map((o) => {
          const key = `${o.enrollmentId}_${o.sessionDate}`
          const alreadyCancelled = cancelledKeys.has(key)
          const dateObj = new Date(`${o.sessionDate}T00:00:00`)
          return (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg bg-linen/40 px-3 py-2"
            >
              <span className="text-sm text-ink">
                {DAY_NAMES[dateObj.getDay()]} {dateObj.getDate()} —{' '}
                {formatTime(o.classInfo?.start_time ?? '')} · {o.classInfo?.class_types?.name}
              </span>
              {alreadyCancelled ? (
                <span className="text-xs text-ink/40">Cancelada</span>
              ) : (
                <CancelSessionButton
                  studentId={studentId}
                  enrollmentId={o.enrollmentId}
                  classId={o.classId}
                  sessionDate={o.sessionDate}
                  label="Cancelar"
                />
              )}
            </div>
          )
        })}
        {futureOccurrences.length === 0 && (
          <p className="text-sm text-ink/40">Sin clases fijas este mes (o ya pasaron todas).</p>
        )}
      </div>

      {confirmedThisMonth && confirmedThisMonth.length > 0 && (
        <div className="mt-4 border-t border-sand pt-4">
          <p className="text-xs uppercase tracking-wide text-moss">Recuperaciones confirmadas este mes</p>
          <ul className="mt-2 space-y-1.5">
            {confirmedThisMonth.map((a) => {
              const cls = a.classes as unknown as {
                start_time: string
                class_types: { name: string } | null
              } | null
              return (
                <li key={a.id} className="flex items-center justify-between rounded-lg bg-moss/5 px-3 py-2 text-sm">
                  <span className="text-ink">
                    {cls?.class_types?.name} —{' '}
                    {new Date(`${a.session_date}T00:00:00`).toLocaleDateString('es-AR', {
                      weekday: 'short',
                      day: 'numeric',
                    })}
                    , {formatTime(cls?.start_time ?? '')}
                  </span>
                  <span className="text-xs text-moss">✓</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
