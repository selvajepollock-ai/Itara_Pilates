import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, formatTime } from '@/lib/day-names'
import { getMonday, dateForDayOfWeek, toISODate } from '@/lib/sessions'
import { ClassRoster } from '../../class-roster'

export default async function InstructorClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ week?: string }>
}) {
  const { id } = await params
  const { week } = await searchParams
  const supabase = await createClient()

  const { data: classInfo } = await supabase
    .from('classes')
    .select('id, day_of_week, start_time, end_time, room, capacity, class_types(name), profiles(full_name)')
    .eq('id', id)
    .single()

  if (!classInfo) notFound()

  const baseMonday = week ? getMonday(new Date(week)) : getMonday(new Date())
  const sessionDateObj = dateForDayOfWeek(baseMonday, classInfo.day_of_week)
  const sessionDate = toISODate(sessionDateObj)

  const prevWeek = new Date(baseMonday)
  prevWeek.setDate(prevWeek.getDate() - 7)
  const nextWeek = new Date(baseMonday)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const typeName = (classInfo.class_types as unknown as { name: string } | null)?.name
  const instructorName = (classInfo.profiles as unknown as { full_name: string } | null)?.full_name

  return (
    <div className="max-w-lg">
      <Link href="/instructor" className="text-sm text-moss hover:text-moss-dark">
        ← Volver a mi agenda
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-moss">{DAY_NAMES[classInfo.day_of_week]}</p>
          <h1 className="mt-1 font-display text-3xl italic text-ink">{typeName}</h1>
          <p className="mt-1 text-sm text-ink/50">
            {formatTime(classInfo.start_time)}–{formatTime(classInfo.end_time)} · {classInfo.room}
            {instructorName ? ` · ${instructorName}` : ''}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/instructor/clases/${id}?week=${toISODate(prevWeek)}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-sand text-ink/60 hover:border-moss hover:text-moss"
        >
          <ChevronLeft size={15} />
        </Link>
        <span className="text-sm text-ink/60">
          {sessionDateObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
        </span>
        <Link
          href={`/instructor/clases/${id}?week=${toISODate(nextWeek)}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-sand text-ink/60 hover:border-moss hover:text-moss"
        >
          <ChevronRight size={15} />
        </Link>
      </div>

      <p className="mt-6 text-xs uppercase tracking-wide text-ink/40">
        Alumnos ({sessionDateObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })})
      </p>
      <p className="mt-1 text-xs text-ink/40">
        Marcar asistencia es opcional — hacelo solo si te resulta útil.
      </p>
      <div className="mt-3">
        <ClassRoster classId={id} sessionDate={sessionDate} />
      </div>
    </div>
  )
}
