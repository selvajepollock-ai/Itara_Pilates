import Link from 'next/link'
import { List } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, DAY_ORDER, formatTime } from '@/lib/day-names'

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
const START_HOUR = 6
const END_HOUR = 22
const TOTAL_SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES

const PALETTE = [
  { bg: 'bg-moss/10', text: 'text-moss-dark', border: 'border-moss/25', dot: 'bg-moss' },
  { bg: 'bg-clay/10', text: 'text-clay', border: 'border-clay/25', dot: 'bg-clay' },
  { bg: 'bg-blush', text: 'text-ink', border: 'border-sand', dot: 'bg-ink/40' },
  { bg: 'bg-sand/60', text: 'text-ink/70', border: 'border-ink/10', dot: 'bg-ink/30' },
]

function timeToMinutes(time: string) {
  const [h, m] = time.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function minutesToSlot(minutes: number) {
  const clamped = Math.min(Math.max(minutes, START_HOUR * 60), END_HOUR * 60)
  return (clamped - START_HOUR * 60) / SLOT_MINUTES
}

export default async function CalendarioPage() {
  const supabase = await createClient()

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

  const typeIds = Array.from(new Set(classes.map((c) => c.class_types?.id).filter(Boolean)))
  const colorByType = new Map<string, (typeof PALETTE)[number]>()
  typeIds.forEach((id, i) => colorByType.set(id as string, PALETTE[i % PALETTE.length]))

  const hourMarks = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-moss">Estudio</p>
          <h1 className="mt-2 font-display text-3xl italic text-ink">Calendario semanal</h1>
        </div>
        <Link
          href="/admin/horarios"
          className="flex items-center gap-1.5 rounded-full border border-sand px-5 py-2.5 text-sm font-medium text-ink/70 transition hover:border-moss hover:text-moss"
        >
          <List size={15} strokeWidth={2} />
          Ver como lista
        </Link>
      </div>

      {classes.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-sand bg-white/50 px-6 py-16 text-center">
          <p className="font-display text-xl italic text-ink">Todavía no hay clases cargadas</p>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-sand bg-white p-4">
          <div
            className="grid min-w-[900px]"
            style={{
              gridTemplateColumns: `56px repeat(7, 1fr)`,
              gridTemplateRows: `36px repeat(${TOTAL_SLOTS}, 22px)`,
            }}
          >
            {/* Header row */}
            <div />
            {DAY_ORDER.map((day, i) => (
              <div
                key={day}
                className="flex items-center justify-center border-b border-sand pb-2 text-xs font-medium uppercase tracking-wide text-ink/50"
                style={{ gridColumn: i + 2, gridRow: 1 }}
              >
                {DAY_NAMES[day].slice(0, 3)}
              </div>
            ))}

            {/* Hour gridlines + labels */}
            {hourMarks.map((hour) => {
              const slot = minutesToSlot(hour * 60)
              return (
                <div
                  key={hour}
                  className="border-t border-sand/60 pr-2 text-right text-[11px] leading-none text-ink/30"
                  style={{ gridColumn: 1, gridRow: slot + 2 }}
                >
                  {hour}h
                </div>
              )
            })}
            {hourMarks.map((hour) => {
              const slot = minutesToSlot(hour * 60)
              return DAY_ORDER.map((_, i) => (
                <div
                  key={`${hour}-${i}`}
                  className="border-t border-sand/40"
                  style={{ gridColumn: i + 2, gridRow: slot + 2 }}
                />
              ))
            })}

            {/* Class blocks */}
            {classes.map((c) => {
              const dayIndex = DAY_ORDER.indexOf(c.day_of_week)
              if (dayIndex === -1) return null
              const startSlot = minutesToSlot(timeToMinutes(c.start_time))
              const endSlot = minutesToSlot(timeToMinutes(c.end_time))
              const color = colorByType.get(c.class_types?.id ?? '') ?? PALETTE[0]
              const enrolled = countByClass.get(c.id) ?? 0
              const isFull = enrolled >= c.capacity

              return (
                <Link
                  key={c.id}
                  href={`/admin/horarios/${c.id}`}
                  className={`m-0.5 overflow-hidden rounded-lg border px-2 py-1 text-[11px] leading-tight transition hover:shadow-md ${color.bg} ${color.text} ${color.border}`}
                  style={{
                    gridColumn: dayIndex + 2,
                    gridRow: `${startSlot + 2} / ${endSlot + 2}`,
                  }}
                >
                  <p className="truncate font-display italic">{c.class_types?.name}</p>
                  <p className="truncate opacity-70">{formatTime(c.start_time)}</p>
                  <p className={`truncate font-medium ${isFull ? 'text-clay' : ''}`}>
                    {enrolled}/{c.capacity}
                  </p>
                </Link>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 border-t border-sand pt-4">
            {typeIds.map((id) => {
              const type = classes.find((c) => c.class_types?.id === id)?.class_types
              const color = colorByType.get(id as string) ?? PALETTE[0]
              return (
                <span
                  key={id}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${color.bg} ${color.text}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
                  {type?.name}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
