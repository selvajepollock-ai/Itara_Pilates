import Link from 'next/link'
import { AlertTriangle, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatTime } from '@/lib/day-names'
import { subscriptionStatus, surchargeWaiver } from '@/lib/billing'
import { hoursUntil, isInPast } from '@/lib/sessions'
import { getDailyQuote } from '@/lib/quotes'
import { AnnouncementsBanner } from '@/app/components/announcements-banner'
import { addDaysISO, mondayOf, todayART } from '../admin/horarios/slots'
import { shortDate } from '../admin/alumnos/format'
import { ActivityList } from './activity-list'
import { ClassesSection } from './classes-section'
import { cap, dayDate, dayDateCap, dayName, deadlineText, dowOf, formatHours, monthName, rangeText, whenLabel } from './format'
import { Greeting } from './greeting'
import { InstallCard } from './install-card'
import { PushToggle } from '@/app/components/push-toggle'
import { NextClassCard } from './next-class-card'
import { PlanCard } from './plan-card'
import { RecoveriesSection } from './recoveries-section'
import { StreakCard } from './streak-card'
import type { ActivityItem, ClassRowData, ClassState, ClassWeek, NextClassData, RecoveryCardData } from './types'

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

type RecoveryAttendance = {
  id: string
  class_id: string
  session_date: string
  recovery_credit_id: string | null
  classes: {
    room: string
    day_of_week: number
    start_time: string
    class_types: { name: string } | null
    profiles: { full_name: string } | null
  } | null
}

type Credit = {
  id: string
  status: string
  week_end: string
  is_paid_extra?: boolean | null
  requested_session_date: string | null
  requested: { start_time: string; day_of_week: number } | null
}

const dateForDow = (monday: string, dow: number) => addDaysISO(monday, dow === 0 ? 6 : dow - 1)

