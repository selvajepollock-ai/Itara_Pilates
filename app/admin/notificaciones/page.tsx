import { createClient } from '@/lib/supabase/server'
import { formatTime } from '@/lib/day-names'
import { PageHeader } from '@/app/components/page-header'
import { dayLong, dayMonthLabel, shortName, todayART } from '../horarios/slots'
import { AnnouncementsHistory, type HistoryItem } from './announcements-history'
import { NewAnnouncementForm, type ClassOption } from './new-announcement-form'
import type { Person } from './people-picker'

const ART = 'America/Argentina/Buenos_Aires'
const dayART = (ts: string) => new Intl.DateTimeFormat('en-CA', { timeZone: ART }).format(new Date(ts))

export default async function ComunicadosPage() {
  const supabase = await createClient()
  const today = todayART()

  const [{ data: announcements }, { data: classes }, { data: profiles }, { data: enrollments }] = await Promise.all([
    supabase
      .from('announcements')
      .select('id, message, expires_at, created_at, target_type, target_usernames, target_class_id, target_date')
      .order('created_at', { ascending: false }),
    supabase
      .from('classes')
      .select('id, day_of_week, start_time, class_types(name)')
      .eq('active', true)
      .order('day_of_week')
      .order('start_time'),
    supabase.from('profiles').select('id, full_name, username, roles, active'),
    supabase.from('enrollments').select('class_id').eq('status', 'active'),
  ])

  type ClassRow = { id: string; day_of_week: number; start_time: string; class_types: { name: string } | null }
  const studentsByClass = new Map<string, number>()
  for (const e of enrollments ?? []) studentsByClass.set(e.class_id, (studentsByClass.get(e.class_id) ?? 0) + 1)
  const classOptions: ClassOption[] = ((classes ?? []) as unknown as ClassRow[]).map((c) => ({
    id: c.id,
    dayOfWeek: c.day_of_week,
    start: formatTime(c.start_time),
    typeName: c.class_types?.name ?? 'Clase',
    studentCount: studentsByClass.get(c.id) ?? 0,
  }))
  const classLabelById = new Map(
    classOptions.map((c) => [c.id, `Clase · ${dayLong(c.dayOfWeek)} ${c.start}`])
  )

  // Personas que pueden recibir un aviso puntual: el banner las reconoce por usuario.
  const people: Person[] = []
  let students = 0
  let instructors = 0
  for (const p of profiles ?? []) {
    const roles = (p.roles as string[] | null) ?? []
    const isStudent = roles.includes('student')
    const isInstructor = roles.includes('instructor')
    if (isStudent && p.active !== false) students++
    if (isInstructor) instructors++
    if (p.username && (isStudent || isInstructor)) {
      people.push({
        username: String(p.username).toLowerCase(),
        name: p.full_name as string,
        role: isInstructor ? 'instructor' : 'alumno',
      })
    }
  }
  people.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const nameByUsername = new Map(people.map((p) => [p.username, p.name]))

  const recipientLabel = (a: NonNullable<typeof announcements>[number]) => {
    if (a.target_type === 'people') {
      const names = ((a.target_usernames ?? []) as string[]).map((u) => shortName(nameByUsername.get(u.toLowerCase()) ?? u))
      if (names.length === 0) return 'Personas puntuales'
      if (names.length === 1) return names[0]
      if (names.length === 2) return `${names[0]} y ${names[1]}`
      return `${names[0]} y ${names.length - 1} más`
    }
    if (a.target_type === 'class') return classLabelById.get(a.target_class_id ?? '') ?? 'Clase eliminada'
    return 'Todos'
  }

  const items: HistoryItem[] = (announcements ?? []).map((a) => {
    const created = dayART(a.created_at as string)
    return {
      id: a.id as string,
      message: a.message as string,
      publishedLabel: created === today ? 'hoy' : dayMonthLabel(created),
      expiresLabel: a.expires_at ? `se oculta el ${dayMonthLabel(a.expires_at as string)}` : 'sin vencimiento',
      recipient: recipientLabel(a),
      // Oculto = con fecha de ocultamiento ya pasada (el último día visible es esa fecha).
      hidden: a.expires_at ? (a.expires_at as string) < today : false,
    }
  })

  return (
    <div className="space-y-8">
      <div>
        <PageHeader title="Comunicados" />
        <p className="mt-2 text-sm text-muted">
          Avisos que aparecen en el panel de alumnos e instructores al entrar a la app.
        </p>
      </div>
      <NewAnnouncementForm
        classOptions={classOptions}
        people={people}
        counts={{ students, instructors }}
        today={today}
      />
      <AnnouncementsHistory items={items} />
    </div>
  )
}
