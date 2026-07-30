import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, formatTime } from '@/lib/day-names'
import { toISODate, isInPast } from '@/lib/sessions'
import { MonthCell } from './month-cell'

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

  const [{ data }, { data: cancellations }, { data: confirmedThisMonth }, { data: creditsToMove }] =
    await Promise.all([
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
        .lte('session_date', toISODate(monthEnd)),
      supabase
        .from('recovery_credits')
        .select('id, week_end, class_types(name)')
        .eq('student_id', studentId)
        .eq('status', 'available')
        .gte('week_end', toISODate(new Date())),
    ])

  const enrollments = (data ?? []) as unknown as MyClassRow[]
  const cancelledKeys = new Set((cancellations ?? []).map((c) => `${c.enrollment_id}_${c.session_date}`))

  // Mapa fecha -> info de la clase fija de ese día (si tiene)
  const byDate = new Map<
    string,
    { enrollmentId: string; classId: string; typeName: string; startTime: string; cancelled: boolean }
  >()
  for (const e of enrollments) {
    if (!e.classes) continue
    const dow = e.classes.day_of_week
    const cursor = new Date(monthStart)
    while (cursor <= monthEnd) {
      if (cursor.getDay() === dow) {
        const dateISO = toISODate(cursor)
        byDate.set(dateISO, {
          enrollmentId: e.id,
          classId: e.class_id,
          typeName: e.classes.class_types?.name ?? 'Clase',
          startTime: e.classes.start_time,
          cancelled: cancelledKeys.has(`${e.id}_${dateISO}`),
        })
      }
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  // Mapa fecha -> recuperación confirmada ese día (puede caer en un día sin clase fija)
  const recoveredByDate = new Map<string, { typeName: string; startTime: string }>()
  for (const a of confirmedThisMonth ?? []) {
    const cls = a.classes as unknown as { start_time: string; class_types: { name: string } | null } | null
    recoveredByDate.set(a.session_date, {
      typeName: cls?.class_types?.name ?? 'Clase',
      startTime: cls?.start_time ?? '',
    })
  }

  // Armar las filas (semanas) del mes, columnas Lunes a Viernes
  const firstWeekMonday = new Date(monthStart)
  const offsetToMonday = (firstWeekMonday.getDay() + 6) % 7
  firstWeekMonday.setDate(firstWeekMonday.getDate() - offsetToMonday)

  const weeks: Date[][] = []
  const cursor = new Date(firstWeekMonday)
  while (cursor <= monthEnd) {
    const week: Date[] = []
    for (let i = 0; i < 5; i++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    cursor.setDate(cursor.getDate() + 2) // saltar sáb/dom
    weeks.push(week)
  }

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

      <div className="mt-4 overflow-x-auto">
        <div className="grid min-w-[480px] grid-cols-5 gap-1.5">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map((d) => (
            <div key={d} className="pb-1 text-center text-[10px] font-medium uppercase tracking-wide text-ink/40">
              {d}
            </div>
          ))}

          {weeks.map((week, wi) =>
            week.map((date, di) => {
              const dateISO = toISODate(date)
              const inMonth = date.getMonth() === targetMonth.getMonth()
              const fixedClass = byDate.get(dateISO)
              const recovered = recoveredByDate.get(dateISO)
              const past = isInPast(dateISO, '23:59:00')

              return (
                <MonthCell
                  key={`${wi}-${di}`}
                  studentId={studentId}
                  date={date.getDate()}
                  dateISO={dateISO}
                  inMonth={inMonth}
                  past={past}
                  fixedClass={fixedClass}
                  recovered={recovered}
                  formatTime={formatTime}
                />
              )
            })
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 border-t border-sand pt-4 text-xs">
        <span className="flex items-center gap-1.5 text-ink/60">
          <span className="h-2.5 w-2.5 rounded bg-moss" />
          Clase fija
        </span>
        <span className="flex items-center gap-1.5 text-ink/60">
          <span className="h-2.5 w-2.5 rounded bg-sand" />
          Cancelada
        </span>
        <span className="flex items-center gap-1.5 text-ink/60">
          <span className="h-2.5 w-2.5 rounded border-2 border-moss bg-white" />
          Recuperación confirmada
        </span>
      </div>

      {creditsToMove && creditsToMove.length > 0 && (
        <div className="mt-4 border-t border-clay/30 bg-clay/5 -mx-6 -mb-6 px-6 py-4 rounded-b-2xl">
          <p className="text-xs uppercase tracking-wide text-clay">
            Pendientes de mover ({creditsToMove.length})
          </p>
          <ul className="mt-2 space-y-1.5">
            {creditsToMove.map((c) => (
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
