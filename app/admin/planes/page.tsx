import { createClient } from '@/lib/supabase/server'
import { PlansView } from './plans-view'
import type { PlanItem } from './plan-math'

export default async function PlanesPage() {
  const supabase = await createClient()
  const [{ data: plans }, { data: subs }, { data: students }] = await Promise.all([
    supabase.from('plans').select('id, name, price, active, category, classes_per_week').order('price'),
    // Solo lectura: suscripciones activas, para contar alumnos por plan.
    supabase.from('subscriptions').select('student_id, plan_id, comp').eq('status', 'active'),
    supabase.from('profiles').select('id, active').contains('roles', ['student']),
  ])

  const activeStudents = new Set((students ?? []).filter((s) => s.active !== false).map((s) => s.id as string))
  const counts = new Map<string, { students: number; paying: number }>()
  for (const s of subs ?? []) {
    if (!s.plan_id || !activeStudents.has(s.student_id as string)) continue
    const cur = counts.get(s.plan_id as string) ?? { students: 0, paying: 0 }
    cur.students++
    if (!s.comp) cur.paying++
    counts.set(s.plan_id as string, cur)
  }

  const items: PlanItem[] = (plans ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    price: Number(p.price),
    active: Boolean(p.active),
    category: (p.category as string) ?? 'reformer',
    classesPerWeek: (p.classes_per_week as number | null) ?? null,
    students: counts.get(p.id as string)?.students ?? 0,
    paying: counts.get(p.id as string)?.paying ?? 0,
  }))

  return <PlansView plans={items} />
}
