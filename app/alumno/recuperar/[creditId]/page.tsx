import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, formatTime } from '@/lib/day-names'
import { dateForDayOfWeek, toISODate, isInPast } from '@/lib/sessions'
import { BookRecoveryButton } from './book-recovery-button'

type ClassOption = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  capacity: number
  room: string
  profiles: { full_name: string } | null
}

export default async function RecuperarPage({
  params,
}: {
  params: Promise<{ creditId: string }>
}) {
  const { creditId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const studentId = user?.id ?? ''

  const { data: credit } = await supabase
    .from('recovery_credits')
    .select('id, student_id, status, class_type_id, week_start, week_end, class_types(name)')
    .eq('id', creditId)
    .single()

  if (!credit || credit.student_id !== studentId) notFound()

  if (credit.status !== 'available') {
    return (
      <div className="max-w-md">
        <Link href="/alumno" className="text-sm text-moss hover:text-moss-dark">
          ← Volver
        </Link>
        <p className="mt-6 text-sm text-ink/60">Esta clase a recuperar ya fue usada o venció.</p>
      </div>
    )
  }

  const { data: classesData } = await supabase
    .from('classes')
    .select('id, day_of_week, start_time, end_time, capacity, room, profiles(full_name)')
    .eq('class_type_id', credit.class_type_id)
    .eq('active', true)

  const classes = (classesData ?? []) as unknown as ClassOption[]
  const monday = new Date(`${credit.week_start}T00:00:00`)

  const options = classes
    .map((c) => {
      const sessionDate = toISODate(dateForDayOfWeek(monday, c.day_of_week))
      return { ...c, sessionDate }
    })
    .filter((c) => c.sessionDate <= credit.week_end && !isInPast(c.sessionDate, c.start_time))
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate) || a.start_time.localeCompare(b.start_time))

  // Calcular ocupación real de cada opción
  const optionsWithOccupancy = await Promise.all(
    options.map(async (c) => {
      const [{ count: enrolledCount }, { count: cancelledCount }, { count: recoveringCount }] =
        await Promise.all([
          supabase
            .from('enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('class_id', c.id)
            .eq('status', 'active'),
          supabase
            .from('session_cancellations')
            .select('id', { count: 'exact', head: true })
            .eq('class_id', c.id)
            .eq('session_date', c.sessionDate),
          supabase
            .from('attendance')
            .select('id', { count: 'exact', head: true })
            .eq('class_id', c.id)
            .eq('session_date', c.sessionDate)
            .not('recovery_credit_id', 'is', null),
        ])
      const occupied = (enrolledCount ?? 0) - (cancelledCount ?? 0) + (recoveringCount ?? 0)
      return { ...c, occupied, hasRoom: occupied < c.capacity }
    })
  )

  const typeName = (credit.class_types as unknown as { name: string } | null)?.name

  return (
    <div className="max-w-md">
      <Link href="/alumno" className="text-sm text-moss hover:text-moss-dark">
        ← Volver a tu horario
      </Link>

      <p className="mt-4 text-xs uppercase tracking-[0.25em] text-moss">Recuperar clase</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">{typeName}</h1>
      <p className="mt-2 text-sm text-ink/60">
        Elegí una clase con lugar, antes del{' '}
        {new Date(`${credit.week_end}T00:00:00`).toLocaleDateString('es-AR', {
          day: 'numeric',
          month: 'long',
        })}
        .
      </p>

      <div className="mt-6 space-y-3">
        {optionsWithOccupancy.map((c) => (
          <div
            key={`${c.id}-${c.sessionDate}`}
            className={`rounded-2xl border bg-white px-4 py-4 ${
              c.hasRoom ? 'border-sand' : 'border-sand opacity-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-display italic text-ink">
                {DAY_NAMES[c.day_of_week]}{' '}
                {new Date(`${c.sessionDate}T00:00:00`).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'short',
                })}
                , {formatTime(c.start_time)}
              </p>
              <span className="text-xs text-ink/40">
                {c.occupied}/{c.capacity}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink/50">
              {c.room} · {c.profiles?.full_name ?? 'Sin instructor'}
            </p>
            <div className="mt-2.5">
              {c.hasRoom ? (
                <BookRecoveryButton
                  studentId={studentId}
                  creditId={credit.id}
                  classId={c.id}
                  sessionDate={c.sessionDate}
                />
              ) : (
                <p className="text-xs text-clay">Completo</p>
              )}
            </div>
          </div>
        ))}

        {optionsWithOccupancy.length === 0 && (
          <p className="rounded-2xl border border-dashed border-sand bg-white/50 px-5 py-8 text-center text-sm text-ink/40">
            No hay clases de este tipo disponibles esta semana.
          </p>
        )}
      </div>
    </div>
  )
}
