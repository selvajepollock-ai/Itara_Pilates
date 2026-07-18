import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, DAY_ORDER, formatTime } from '@/lib/day-names'
import { getPaymentStatus, STATUS_LABEL, STATUS_CLASSES } from '@/lib/billing'
import { getMonday, dateForDayOfWeek, toISODate, isInPast } from '@/lib/sessions'
import { CancelSessionButton } from './cancel-session-button'

type MyClassRow = {
  id: string
  class_id: string
  classes: {
    room: string
    day_of_week: number
    start_time: string
    end_time: string
    class_types: { name: string } | null
    profiles: { full_name: string } | null
  } | null
}

export default async function AlumnoDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const studentId = user?.id ?? ''
  const monday = getMonday(new Date())

  const [{ data }, { data: subscription }, { data: settings }, { data: cancellations }, { data: credits }] =
    await Promise.all([
      supabase
        .from('enrollments')
        .select(
          'id, class_id, classes(room, day_of_week, start_time, end_time, class_types(name), profiles(full_name))'
        )
        .eq('student_id', studentId)
        .eq('status', 'active'),
      supabase
        .from('subscriptions')
        .select('end_date, plans(name)')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .maybeSingle(),
      supabase.from('studio_settings').select('payment_reminder_days_before').single(),
      supabase
        .from('session_cancellations')
        .select('enrollment_id, session_date')
        .eq('student_id', studentId)
        .gte('session_date', toISODate(monday)),
      supabase
        .from('recovery_credits')
        .select('id, class_type_id, week_end, class_types(name)')
        .eq('student_id', studentId)
        .eq('status', 'available'),
    ])

  const status = getPaymentStatus(
    subscription?.end_date ?? null,
    settings?.payment_reminder_days_before ?? 3
  )
  const planInfo = subscription?.plans as unknown as { name: string } | null

  const enrollments = (data ?? []) as unknown as MyClassRow[]
  const cancelledKeys = new Set(
    (cancellations ?? []).map((c) => `${c.enrollment_id}_${c.session_date}`)
  )

  const byDay = new Map<number, MyClassRow[]>()
  for (const day of DAY_ORDER) byDay.set(day, [])
  for (const e of enrollments) {
    if (!e.classes) continue
    byDay.get(e.classes.day_of_week)?.push(e)
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => (a.classes?.start_time ?? '').localeCompare(b.classes?.start_time ?? ''))
  }

  const activeDays = DAY_ORDER.filter((day) => (byDay.get(day)?.length ?? 0) > 0)

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Mi semana</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink sm:text-4xl">Tu horario</h1>

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-sand bg-white px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/40">Tu cuota</p>
          <p className="mt-0.5 font-display italic text-ink">
            {planInfo?.name ?? 'Sin plan asignado'}
          </p>
          {subscription?.end_date && (
            <p className="text-xs text-ink/40">
              Pagado hasta{' '}
              {new Date(`${subscription.end_date}T00:00:00`).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'long',
              })}
            </p>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {credits && credits.length > 0 && (
        <div className="mt-4 rounded-2xl border border-clay/30 bg-clay/5 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-clay">Créditos para recuperar</p>
          <ul className="mt-2 space-y-2">
            {credits.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-ink">
                  {(c.class_types as unknown as { name: string } | null)?.name} — vence{' '}
                  {new Date(`${c.week_end}T00:00:00`).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <Link
                  href={`/alumno/recuperar/${c.id}`}
                  className="rounded-full bg-clay px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                >
                  Elegir clase
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeDays.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-sand bg-white/50 px-6 py-14 text-center">
          <p className="font-display text-xl italic text-ink">Todavía no tenés clases asignadas</p>
          <p className="mt-2 text-sm text-ink/60">
            Hablá con el estudio para que te anoten a tu horario fijo.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {activeDays.map((day) => (
            <section key={day} className="lg:min-w-0">
              <h2 className="text-sm font-medium uppercase tracking-wide text-ink/50">
                {DAY_NAMES[day]}
              </h2>
              <div className="mt-2 space-y-3">
                {byDay.get(day)?.map((e) => {
                  const sessionDate = toISODate(dateForDayOfWeek(monday, day))
                  const key = `${e.id}_${sessionDate}`
                  const alreadyCancelled = cancelledKeys.has(key)
                  const past = isInPast(sessionDate, e.classes?.start_time ?? '23:59:00')

                  return (
                    <div
                      key={e.id}
                      className="rounded-2xl border border-sand bg-white px-4 py-4 shadow-[0_2px_12px_rgba(46,43,38,0.04)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display text-lg italic leading-tight text-ink">
                          {e.classes?.class_types?.name}
                        </p>
                        <span className="whitespace-nowrap rounded-full bg-blush px-2.5 py-1 text-xs tabular-nums text-ink">
                          {formatTime(e.classes?.start_time ?? '')}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-ink/50">
                        {e.classes?.room} · {e.classes?.profiles?.full_name ?? 'Sin instructor'}
                      </p>

                      {!past && (
                        <div className="mt-2.5 border-t border-sand pt-2.5">
                          {alreadyCancelled ? (
                            <p className="text-xs text-ink/40">Ya avisaste que no vas</p>
                          ) : (
                            <CancelSessionButton
                              studentId={studentId}
                              enrollmentId={e.id}
                              classId={e.class_id}
                              sessionDate={sessionDate}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
