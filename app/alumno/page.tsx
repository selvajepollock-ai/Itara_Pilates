import Link from 'next/link'
import { CalendarX, RefreshCw, Flower2, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, DAY_ORDER, formatTime } from '@/lib/day-names'
import { getPaymentStatus, STATUS_LABEL, STATUS_CLASSES } from '@/lib/billing'
import { getMonday, dateForDayOfWeek, toISODate, isInPast } from '@/lib/sessions'
import { getDailyQuote } from '@/lib/quotes'
import { ReprogramarButton } from './reprogramar-button'
import { RequestPlanChangeForm } from './request-plan-change-form'

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
  const thisMonday = getMonday(new Date())
  const nextMonday = new Date(thisMonday)
  nextMonday.setDate(nextMonday.getDate() + 7)
  const nextSunday = new Date(nextMonday)
  nextSunday.setDate(nextSunday.getDate() + 6)
  const todayISO = toISODate(new Date())

  const [
    { data },
    { data: profile },
    { data: subscription },
    { data: settings },
    { data: cancellations },
    { data: credits },
    { data: recentCancellations },
    { data: recentRecoveries },
    { data: activePlans },
    { data: upcomingRecoveries },
  ] = await Promise.all([
    supabase
      .from('enrollments')
      .select(
        'id, class_id, classes(room, day_of_week, start_time, end_time, class_types(name), profiles(full_name))'
      )
      .eq('student_id', studentId)
      .eq('status', 'active'),
    supabase.from('profiles').select('full_name').eq('id', studentId).single(),
    supabase
      .from('subscriptions')
      .select('end_date, plans(name)')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase.from('studio_settings').select('payment_reminder_days_before, cancellation_min_hours').single(),
    supabase
      .from('session_cancellations')
      .select('enrollment_id, session_date')
      .eq('student_id', studentId)
      .gte('session_date', toISODate(thisMonday))
      .lte('session_date', toISODate(nextSunday)),
    supabase
      .from('recovery_credits')
      .select('id, class_type_id, week_end, class_types(name)')
      .eq('student_id', studentId)
      .eq('status', 'available'),
    supabase
      .from('session_cancellations')
      .select('id, session_date, within_deadline, classes(class_types(name))')
      .eq('student_id', studentId)
      .order('cancelled_at', { ascending: false })
      .limit(3),
    supabase
      .from('attendance')
      .select('id, session_date, classes(class_types(name))')
      .eq('student_id', studentId)
      .not('recovery_credit_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('plans').select('id, name, price').eq('active', true).order('price'),
    supabase
      .from('attendance')
      .select('id, class_id, session_date, classes(room, start_time, class_types(name), profiles(full_name))')
      .eq('student_id', studentId)
      .not('recovery_credit_id', 'is', null)
      .gte('session_date', todayISO)
      .order('session_date', { ascending: true }),
  ])

  const firstName = profile?.full_name?.split(' ')[0]
  const quote = getDailyQuote()
  const minHours = settings?.cancellation_min_hours ?? 12

  const status = getPaymentStatus(
    subscription?.end_date ?? null,
    settings?.payment_reminder_days_before ?? 3
  )
  const planInfo = subscription?.plans as unknown as { name: string } | null

  const enrollments = (data ?? []) as unknown as MyClassRow[]
  const cancelledKeys = new Set(
    (cancellations ?? []).map((c) => `${c.enrollment_id}_${c.session_date}`)
  )

  function buildWeek(monday: Date) {
    const byDay = new Map<number, MyClassRow[]>()
    for (const day of DAY_ORDER) byDay.set(day, [])
    for (const e of enrollments) {
      if (!e.classes) continue
      byDay.get(e.classes.day_of_week)?.push(e)
    }
    for (const list of byDay.values()) {
      list.sort((a, b) => (a.classes?.start_time ?? '').localeCompare(b.classes?.start_time ?? ''))
    }
    const days = DAY_ORDER.filter((day) => (byDay.get(day)?.length ?? 0) > 0)
    return { monday, byDay, days }
  }

  const weeks = [buildWeek(thisMonday), buildWeek(nextMonday)]

  type ActivityItem =
    | { kind: 'cancel'; at: string; typeName?: string; withinDeadline: boolean }
    | { kind: 'recover'; at: string; typeName?: string }

  const activity: ActivityItem[] = [
    ...(recentCancellations ?? []).map((c): ActivityItem => ({
      kind: 'cancel',
      at: c.session_date,
      typeName: (c.classes as unknown as { class_types: { name: string } | null } | null)?.class_types
        ?.name,
      withinDeadline: c.within_deadline,
    })),
    ...(recentRecoveries ?? []).map((r): ActivityItem => ({
      kind: 'recover',
      at: r.session_date,
      typeName: (r.classes as unknown as { class_types: { name: string } | null } | null)?.class_types
        ?.name,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 4)

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Mi semana</p>
      <div className="mt-2 flex items-center gap-2">
        <Flower2 size={22} strokeWidth={1.5} className="text-moss" />
        <h1 className="font-display text-3xl italic text-ink sm:text-4xl">
          {firstName ? `Hola, ${firstName}` : 'Tu horario'}
        </h1>
      </div>
      <p className="mt-1.5 text-sm italic text-ink/50">{quote}</p>

      <div className="mt-6 rounded-2xl border border-sand bg-white px-5 py-4">
        <div className="flex items-center justify-between">
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
        <div className="mt-3 border-t border-sand pt-3">
          <RequestPlanChangeForm plans={activePlans ?? []} />
        </div>
      </div>

      <Link
        href="/alumno/calendario"
        className="mt-4 flex items-center justify-between rounded-2xl border border-sand bg-white px-5 py-4 transition hover:border-moss"
      >
        <div className="flex items-center gap-2.5">
          <CalendarDays size={18} className="text-moss" />
          <span className="text-sm font-medium text-ink">Ver calendario completo del estudio</span>
        </div>
        <span className="text-xs text-ink/40">Todas las semanas →</span>
      </Link>

      {upcomingRecoveries && upcomingRecoveries.length > 0 && (
        <div className="mt-4 rounded-2xl border border-moss/30 bg-moss/5 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-moss">
            ✓ Recuperación confirmada, en vez de la clase que cancelaste
          </p>
          <ul className="mt-2 space-y-2">
            {upcomingRecoveries.map((r) => {
              const cls = r.classes as unknown as {
                room: string
                start_time: string
                class_types: { name: string } | null
                profiles: { full_name: string } | null
              } | null
              return (
                <li key={r.id} className="text-sm text-ink">
                  <span className="font-medium">{cls?.class_types?.name}</span> —{' '}
                  {new Date(`${r.session_date}T00:00:00`).toLocaleDateString('es-AR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                  })}
                  , {formatTime(cls?.start_time ?? '')} · {cls?.room}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {credits && credits.length > 0 && (
        <div className="mt-4 rounded-2xl border border-clay/30 bg-clay/5 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-clay">
            Clases pendientes de recuperar ({credits.length})
          </p>
          <ul className="mt-2 space-y-2">
            {credits.map((c, i) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-ink">
                  {(c.class_types as unknown as { name: string } | null)?.name}
                  {credits.length > 1 ? ` #${i + 1}` : ''} — hasta el{' '}
                  {new Date(`${c.week_end}T00:00:00`).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <Link
                  href={`/alumno/recuperar/${c.id}`}
                  className="whitespace-nowrap rounded-full bg-clay px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                >
                  Elegir clase
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="mt-8">
          <p className="text-sm font-medium uppercase tracking-wide text-ink/50">
            {weekIndex === 0 ? 'Esta semana' : 'Semana que viene'}
          </p>

          {week.days.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-sand bg-white/50 px-6 py-10 text-center">
              <p className="text-sm text-ink/50">Sin clases asignadas.</p>
            </div>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {week.days.map((day) => {
                const dayDate = dateForDayOfWeek(week.monday, day)
                return (
                  <section key={day} className="lg:min-w-0">
                    <h2 className="text-sm font-medium uppercase tracking-wide text-ink/50">
                      {DAY_NAMES[day]} <span className="text-ink/30">{dayDate.getDate()}</span>
                    </h2>
                    <div className="mt-2 space-y-3">
                      {week.byDay.get(day)?.map((e) => {
                        const sessionDate = toISODate(dateForDayOfWeek(week.monday, day))
                        const key = `${e.id}_${sessionDate}`
                        const alreadyCancelled = cancelledKeys.has(key)
                        const past = isInPast(sessionDate, e.classes?.start_time ?? '23:59:00')
                        const isToday = sessionDate === todayISO

                        return (
                          <div
                            key={e.id}
                            className={`rounded-2xl border bg-white px-4 py-4 shadow-[0_2px_12px_rgba(46,43,38,0.04)] ${
                              past ? 'border-sand/60 opacity-60' : 'border-sand'
                            }`}
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

                            <div className="mt-2.5 border-t border-sand pt-2.5">
                              {past ? (
                                <p className="text-xs text-ink/35">
                                  {alreadyCancelled ? 'No fuiste (avisada)' : 'Ya pasó'}
                                </p>
                              ) : alreadyCancelled ? (
                                <p className="text-xs text-ink/40">Ya avisaste que no vas</p>
                              ) : (
                                <div className="flex items-center justify-between">
                                  {isToday && (
                                    <span className="text-xs font-medium text-moss">Hoy</span>
                                  )}
                                  <ReprogramarButton
                                    studentId={studentId}
                                    enrollmentId={e.id}
                                    classId={e.class_id}
                                    sessionDate={sessionDate}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      ))}

      <p className="mt-4 text-center text-xs text-ink/30">
        Podés reprogramar hasta {minHours} hs antes de tu clase.
      </p>

      {activity.length > 0 && (
        <div className="mt-8">
          <p className="text-sm font-medium uppercase tracking-wide text-ink/50">
            Actividad reciente
          </p>
          <ul className="mt-3 divide-y divide-sand/60 rounded-2xl border border-sand bg-white">
            {activity.map((item, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-3.5">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    item.kind === 'cancel' ? 'bg-clay/10 text-clay' : 'bg-moss/10 text-moss'
                  }`}
                >
                  {item.kind === 'cancel' ? <CalendarX size={13} /> : <RefreshCw size={13} />}
                </div>
                <p className="text-sm text-ink/70">
                  {item.kind === 'cancel'
                    ? `Avisaste que no ibas a ${item.typeName ?? 'una clase'}`
                    : `Te anotaste a recuperar ${item.typeName ?? 'una clase'}`}{' '}
                  <span className="text-ink/40">
                    ·{' '}
                    {new Date(`${item.at}T00:00:00`).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
