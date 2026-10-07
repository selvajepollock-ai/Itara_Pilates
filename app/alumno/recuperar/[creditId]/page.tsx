import { BackLink } from '@/app/components/back-link'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isInPast } from '@/lib/sessions'
import { formatTime } from '@/lib/day-names'
import { addDaysISO, todayART } from '../../../admin/horarios/slots'
import { dayDate, dayDateCap, dowOf } from '../../format'
import { RecoveryPicker, type PickerDay } from './recovery-picker'

type ClassOption = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  capacity: number
  room: string
  profiles: { full_name: string } | null
}

function Shell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      {/* Celular: barra con "‹" (el encabezado del panel se oculta en esta pantalla). */}
      <div className="-mx-4 mb-4 flex items-center gap-1 border-b border-edge bg-white px-2 py-2 lg:hidden">
        <Link href="/alumno" aria-label="Volver" className="flex h-11 w-11 items-center justify-center rounded-[10px] text-ink hover:bg-moss-soft">
          <ChevronLeft size={22} />
        </Link>
        <p className="font-display text-lg italic text-ink">{title}</p>
      </div>
      <BackLink href="/alumno" label="Inicio" className="hidden lg:block" />
      {children}
    </div>
  )
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
  const today = todayART()

  const { data: credit } = await supabase
    .from('recovery_credits')
    .select(
      'id, student_id, status, class_type_id, instructor_id, week_start, week_end, requested_session_date, class_types(name), requested:requested_class_id(start_time), profiles!recovery_credits_instructor_id_fkey(full_name)'
    )
    .eq('id', creditId)
    .maybeSingle()

  if (!credit || credit.student_id !== studentId) notFound()

  const typeName = (credit.class_types as unknown as { name: string } | null)?.name ?? 'Clase'
  const instructorName = (credit.profiles as unknown as { full_name: string } | null)?.full_name ?? null
  const friday = addDaysISO(credit.week_end, -2)

  // Origen de la recuperación: el aviso (o la cancelación del estudio) que la generó.
  const { data: source } = await supabase
    .from('session_cancellations')
    .select('class_id, session_date')
    .eq('recovery_credit_id', credit.id)
    .maybeSingle()
  let originText = 'Por una clase que no pudiste tomar'
  if (source) {
    const { data: studio } = await supabase
      .from('class_cancellations')
      .select('class_id')
      .eq('class_id', source.class_id)
      .eq('session_date', source.session_date)
      .maybeSingle()
    originText = studio
      ? `Por la clase del ${dayDate(source.session_date)}, cancelada por el estudio`
      : `Por tu clase del ${dayDate(source.session_date)}`
  }

  const heading = (
    <>
      <h1 className="mt-4 font-display text-[30px] font-normal italic leading-tight text-ink lg:text-4xl">
        Elegí una clase para recuperar
      </h1>
      <p className="mt-1.5 text-sm text-muted">{originText}</p>
    </>
  )

  if (credit.status === 'requested') {
    const requested = credit.requested as unknown as { start_time: string } | null
    const label =
      requested && credit.requested_session_date
        ? `el ${dayDate(credit.requested_session_date)} a las ${formatTime(requested.start_time)}`
        : 'un horario'
    return (
      <Shell title="Recuperar clase">
        {heading}
        <div className="mt-6">
          <RecoveryPicker days={[]} studentId={studentId} creditId={credit.id} pendingLabel={label} />
        </div>
      </Shell>
    )
  }

  if (credit.status !== 'available') {
    return (
      <Shell title="Recuperar clase">
        <p className="mt-6 text-sm text-muted">Esta recuperación ya fue usada o venció.</p>
      </Shell>
    )
  }

  // Clases del mismo tipo y con el mismo profesor que la original.
  let classesQuery = supabase
    .from('classes')
    .select('id, day_of_week, start_time, end_time, capacity, room, profiles(full_name)')
    .eq('class_type_id', credit.class_type_id)
    .eq('active', true)
  if (credit.instructor_id) classesQuery = classesQuery.eq('instructor_id', credit.instructor_id)
  const { data: classesData } = await classesQuery
  const classes = (classesData ?? []) as unknown as ClassOption[]

  // Días que quedan en la semana de la recuperación.
  const days: string[] = []
  for (let d = today > credit.week_start ? today : credit.week_start; d <= credit.week_end; d = addDaysISO(d, 1)) days.push(d)

  const admin = createAdminClient()
  const pickerDays: PickerDay[] = (
    await Promise.all(
      days.map(async (date) => {
        const matches = classes.filter((c) => c.day_of_week === dowOf(date) && !isInPast(date, c.start_time))
        const withPlaces = await Promise.all(
          matches.map(async (c) => {
            // Misma regla de lugar que siempre: fijos − avisaron + recuperan < cupo.
            const [{ count: enrolledCount }, { count: cancelledCount }, { count: recoveringCount }] = await Promise.all([
              admin.from('enrollments').select('id', { count: 'exact', head: true }).eq('class_id', c.id).eq('status', 'active'),
              admin
                .from('session_cancellations')
                .select('id', { count: 'exact', head: true })
                .eq('class_id', c.id)
                .eq('session_date', date),
              admin
                .from('attendance')
                .select('id', { count: 'exact', head: true })
                .eq('class_id', c.id)
                .eq('session_date', date)
                .not('recovery_credit_id', 'is', null),
            ])
            const occupied = (enrolledCount ?? 0) - (cancelledCount ?? 0) + (recoveringCount ?? 0)
            return { classId: c.id, time: formatTime(c.start_time), places: c.capacity - occupied }
          })
        )
        return {
          date,
          title: dayDateCap(date),
          options: withPlaces.filter((o) => o.places > 0).sort((a, b) => a.time.localeCompare(b.time)),
        }
      })
    )
  ).filter((d) => d.options.length > 0)

  return (
    <Shell title="Recuperar clase">
      {heading}

      <dl className="mt-5 grid grid-cols-3 divide-x divide-edge rounded-2xl bg-edge-head max-lg:text-center lg:gap-3 lg:divide-x-0 lg:bg-transparent">
        {[
          ['Tenés hasta', dayDate(friday)],
          ['Clase', typeName],
          ['Profesor', instructorName ?? '—'],
        ].map(([label, value]) => (
          <div key={label} className="px-3 py-3 lg:rounded-2xl lg:bg-edge-head lg:px-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-[13.5px] text-muted">
        Solo se muestran clases con lugar, del mismo tipo y con tu mismo profesor. Al elegir una, queda confirmada al
        instante.
      </p>

      <div className="mt-6">
        <RecoveryPicker days={pickerDays} studentId={studentId} creditId={credit.id} />
      </div>
    </Shell>
  )
}
