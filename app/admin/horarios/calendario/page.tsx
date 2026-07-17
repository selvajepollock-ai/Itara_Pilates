import Link from 'next/link'
import { List, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DAY_ORDER, formatTime } from '@/lib/day-names'

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

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const { week } = await searchParams
  const supabase = await createClient()

  const today = new Date()
  const baseMonday = week ? getMonday(new Date(week)) : getMonday(today)

  const weekDates = DAY_ORDER.map((dow, i) => {
    const offset = i // DAY_ORDER = [1,2,3,4,5,6,0] -> Mon..Sun, matches column order
    const date = new Date(baseMonday)
    date.setDate(baseMonday.getDate() + offset)
    return { dow, date }
  })

  const prevWeek = new Date(baseMonday)
  prevWeek.setDate(prevWeek.getDate() - 7)
  const nextWeek = new Date(baseMonday)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const [{ data: classesData }, { data: enrollmentsData }] = await Promise.all([
    supabase
      .from('classes')
      .select(
        'id, room, day_of_week, start_time, end_time, capacity, class_types(id, name), profiles(full_name)'
      )
      .eq('active', true),
    supabase.from('enrollments').select('class_id').eq('status', 'active'),
  ])

  const classes = (classesData ?? []) as unknown as ClassRow[]
  const enrollments = (enrollmentsData ?? []) as { class_id: string }[]

  const countByClass = new Map<string, number>()
  for (const e of enrollments) {
    countByClass.set(e.class_id, (countByClass.get(e.class_id) ?? 0) + 1)
  }

  const hourMarks = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)
  const todayISO = toISODate(today)

  const monthLabel = baseMonday.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-moss">Estudio</p>
          <h1 className="mt-2 font-display text-3xl italic capitalize text-ink">{monthLabel}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/horarios/calendario?week=${toISODate(prevWeek)}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-sand text-ink/60 transition hover:border-moss hover:text-moss"
          >
            <ChevronLeft size={16} />
          </Link>
          <Link
            href="/admin/horarios/calendario"
            className="rounded-full border border-sand px-4 py-2 text-sm font-medium text-ink/70 transition hover:border-moss hover:text-moss"
          >
            Hoy
          </Link>
          <Link
            href={`/admin/horarios/calendario?week=${toISODate(nextWeek)}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-sand text-ink/60 transition hover:border-moss hover:text-moss"
          >
            <ChevronRight size={16} />
          </Link>
          <Link
            href="/admin/horarios"
            className="ml-2 flex items-center gap-1.5 rounded-full border border-sand px-5 py-2.5 text-sm font-medium text-ink/70 transition hover:border-moss hover:text-moss"
          >
            <List size={15} strokeWidth={2} />
            Lista
          </Link>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-sand bg-white p-4">
        <div
          className="grid min-w-[980px]"
          style={{
            gridTemplateColumns: `56px repeat(7, 1fr)`,
            gridTemplateRows: `56px repeat(${TOTAL_SLOTS}, 20px)`,
          }}
        >
          {/* Header row: real dates */}
          <div />
          {weekDates.map(({ dow, date }, i) => {
            const iso = toISODate(date)
            const isToday = iso === todayISO
            const isWeekend = dow === 0 || dow === 6
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
                    isToday
                      ? 'bg-moss text-white'
                      : isWeekend
                        ? 'text-ink/30'
                        : 'text-ink'
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>
            )
          })}

          {/* Hour labels + gridlines */}
          {hourMarks.map((hour) => {
            const slot = minutesToSlot(hour * 60)
            return (
              <div
                key={`label-${hour}`}
                className="border-t border-sand/60 pr-2 text-right text-[11px] leading-none text-ink/30"
                style={{ gridColumn: 1, gridRow: slot + 2 }}
              >
                {hour}h
              </div>
            )
          })}
          {hourMarks.map((hour) =>
            weekDates.map(({ dow }, i) => (
              <div
                key={`line-${hour}-${dow}`}
                className="border-t border-sand/40"
                style={{ gridColumn: i + 2, gridRow: minutesToSlot(hour * 60) + 2 }}
              />
            ))
          )}

          {/* Weekend "closed" watermark */}
          {weekDates.map(({ dow }, i) => {
            if (dow !== 0 && dow !== 6) return null
            return (
              <div
                key={`closed-${dow}`}
                className="flex items-center justify-center text-xs text-ink/20"
                style={{ gridColumn: i + 2, gridRow: `2 / ${TOTAL_SLOTS + 2}` }}
              >
                Cerrado
              </div>
            )
          })}

          {/* Class blocks */}
          {classes.map((c) => {
            const colIndex = DAY_ORDER.indexOf(c.day_of_week)
            if (colIndex === -1) return null
            const startSlot = minutesToSlot(timeToMinutes(c.start_time))
            const endSlot = minutesToSlot(timeToMinutes(c.end_time))
            const enrolled = countByClass.get(c.id) ?? 0
            const isFull = enrolled >= c.capacity
            const isFuerza = c.class_types?.name?.toLowerCase().includes('fuerza')

            return (
              <Link
                key={c.id}
                href={`/admin/horarios/${c.id}`}
                className={`m-0.5 overflow-hidden rounded-lg px-2 py-1 text-[11px] leading-tight transition hover:-translate-y-px hover:shadow-md ${
                  isFuerza
                    ? 'border border-dashed border-clay/40 bg-white text-clay/80'
                    : 'border border-moss/20 bg-moss text-white shadow-sm'
                }`}
                style={{
                  gridColumn: colIndex + 2,
                  gridRow: `${startSlot + 2} / ${endSlot + 2}`,
                }}
              >
                <p className={`truncate font-display italic ${isFuerza ? '' : 'text-white'}`}>
                  {c.class_types?.name}
                </p>
                <p className={`truncate ${isFuerza ? 'opacity-70' : 'text-white/80'}`}>
                  {formatTime(c.start_time)}
                </p>
                <p className={`truncate font-medium ${isFull ? 'text-clay' : isFuerza ? '' : 'text-white'}`}>
                  {enrolled}/{c.capacity}
                </p>
              </Link>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 border-t border-sand pt-4 text-xs">
          <span className="flex items-center gap-1.5 text-ink/60">
            <span className="h-2.5 w-2.5 rounded bg-moss" />
            Reformer
          </span>
          <span className="flex items-center gap-1.5 text-ink/60">
            <span className="h-2.5 w-2.5 rounded border border-dashed border-clay/50 bg-white" />
            Fuerza
          </span>
        </div>
      </div>
    </div>
  )
}
