import { createClient } from '@/lib/supabase/server'
import { BackLink } from '@/app/components/back-link'
import { todayART } from '../slots'
import { FeriadosView, type DayEntry } from './feriados-view'

export default async function FeriadosPage() {
  const supabase = await createClient()
  const [{ data: holidays }, { data: cancellations }, { data: classes }, { data: enrollments }] = await Promise.all([
    supabase.from('holidays').select('id, date, label'),
    supabase.from('class_cancellations').select('class_id, session_date, reason'),
    supabase.from('classes').select('id, day_of_week').eq('active', true),
    supabase.from('enrollments').select('class_id').eq('status', 'active'),
  ])

  const studentsByClass = new Map<string, number>()
  for (const e of enrollments ?? []) studentsByClass.set(e.class_id as string, (studentsByClass.get(e.class_id as string) ?? 0) + 1)

  const classIdsByDow = new Map<number, string[]>()
  const impactByDow: Record<number, { classes: number; students: number }> = {}
  for (const c of classes ?? []) {
    const dow = c.day_of_week as number
    classIdsByDow.set(dow, [...(classIdsByDow.get(dow) ?? []), c.id as string])
    const cur = impactByDow[dow] ?? { classes: 0, students: 0 }
    impactByDow[dow] = { classes: cur.classes + 1, students: cur.students + (studentsByClass.get(c.id as string) ?? 0) }
  }

  const entries: DayEntry[] = (holidays ?? []).map((h) => ({
    kind: 'feriado' as const,
    date: h.date as string,
    label: (h.label as string | null) ?? null,
    holidayId: h.id as string,
  }))

  // Un cierre no se guarda como tal: son las clases del día canceladas. Se considera cierre cuando están todas.
  // TODO: si hace falta distinguirlo mejor (por ejemplo una sola clase cancelada), guardar el cierre en una tabla propia.
  const byDate = new Map<string, { classIds: string[]; reason: string | null }>()
  for (const c of cancellations ?? []) {
    const date = c.session_date as string
    const cur = byDate.get(date) ?? { classIds: [], reason: null }
    cur.classIds.push(c.class_id as string)
    cur.reason = cur.reason ?? ((c.reason as string | null) || null)
    byDate.set(date, cur)
  }
  for (const [date, info] of byDate) {
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay()
    const dayClasses = classIdsByDow.get(dow) ?? []
    if (dayClasses.length > 0 && dayClasses.every((id) => info.classIds.includes(id))) {
      entries.push({ kind: 'cierre', date, label: info.reason, classIds: dayClasses })
    }
  }

  return (
    <div className="max-w-3xl">
      <BackLink href="/admin/horarios" label="Horarios" />
      <h1 className="font-display text-[30px] font-normal italic leading-tight text-ink lg:text-[38px]">Feriados y cierres</h1>
      <div className="mt-3">
        <FeriadosView today={todayART()} entries={entries} impactByDow={impactByDow} />
      </div>
    </div>
  )
}