export default async function AlumnoDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const studentId = user?.id ?? ''
  const today = todayART()
  const thisMonday = mondayOf(today)
  const nextMonday = addDaysISO(thisMonday, 7)
  const nextSunday = addDaysISO(nextMonday, 6)
  const since = addDaysISO(thisMonday, -14)

  const [
    { data: enrollmentsData },
    { data: profile },
    { data: subscription },
    { data: settings },
    { data: cancellationsData },
    { data: creditsData },
    { data: activePlans },
    { data: recoveriesData },
    { data: studioCancellations },
    { data: holidaysData },
  ] = await Promise.all([
    supabase
      .from('enrollments')
      .select('id, class_id, classes(room, day_of_week, start_time, end_time, class_types(name), profiles(full_name))')
      .eq('student_id', studentId)
      .eq('status', 'active'),
    supabase.from('profiles').select('full_name').eq('id', studentId).single(),
    supabase
      .from('subscriptions')
      .select('*, plans(name)')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase.from('studio_settings').select('payment_reminder_days_before, cancellation_min_hours, payment_due_day').single(),
    supabase
      .from('session_cancellations')
      .select('id, enrollment_id, session_date, within_deadline, recovery_credit_id')
      .eq('student_id', studentId)
      .gte('session_date', since)
      .lte('session_date', nextSunday),
    supabase
      .from('recovery_credits')
      .select('id, status, week_end, requested_session_date, is_paid_extra, requested:requested_class_id(start_time, day_of_week)')
      .eq('student_id', studentId)
      .gte('week_end', since),
    supabase.from('plans').select('id, name, price').eq('active', true).order('price'),
    supabase
      .from('attendance')
      .select('id, class_id, session_date, recovery_credit_id, classes(room, day_of_week, start_time, class_types(name), profiles(full_name))')
      .eq('student_id', studentId)
      .not('recovery_credit_id', 'is', null)
      .gte('session_date', since)
      .lte('session_date', nextSunday),
    supabase.from('class_cancellations').select('class_id, session_date, reason').gte('session_date', since).lte('session_date', nextSunday),
    supabase.from('holidays').select('date, label').gte('date', since).lte('date', nextSunday),
  ])
  const holidayByDate = new Map((holidaysData ?? []).map((h) => [h.date as string, (h.label as string | null) ?? null]))

  const firstName = profile?.full_name?.split(' ')[0] ?? null
  // El plazo sale de la configuración del estudio. El 12 es solo el valor de respaldo que usa también la acción de avisar.
  const minHours = settings?.cancellation_min_hours ?? 4
  const minHoursText = formatHours(minHours)
  const status = subscriptionStatus(
    subscription ?? null,
    settings?.payment_reminder_days_before ?? 3,
    settings?.payment_due_day ?? 10
  )
  const planInfo = subscription?.plans as unknown as { name: string } | null

  const enrollments = (enrollmentsData ?? []) as unknown as MyClassRow[]
  const cancellations = cancellationsData ?? []
  const credits = (creditsData ?? []) as unknown as Credit[]
  const recoveries = (recoveriesData ?? []) as unknown as RecoveryAttendance[]

  const creditById = new Map(credits.map((c) => [c.id, c]))
  const cancByKey = new Map(cancellations.map((c) => [`${c.enrollment_id}_${c.session_date}`, c]))
  const cancByCredit = new Map(cancellations.filter((c) => c.recovery_credit_id).map((c) => [c.recovery_credit_id as string, c]))
  const recoveryByCredit = new Map(recoveries.filter((r) => r.recovery_credit_id).map((r) => [r.recovery_credit_id as string, r]))
  const studioByKey = new Map((studioCancellations ?? []).map((c) => [`${c.class_id}_${c.session_date}`, c.reason as string | null]))

  const isExpired = (c: Credit) => c.status === 'available' && c.week_end < today
  const fridayOf = (weekEnd: string) => addDaysISO(weekEnd, -2)
  const creditUntilFor = (date: string) => dayDate(addDaysISO(mondayOf(date), 4))

  /** Nota y acciones según el estado del crédito de un aviso (o de una clase cancelada por el estudio). */
  function creditState(creditId: string | null | undefined): { state: ClassState; note: string; chooseCreditId?: string } {
    const credit = creditId ? creditById.get(creditId) : undefined
    if (!credit) return { state: 'tarde', note: '' }
    if (credit.status === 'requested') {
      const r = credit.requested
      return {
        state: 'avisaste-pedido',
        note:
          r && credit.requested_session_date
            ? `Pediste recuperar el ${dayDate(credit.requested_session_date)} a las ${formatTime(r.start_time)}`
            : 'Pediste una recuperación',
      }
    }
    if (credit.status === 'used') {
      const att = recoveryByCredit.get(credit.id)
      return {
        state: 'avisaste-usada',
        note: att ? `Recuperaste el ${dayDate(att.session_date)} a las ${formatTime(att.classes?.start_time ?? '')}` : 'Ya usaste esta recuperación',
      }
    }
    if (isExpired(credit)) return { state: 'avisaste-vencida', note: 'La recuperación venció' }
    return {
      state: 'avisaste-credito',
      note: `Tenés recuperación hasta el ${dayDate(fridayOf(credit.week_end))}`,
      chooseCreditId: credit.id,
    }
  }

  // ── Tus clases ────────────────────────────────────────────────────────────────────────────
  const buildWeek = (monday: string, title: string): ClassWeek => {
    const rows: ClassRowData[] = []

    for (const e of enrollments) {
      const c = e.classes
      if (!c) continue
      const date = dateForDow(monday, c.day_of_week)
      const start = formatTime(c.start_time)
      const past = isInPast(date, c.start_time)
      const canc = cancByKey.get(`${e.id}_${date}`)
      const studioReason = studioByKey.get(`${e.class_id}_${date}`)
      const studioCancelled = studioByKey.has(`${e.class_id}_${date}`)
      const base = {
        key: `${e.id}_${date}`,
        date,
        dow: c.day_of_week,
        isToday: date === today,
        past,
        start,
        typeName: c.class_types?.name ?? 'Clase',
        instructor: c.profiles?.full_name ?? null,
      }

      // Feriado: no hay clase y no genera recuperación.
      if (holidayByDate.has(date)) {
        const label = holidayByDate.get(date)
        rows.push({ ...base, state: 'studio', note: label ? `Feriado: ${label}` : 'Feriado, sin clase' })
        continue
      }

      if (studioCancelled) {
        const cs = canc ? creditState(canc.recovery_credit_id) : null
        const detail = studioReason ? `${studioReason} · ` : ''
        rows.push({
          ...base,
          state: 'studio',
          note:
            cs && cs.state !== 'tarde' && cs.state !== 'avisaste-vencida' && cs.state !== 'avisaste-credito'
              ? `${detail}${cs.note}`
              : cs?.chooseCreditId
                ? `${detail}tenés recuperación disponible`
                : studioReason ?? 'Sin clase ese día',
          chooseCreditId: cs?.chooseCreditId,
        })
        continue
      }

      if (canc) {
        if (!canc.within_deadline) {
          rows.push({ ...base, state: 'tarde', note: `Sin recuperación: avisaste con menos de ${minHoursText}` })
          continue
        }
        const cs = creditState(canc.recovery_credit_id)
        rows.push({
          ...base,
          state: cs.state === 'tarde' ? 'avisaste-vencida' : cs.state,
          note: cs.note || 'Avisaste que no ibas',
          chooseCreditId: cs.chooseCreditId,
          undo:
            cs.state === 'avisaste-credito' && !past
              ? { enrollmentId: e.id, classId: e.class_id, sessionDate: date }
              : undefined,
        })
        continue
      }

      if (past) {
        rows.push({ ...base, state: 'past', note: 'Ya pasó' })
        continue
      }

      // Mismo criterio que usa la acción de avisar para decidir si está a tiempo.
      const onTime = hoursUntil(date, c.start_time) >= minHours
      rows.push({
        ...base,
        state: onTime ? 'future' : 'late-window',
        note: onTime ? `Podés avisar hasta ${deadlineText(start, minHours)}` : 'Ya no se puede avisar con recuperación',
        avoid: {
          enrollmentId: e.id,
          classId: e.class_id,
          sessionDate: date,
          typeName: c.class_types?.name ?? 'Clase',
          whenLabel: whenLabel(date, today),
          start,
          onTime,
          creditUntil: creditUntilFor(date),
        },
      })
    }

    // Recuperaciones aprobadas de esta semana.
    for (const r of recoveries) {
      if (r.session_date < monday || r.session_date > addDaysISO(monday, 6) || !r.classes) continue
      const origin = r.recovery_credit_id ? cancByCredit.get(r.recovery_credit_id) : undefined
      // Una clase suelta comprada se guarda como una reserva: no es una recuperación y no se puede cancelar desde acá.
      const isDropIn = Boolean(r.recovery_credit_id && creditById.get(r.recovery_credit_id)?.is_paid_extra)
      const start = formatTime(r.classes.start_time)
      const past = isInPast(r.session_date, r.classes.start_time)
      rows.push({
        key: `rec_${r.id}`,
        date: r.session_date,
        dow: dowOf(r.session_date),
        isToday: r.session_date === today,
        past,
        start,
        typeName: r.classes.class_types?.name ?? 'Clase',
        instructor: r.classes.profiles?.full_name ?? null,
        state: isDropIn ? 'suelta' : 'recovery',
        note: isDropIn ? 'Clase suelta' : origin ? `Por tu clase del ${dayDate(origin.session_date)}` : 'Recuperación confirmada',
        recoveryCancel:
          !isDropIn && !past && r.recovery_credit_id
            ? {
                creditId: r.recovery_credit_id,
                onTime: hoursUntil(r.session_date, r.classes.start_time) >= minHours,
                whenLabel: whenLabel(r.session_date, today),
                start,
              }
            : undefined,
      })
    }

    rows.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    const hasWeekend = rows.some((r) => r.dow === 0 || r.dow === 6)
    return { title, range: rangeText(monday, addDaysISO(monday, hasWeekend ? 6 : 4)), rows }
  }

  const weeks = [buildWeek(thisMonday, 'Esta semana'), buildWeek(nextMonday, 'Semana que viene')]

  // ── Próxima clase confirmada ──────────────────────────────────────────────────────────────
  const upcoming = weeks
    .flatMap((w) => w.rows)
    .filter((r) => !r.past && (r.state === 'future' || r.state === 'late-window' || r.state === 'recovery' || r.state === 'suelta'))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))[0]
  const daysTo = (date: string) =>
    Math.round((new Date(`${date}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()) / 86_400_000)
  const nextClass: NextClassData | null = upcoming
    ? {
        dayLabel: dayDateCap(upcoming.date),
        start: upcoming.start,
        chip: daysTo(upcoming.date) === 0 ? 'Hoy' : daysTo(upcoming.date) === 1 ? 'Mañana' : `En ${daysTo(upcoming.date)} días`,
        typeName: upcoming.typeName,
        instructor: upcoming.instructor,
      }
    : null

  // ── Tus recuperaciones ────────────────────────────────────────────────────────────────────
  const originText = (creditId: string) => {
    const c = cancByCredit.get(creditId)
    if (!c) return 'Por una clase que no pudiste tomar'
    const enrollment = enrollments.find((e) => e.id === c.enrollment_id)
    const studio = enrollment ? studioByKey.has(`${enrollment.class_id}_${c.session_date}`) : false
    if (studio) return `Por la clase del ${dayDate(c.session_date)}, cancelada por el estudio`
    return c.session_date === today ? `Por tu clase de hoy, ${dayDate(c.session_date)}` : `Por tu clase del ${dayDate(c.session_date)}`
  }
  const recoveryCards: RecoveryCardData[] = credits
    .filter((c) => c.status === 'requested' || (c.status === 'available' && !isExpired(c)))
    .sort((a, b) => Number(b.status === 'requested') - Number(a.status === 'requested') || a.week_end.localeCompare(b.week_end))
    .map((c) => ({
      id: c.id,
      status: c.status === 'requested' ? ('requested' as const) : ('available' as const),
      title:
        c.status === 'requested' && c.requested && c.requested_session_date
          ? `${dayDateCap(c.requested_session_date)} · ${formatTime(c.requested.start_time)}`
          : 'Elegí una clase esta semana',
      origin: originText(c.id),
      until: dayDate(fridayOf(c.week_end)),
    }))

  // ── Actividad reciente ────────────────────────────────────────────────────────────────────
  // TODO: los rechazos no se registran (el crédito vuelve a "disponible" sin dejar rastro), así que no aparecen acá.
  const events: (ActivityItem & { sort: string })[] = [
    ...cancellations.map((c) => ({
      text: c.within_deadline ? `Avisaste que no ibas a la clase del ${dayDate(c.session_date)}` : `Avisaste tarde para la clase del ${dayDate(c.session_date)}`,
      tone: 'yellow' as const,
      date: shortDate(c.session_date) ?? '',
      sort: c.session_date,
    })),
    ...credits
      .filter((c) => c.status === 'requested' && c.requested_session_date)
      .map((c) => ({
        text: `Pediste recuperar el ${dayDate(c.requested_session_date!)}`,
        tone: 'yellow' as const,
        date: shortDate(c.requested_session_date!) ?? '',
        sort: c.requested_session_date!,
      })),
    ...recoveries
      .filter((r) => !(r.recovery_credit_id && creditById.get(r.recovery_credit_id)?.is_paid_extra))
      .map((r) => ({
      text: `Tu recuperación del ${dayDate(r.session_date)} quedó confirmada`,
      tone: 'green' as const,
      date: shortDate(r.session_date) ?? '',
      sort: r.session_date,
    })),
    ...credits
      .filter(isExpired)
      .map((c) => ({
        text: 'Venció una recuperación sin usar',
        tone: 'red' as const,
        date: shortDate(fridayOf(c.week_end)) ?? '',
        sort: fridayOf(c.week_end),
      })),
  ]
    .sort((a, b) => b.sort.localeCompare(a.sort))
    .slice(0, 4)

  const dateText = `${cap(dayName(dowOf(today)))} ${Number(today.slice(8, 10))} de ${monthName(today)}`
  const endDateText = subscription?.end_date
    ? new Date(`${subscription.end_date}T00:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
    : null

  return (
    <div className="space-y-6">
      <AnnouncementsBanner />
      <PushToggle hideWhenOn />

      {(status === 'vencido' || status === 'por_vencer') && (
        <div
          className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm ${
            status === 'vencido' ? 'border-clay/40 bg-clay/10 text-clay' : 'border-amber-300 bg-amber-50 text-amber-800'
          }`}
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            {status === 'vencido' ? (
              <>
                {surchargeWaiver(subscription as Parameters<typeof surchargeWaiver>[0]) ? (
                  <>
                    Tu cuota está <span className="font-medium">pendiente de pago</span>. Si ya la pagaste, avisale al estudio.
                  </>
                ) : (
                  <>
                    Tu cuota está <span className="font-medium">vencida</span> y tiene recargo. Si ya la pagaste, avisale al
                    estudio; si no, hacelo cuanto antes.
                  </>
                )}
              </>
            ) : (
              <>
                Tu cuota <span className="font-medium">vence pronto</span>. Recordá pagarla para no tener recargo.
              </>
            )}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:grid-rows-[auto_auto_1fr] lg:items-start">
        <div className="lg:col-start-1 lg:row-start-1">
          <Greeting dateText={dateText} firstName={firstName} quote={getDailyQuote(studentId)} />
        </div>
        <div className="lg:col-start-2 lg:row-start-1 lg:h-full">
          <NextClassCard data={nextClass} minHoursText={minHoursText} />
        </div>

        <div className="lg:col-start-2 lg:row-start-2 empty:hidden">
          <RecoveriesSection items={recoveryCards} />
        </div>

        <div className="lg:col-start-1 lg:row-span-2 lg:row-start-2">
          <ClassesSection weeks={weeks} studentId={studentId} minHoursText={minHoursText} />
        </div>

        <div className="space-y-6 lg:col-start-2 lg:row-start-3">
          <Link
            href="/alumno/calendario"
            className="flex min-h-[56px] items-center justify-between rounded-2xl border border-edge bg-white px-5 py-4 transition hover:border-moss"
          >
            <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
              <CalendarDays size={18} className="text-moss" />
              Ver calendario del estudio
            </span>
            <span className="text-muted" aria-hidden>
              →
            </span>
          </Link>
          <StreakCard />
          <PlanCard planName={planInfo?.name ?? null} endDateText={endDateText} status={status} plans={activePlans ?? []} />
        </div>
      </div>

      <ActivityList items={events} />
      <InstallCard />
    </div>
  )
}
