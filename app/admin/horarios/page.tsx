import Link from 'next/link'
import { List, ChevronLeft, ChevronRight, Plus, Settings2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DAY_ORDER, formatTime } from '@/lib/day-names'
import { WeekJumpInput } from './week-jump-input'
import { ActivateAllExtraCapacityButton } from './activate-all-extra-capacity-button'

type ClassRow = {
  id: string
  room: string
  day_of_week: number
  start_time: string
  end_time: string
  capacity: number
  pending_extra_capacity: number
  class_types: { id: string; name: string } | null
  profiles: { full_name: string } | null
}

const SLOT_MINUTES = 30
const START_HOUR = 7
const END_HOUR = 21
const TOTAL_SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES
const ROW_HEIGHT = 26

function timeToMinutes(time: string) {
  const [h, m] = time.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function minutesToSlot(minutes: number) {
  const clamped = Math.min(Math.max(minutes, START_HOUR * 60), END_HOUR * 60)
  return (clamped - START_HOUR * 60) / SLOT_MINUTES
}

function getMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default async function HorariosPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const { week } = await searchParams
  const supabase = await createClient()

  const today = new Date()
  const baseMonday = week ? getMonday(new Date(week)) : getMonday(today)

  const weekDates = DAY_ORDER.map((dow, i) => {
    const date = new Date(baseMonday)
    date.setDate(baseMonday.getDate() + i)
    return { dow, date }
  })

  const prevWeek = new Date(baseMonday)
  prevWeek.setDate(prevWeek.getDate() - 7)
  const nextWeek = new Date(baseMonday)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const weekStartISO = toISODate(weekDates[0].date)
  const weekEndISO = toISODate(weekDates[6].date)

  const [
    { data: classesData },
    { data: enrollmentsData },
    { data: holidaysData },
    { data: weekCancellations },
    { data: weekRecoveries },
  ] = await Promise.all([
    supabase
      .from('classes')
      .select(
        'id, room, day_of_week, start_time, end_time, capacity, pending_extra_capacity, class_types(id, name), profiles(full_name)'
      )
      .eq('active', true),
    supabase.from('enrollments').select('class_id').eq('status', 'active'),
    supabase
      .from('holidays')
      .select('date, label')
      .gte('date', toISODate(weekDates[0].date))
      .lte('date', toISODate(weekDates[6].date)),
    supabase
      .from('session_cancellations')
      .select('class_id, session_date')
      .gte('session_date', weekStartISO)
      .lte('session_date', weekEndISO),
    supabase
      .from('attendance')
      .select('class_id, session_date')
      .not('recovery_credit_id', 'is', null)
      .gte('session_date', weekStartISO)
      .lte('session_date', weekEndISO),
  ])

  // Lugares ocupados de esa semana puntual: fijos - los que cancelaron + los que recuperan.
  const adjustByClassDate = new Map<string, number>()
  for (const c of weekCancellations ?? []) {
    const k = `${c.class_id}|${c.session_date}`
    adjustByClassDate.set(k, (adjustByClassDate.get(k) ?? 0) - 1)
  }
  for (const r of weekRecoveries ?? []) {
    const k = `${r.class_id}|${r.session_date}`
    adjustByClassDate.set(k, (adjustByClassDate.get(k) ?? 0) + 1)
  }

  const holidayByDate = new Map((holidaysData ?? []).map((h) => [h.date, h.label]))

  const classes = (classesData ?? []) as unknown as ClassRow[]

  const enrollments = (enrollmentsData ?? []) as { class_id: string }[]
  const countByClass = new Map<string, number>()
  for (const e of enrollments) {
    countByClass.set(e.class_id, (countByClass.get(e.class_id) ?? 0) + 1)
  }

  const hourMarks = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)
  const todayISO = toISODate(today)
  const monthLabel = baseMonday.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  const pendingExtraCapacityCount = classes.filter((c) => c.pending_extra_capacity > 0).length

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Estudio</p>
          <h1 className="mt-2 font-display text-3xl italic capitalize text-ink">{monthLabel}</h1>
        </div>

        {pendingExtraCapacityCount > 0 && (
          <ActivateAllExtraCapacityButton pendingCount={pendingExtraCapacityCount} />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <WeekJumpInput defaultValue={toISODate(baseMonday)} />
          <Link href={`/admin/horarios?week=${toISODate(prevWeek)}`} className="icon-btn">
            <ChevronLeft size={16} />
          </Link>
          <Link href="/admin/horarios" className="btn-secondary">
            Hoy
          </Link>
          <Link href={`/admin/horarios?week=${toISODate(nextWeek)}`} className="icon-btn">
            <ChevronRight size={16} />
          </Link>

          <Link
            href="/instructor/pasar-lista"
            className="btn-secondary"
          >
            Pasar lista
          </Link>
          <Link
            href="/admin/horarios/feriados"
            className="btn-secondary"
          >
            Feriados
          </Link>
          <Link
            href="/admin/tipos-de-clase"
            className="btn-secondary"
          >
            <Settings2 size={15} strokeWidth={2} />
            Tipos
          </Link>
          <Link
            href="/admin/horarios/lista"
            className="btn-secondary"
          >
            <List size={15} strokeWidth={2} />
            Lista
          </Link>
          <Link
            href="/admin/horarios/nuevo"
            className="btn-primary"
          >
            <Plus size={16} strokeWidth={2.5} />
            Nueva clase
          </Link>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-sand bg-white p-4">
        <div
          className="grid"
          style={{
            minWidth: '900px',
            gridTemplateColumns: '56px repeat(7, 1fr)',
            gridTemplateRows: `56px repeat(${TOTAL_SLOTS}, ${ROW_HEIGHT}px)`,
          }}
        >
          <div />
          {weekDates.map(({ dow, date }, i) => {
            const iso = toISODate(date)
            const isToday = iso === todayISO
            const isClosed = dow === 0 || dow === 6 || holidayByDate.has(iso)
            return (
              <div
                key={dow}
                className={`flex flex-col items-center justify-center gap-0.5 border-b pb-2 ${
                  isToday ? 'border-moss' : 'border-sand'
                }`}
                style={{ gridColumn: i + 2, gridRow: 1 }}
              >
                <span className="text-[10px] uppercase tracking-wide text-ink/40">
                  {date.toLocaleDateString('es-AR', { weekday: 'short' })}
                </span>
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full font-display text-sm italic ${
                    isToday ? 'bg-moss text-white' : isClosed ? 'text-ink/30' : 'text-ink'
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>
            )
          })}

          {hourMarks.map((hour) => (
            <div
              key={`label-${hour}`}
              className="border-t border-sand/60 pr-2 text-right text-[11px] leading-none text-ink/30"
              style={{ gridColumn: 1, gridRow: minutesToSlot(hour * 60) + 2 }}
            >
              {hour}h
            </div>
          ))}
          {hourMarks.map((hour) =>
            weekDates.map(({ dow }, i) => (
              <div
                key={`line-${hour}-${dow}`}
                className="border-t border-sand/40"
                style={{ gridColumn: i + 2, gridRow: minutesToSlot(hour * 60) + 2 }}
              />
            ))
          )}

          {weekDates.map(({ dow, date }, i) => {
            const iso = toISODate(date)
            const holidayLabel = holidayByDate.get(iso)
            if (dow !== 0 && dow !== 6 && !holidayLabel) return null
            return (
              <div
                key={`closed-${dow}`}
                className="flex flex-col items-center justify-center gap-0.5 px-2 text-center text-xs text-ink/30"
                style={{ gridColumn: i + 2, gridRow: `2 / ${TOTAL_SLOTS + 2}` }}
              >
                <span>Cerrado</span>
                {holidayLabel && <span className="text-[10px] italic text-clay/70">{holidayLabel}</span>}
              </div>
            )
          })}

          {classes.map((c) => {
            const dayIndex = DAY_ORDER.indexOf(c.day_of_week)
            if (dayIndex === -1) return null
            const dateForThisClass = weekDates[dayIndex]?.date
            if (dateForThisClass && holidayByDate.has(toISODate(dateForThisClass))) return null
            const startSlot = minutesToSlot(timeToMinutes(c.start_time))
            const endSlot = minutesToSlot(timeToMinutes(c.end_time))
            const enrolled =
              (countByClass.get(c.id) ?? 0) +
              (adjustByClassDate.get(`${c.id}|${toISODate(weekDates[dayIndex].date)}`) ?? 0)
            const isFull = enrolled >= c.capacity
            const isEmpty = enrolled === 0
            const col = dayIndex + 2

            const reformerClasses = isFull
              ? 'border-clay/40 bg-clay text-white shadow-sm'
              : isEmpty
                ? 'border-moss/30 bg-moss/50 text-white shadow-sm'
                : 'border-moss/20 bg-moss text-white shadow-sm'

            return (
              <Link
                key={c.id}
                href={`/admin/horarios/${c.id}${week ? `?week=${week}` : ''}`}
                className={`relative m-0.5 overflow-hidden rounded-lg border px-1.5 py-1 text-[10px] leading-tight transition hover:-translate-y-px hover:shadow-md ${reformerClasses}`}
                style={{
                  gridColumn: col,
                  gridRow: `${startSlot + 2} / ${endSlot + 2}`,
                }}
              >
                <p className="truncate font-display italic text-white">{c.class_types?.name}</p>
                <p className="truncate text-white/80">{formatTime(c.start_time)}</p>
                <p className="truncate font-semibold text-white">
                  {isFull ? 'COMPLETO' : `${c.capacity - enrolled} libre${c.capacity - enrolled === 1 ? '' : 's'}`}
                </p>
              </Link>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 border-t border-sand pt-4 text-xs">
          <span className="flex items-center gap-1.5 text-ink/60">
            <span className="h-2.5 w-2.5 rounded bg-moss" />
            Con lugar
          </span>
          <span className="flex items-center gap-1.5 text-ink/60">
            <span className="h-2.5 w-2.5 rounded bg-clay" />
            Completo
          </span>
        </div>
      </div>
    </div>
  )
}
