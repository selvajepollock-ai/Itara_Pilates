import Link from 'next/link'
import { List, ChevronLeft, ChevronRight, Plus, Settings2, Dumbbell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DAY_ORDER, formatTime } from '@/lib/day-names'
import { WeekJumpInput } from './week-jump-input'

type ClassRow = {
  id: string
  room: string
  day_of_week: number
  start_time: string
  end_time: string
  capacity: number
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
  searchParams: Promise<{ week?: string; fuerza?: string }>
}) {
  const { week, fuerza: showFuerzaParam } = await searchParams
  const showFuerza = showFuerzaParam === '1'
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

  const [{ data: classesData }, { data: enrollmentsData }, { data: holidaysData }] = await Promise.all([
    supabase
      .from('classes')
      .select(
        'id, room, day_of_week, start_time, end_time, capacity, class_types(id, name), profiles(full_name)'
      )
      .eq('active', true),
    supabase.from('enrollments').select('class_id').eq('status', 'active'),
    supabase
      .from('holidays')
      .select('date, label')
      .gte('date', toISODate(weekDates[0].date))
      .lte('date', toISODate(weekDates[6].date)),
  ])

  const holidayByDate = new Map((holidaysData ?? []).map((h) => [h.date, h.label]))

  const allClasses = (classesData ?? []) as unknown as ClassRow[]
  const classes = showFuerza
    ? allClasses
    : allClasses.filter((c) => !c.class_types?.name?.toLowerCase().includes('fuerza'))

  const enrollments = (enrollmentsData ?? []) as { class_id: string }[]
  const countByClass = new Map<string, number>()
  for (const e of enrollments) {
    countByClass.set(e.class_id, (countByClass.get(e.class_id) ?? 0) + 1)
  }

  const hourMarks = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)
  const todayISO = toISODate(today)
  const monthLabel = baseMonday.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  const fuerzaCount = allClasses.filter((c) => c.class_types?.name?.toLowerCase().includes('fuerza')).length
  const cols = showFuerza ? 14 : 7

  const toggleFuerzaHref = `/admin/horarios?${new URLSearchParams({
    ...(week ? { week } : {}),
    fuerza: showFuerza ? '0' : '1',
  }).toString()}`

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-moss">Estudio</p>
          <h1 className="mt-2 font-display text-3xl italic capitalize text-ink">{monthLabel}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WeekJumpInput defaultValue={toISODate(baseMonday)} showFuerza={showFuerza} />
          <Link
            href={`/admin/horarios?week=${toISODate(prevWeek)}${showFuerza ? '&fuerza=1' : ''}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-sand text-ink/60 transition hover:border-moss hover:text-moss"
          >
            <ChevronLeft size={16} />
          </Link>
          <Link
            href={`/admin/horarios${showFuerza ? '?fuerza=1' : ''}`}
            className="rounded-full border border-sand px-4 py-2 text-sm font-medium text-ink/70 transition hover:border-moss hover:text-moss"
          >
            Hoy
          </Link>
          <Link
            href={`/admin/horarios?week=${toISODate(nextWeek)}${showFuerza ? '&fuerza=1' : ''}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-sand text-ink/60 transition hover:border-moss hover:text-moss"
          >
            <ChevronRight size={16} />
          </Link>

          <Link
            href={toggleFuerzaHref}
            className={`ml-1 flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
              showFuerza
                ? 'border-clay bg-clay/10 text-clay'
                : 'border-sand text-ink/60 hover:border-clay hover:text-clay'
            }`}
          >
            <Dumbbell size={14} strokeWidth={2} />
            {showFuerza ? 'Ocultar Fuerza' : `Fuerza (${fuerzaCount})`}
          </Link>

          <Link
            href="/admin/horarios/feriados"
            className="flex items-center gap-1.5 rounded-full border border-sand px-4 py-2 text-sm font-medium text-ink/70 transition hover:border-moss hover:text-moss"
          >
            Feriados
          </Link>
          <Link
            href="/admin/tipos-de-clase"
            className="flex items-center gap-1.5 rounded-full border border-sand px-4 py-2 text-sm font-medium text-ink/70 transition hover:border-moss hover:text-moss"
          >
            <Settings2 size={15} strokeWidth={2} />
            Tipos
          </Link>
          <Link
            href="/admin/horarios/lista"
            className="flex items-center gap-1.5 rounded-full border border-sand px-4 py-2 text-sm font-medium text-ink/70 transition hover:border-moss hover:text-moss"
          >
            <List size={15} strokeWidth={2} />
            Lista
          </Link>
          <Link
            href="/admin/horarios/nuevo"
            className="flex items-center gap-1.5 rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-white transition hover:bg-moss-dark"
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
            minWidth: showFuerza ? '1120px' : '900px',
            gridTemplateColumns: `56px repeat(${cols}, 1fr)`,
            gridTemplateRows: `56px repeat(${TOTAL_SLOTS}, ${ROW_HEIGHT}px)`,
          }}
        >
          <div />
          {weekDates.map(({ dow, date }, i) => {
            const iso = toISODate(date)
            const isToday = iso === todayISO
            const isClosed = dow === 0 || dow === 6 || holidayByDate.has(iso)
            const span = showFuerza ? 2 : 1
            return (
              <div
                key={dow}
                className={`flex flex-col items-center justify-center gap-0.5 border-b pb-2 ${
                  isToday ? 'border-moss' : 'border-sand'
                }`}
                style={{ gridColumn: `${i * span + 2} / span ${span}`, gridRow: 1 }}
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
            weekDates.map(({ dow }, i) => {
              const span = showFuerza ? 2 : 1
              return (
                <div
                  key={`line-${hour}-${dow}`}
                  className="border-t border-sand/40"
                  style={{ gridColumn: `${i * span + 2} / span ${span}`, gridRow: minutesToSlot(hour * 60) + 2 }}
                />
              )
            })
          )}

          {weekDates.map(({ dow, date }, i) => {
            const iso = toISODate(date)
            const holidayLabel = holidayByDate.get(iso)
            if (dow !== 0 && dow !== 6 && !holidayLabel) return null
            const span = showFuerza ? 2 : 1
            return (
              <div
                key={`closed-${dow}`}
                className="flex flex-col items-center justify-center gap-0.5 px-2 text-center text-xs text-ink/30"
                style={{ gridColumn: `${i * span + 2} / span ${span}`, gridRow: `2 / ${TOTAL_SLOTS + 2}` }}
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
            const enrolled = countByClass.get(c.id) ?? 0
            const isFull = enrolled >= c.capacity
            const isEmpty = enrolled === 0
            const isFuerza = c.class_types?.name?.toLowerCase().includes('fuerza')
            const span = showFuerza ? 2 : 1
            const col = showFuerza ? dayIndex * 2 + (isFuerza ? 3 : 2) : dayIndex + 2

            const fuerzaClasses = isFull
              ? 'border-clay bg-clay/10 text-clay'
              : 'border-dashed border-clay/40 bg-white text-clay/80'
            const reformerClasses = isFull
              ? 'border-clay/40 bg-clay text-white shadow-sm'
              : isEmpty
                ? 'border-moss/30 bg-moss/50 text-white shadow-sm'
                : 'border-moss/20 bg-moss text-white shadow-sm'

            return (
              <Link
                key={c.id}
                href={`/admin/horarios/${c.id}`}
                className={`relative m-0.5 overflow-hidden rounded-lg border px-1.5 py-1 text-[10px] leading-tight transition hover:-translate-y-px hover:shadow-md ${
                  isFuerza ? fuerzaClasses : reformerClasses
                }`}
                style={{
                  gridColumn: col,
                  gridRow: `${startSlot + 2} / ${endSlot + 2}`,
                }}
              >
                <p className={`truncate font-display italic ${isFuerza ? '' : 'text-white'}`}>
                  {c.class_types?.name}
                </p>
                <p className={`truncate ${isFuerza ? 'opacity-70' : 'text-white/80'}`}>
                  {formatTime(c.start_time)}
                </p>
                <p className={`truncate font-semibold ${isFuerza && !isFull ? '' : 'text-white'}`}>
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
          {showFuerza && (
            <span className="flex items-center gap-1.5 text-ink/60">
              <span className="h-2.5 w-2.5 rounded border border-dashed border-clay/50 bg-white" />
              Fuerza
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
