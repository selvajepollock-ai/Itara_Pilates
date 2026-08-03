import Link from 'next/link'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatTime } from '@/lib/day-names'
import { toISODate } from '@/lib/sessions'
import { DateJumpInput } from './date-jump-input'
import { ClassRoster } from '../class-roster'
import { BackButton } from './back-button'

type ClassRow = {
  id: string
  start_time: string
  end_time: string
  room: string
  capacity: number
  class_types: { name: string } | null
  profiles: { full_name: string } | null
}

export default async function PasarListaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; classId?: string }>
}) {
  const { date, classId } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', user?.id ?? '')
    .maybeSingle()
  const isAdmin = callerProfile?.roles?.includes('admin') ?? false

  const selectedDate = date ? new Date(`${date}T00:00:00`) : new Date()
  selectedDate.setHours(0, 0, 0, 0)
  const selectedISO = toISODate(selectedDate)
  const dayOfWeek = selectedDate.getDay()

  const prevDate = new Date(selectedDate)
  prevDate.setDate(prevDate.getDate() - 1)
  const nextDate = new Date(selectedDate)
  nextDate.setDate(nextDate.getDate() + 1)

  let query = supabase
    .from('classes')
    .select('id, start_time, end_time, room, capacity, class_types(name), profiles(full_name)')
    .eq('day_of_week', dayOfWeek)
    .eq('active', true)

  if (!isAdmin) {
    query = query.eq('instructor_id', user?.id ?? '')
  }

  const { data: classesData } = await query
  const classes = ((classesData ?? []) as unknown as ClassRow[]).sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  )

  const selectedClass = classId ? classes.find((c) => c.id === classId) : undefined

  return (
    <div>
      <BackButton />
      <p className="mt-4 text-xs uppercase tracking-[0.25em] text-moss">
        {isAdmin ? 'Estudio' : 'Tu agenda'}
      </p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">Pasar lista</h1>

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/instructor/pasar-lista?date=${toISODate(prevDate)}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-sand text-ink/60 hover:border-moss hover:text-moss"
        >
          <ChevronLeft size={15} />
        </Link>
        <DateJumpInput defaultValue={selectedISO} />
        <Link
          href={`/instructor/pasar-lista?date=${toISODate(nextDate)}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-sand text-ink/60 hover:border-moss hover:text-moss"
        >
          <ChevronRight size={15} />
        </Link>
        <span className="ml-2 text-sm capitalize text-ink/50">
          {selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/40">Clases del día</p>
          <div className="mt-3 space-y-2">
            {classes.map((c) => {
              const isSelected = c.id === classId
              return (
                <Link
                  key={c.id}
                  href={`/instructor/pasar-lista?date=${selectedISO}&classId=${c.id}`}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                    isSelected ? 'border-moss bg-moss/5' : 'border-sand bg-white hover:border-moss/50'
                  }`}
                >
                  <div>
                    <p className="font-display italic text-ink">{c.class_types?.name}</p>
                    <p className="text-xs text-ink/50">
                      {c.room}
                      {isAdmin && c.profiles?.full_name ? ` · ${c.profiles.full_name}` : ''}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums text-ink/60">{formatTime(c.start_time)}</span>
                </Link>
              )
            })}
            {classes.length === 0 && (
              <div className="rounded-xl border border-dashed border-sand bg-white/50 px-4 py-10 text-center">
                <CalendarIcon size={20} className="mx-auto text-ink/20" />
                <p className="mt-2 text-sm text-ink/40">No hay clases programadas para esta fecha.</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-ink/40">Lista de asistencia</p>
          <div className="mt-3">
            {selectedClass ? (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-ink">
                    <span className="font-medium">{selectedClass.class_types?.name}</span> ·{' '}
                    {formatTime(selectedClass.start_time)}
                  </p>
                </div>
                <ClassRoster classId={selectedClass.id} sessionDate={selectedISO} />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-sand bg-white/50 px-4 py-10 text-center">
                <p className="text-sm text-ink/40">Seleccioná una clase para ver quién va.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
