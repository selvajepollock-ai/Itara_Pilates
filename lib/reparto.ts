import type { SupabaseClient } from '@supabase/supabase-js'

export const COMMISSION_RATE = 0.6

export type RepartoStudent = {
  studentId: string
  name: string
  planName: string
  comp: boolean
  assigned: number // plan + cargos extra del mes
  collected: number // lo efectivamente cobrado en el mes
}

export type RepartoGroup = {
  key: string // id del profesor o 'none'
  name: string
  isOwner: boolean
  students: RepartoStudent[]
  assigned: number
  collected: number
  commissionAssigned: number
  commissionCollected: number
  paid: number
  payouts: { id: string; amount: number; paid_at: string; notes: string | null }[]
}

export type Reparto = {
  month: string
  groups: RepartoGroup[]
  totalAssigned: number
  totalCollected: number
  studioAssigned: number
  studioCollected: number
  withoutInstructor: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

// Ingresos del mes repartidos por profesor. Un alumno pertenece a un solo profesor
// (el de sus clases fijas). Bonificados no generan valor. A los profesores dueños
// (rol admin) no se les calcula comision: todo queda para el estudio.
export async function buildReparto(supabase: SupabaseClient, month: string): Promise<Reparto> {
  const [year, m] = month.split('-').map(Number)
  const start = new Date(year, m - 1, 1)
  const end = new Date(year, m, 1)

  const [
    { data: profiles },
    { data: subs },
    { data: payments },
    { data: extraAll },
    { data: enrollments },
    { data: payouts },
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name, roles'),
    supabase.from('subscriptions').select('student_id, comp, plans(name, price)').eq('status', 'active'),
    supabase
      .from('payments')
      .select('amount, subscriptions(student_id)')
      .is('voided_at', null)
      .gte('paid_at', start.toISOString())
      .lt('paid_at', end.toISOString()),
    supabase
      .from('extra_charges')
      .select('student_id, amount, paid, paid_at, created_at, comp')
      .eq('comp', false)
      .gte('created_at', new Date(year, m - 2, 1).toISOString()),
    supabase.from('enrollments').select('student_id, classes(instructor_id)').eq('status', 'active'),
    supabase.from('instructor_payouts').select('id, instructor_id, amount, paid_at, notes').eq('month', month),
  ])

  const nameById = new Map<string, string>()
  const rolesById = new Map<string, string[]>()
  for (const p of profiles ?? []) {
    nameById.set(p.id as string, (p.full_name as string) ?? '')
    rolesById.set(p.id as string, (p.roles as string[]) ?? [])
  }

  const instructorOf = new Map<string, string>()
  for (const e of enrollments ?? []) {
    if (instructorOf.has(e.student_id)) continue
    const cls = e.classes as unknown as { instructor_id: string | null } | null
    if (cls?.instructor_id) instructorOf.set(e.student_id, cls.instructor_id)
  }

  const studentIds = new Set<string>()
  const subByStudent = new Map<string, { comp: boolean; planName: string; price: number }>()
  for (const s of subs ?? []) {
    const plan = s.plans as unknown as { name: string; price: number } | null
    subByStudent.set(s.student_id, { comp: Boolean(s.comp), planName: plan?.name ?? '', price: Number(plan?.price ?? 0) })
    studentIds.add(s.student_id)
  }

  const collectedBy = new Map<string, number>()
  for (const p of payments ?? []) {
    const sid = (p.subscriptions as unknown as { student_id: string } | null)?.student_id
    if (!sid) continue
    collectedBy.set(sid, (collectedBy.get(sid) ?? 0) + Number(p.amount))
    studentIds.add(sid)
  }

  const extraAssignedBy = new Map<string, number>()
  for (const c of extraAll ?? []) {
    const created = new Date(c.created_at as string)
    if (created >= start && created < end) {
      extraAssignedBy.set(c.student_id, (extraAssignedBy.get(c.student_id) ?? 0) + Number(c.amount))
      studentIds.add(c.student_id)
    }
    if (c.paid && c.paid_at) {
      const paidAt = new Date(c.paid_at as string)
      if (paidAt >= start && paidAt < end) {
        collectedBy.set(c.student_id, (collectedBy.get(c.student_id) ?? 0) + Number(c.amount))
        studentIds.add(c.student_id)
      }
    }
  }

  const groups = new Map<string, RepartoGroup>()
  const groupFor = (key: string): RepartoGroup => {
    let g = groups.get(key)
    if (!g) {
      const isOwner = key !== 'none' && (rolesById.get(key) ?? []).includes('admin')
      g = {
        key,
        name: key === 'none' ? 'Sin profesor asignado' : nameById.get(key) ?? 'Profesor',
        isOwner,
        students: [],
        assigned: 0,
        collected: 0,
        commissionAssigned: 0,
        commissionCollected: 0,
        paid: 0,
        payouts: [],
      }
      groups.set(key, g)
    }
    return g
  }

  // Todos los profesores aparecen aunque no tengan alumnos este mes.
  for (const [id, roles] of rolesById) if (roles.includes('instructor')) groupFor(id)

  for (const sid of studentIds) {
    const sub = subByStudent.get(sid)
    const comp = sub?.comp ?? false
    const assigned = comp ? 0 : (sub?.price ?? 0) + (extraAssignedBy.get(sid) ?? 0)
    const collected = comp ? 0 : collectedBy.get(sid) ?? 0
    if (assigned === 0 && collected === 0 && !comp) continue
    const g = groupFor(instructorOf.get(sid) ?? 'none')
    g.students.push({
      studentId: sid,
      name: nameById.get(sid) ?? 'Alumno',
      planName: sub?.planName ?? '',
      comp,
      assigned: round2(assigned),
      collected: round2(collected),
    })
    g.assigned += assigned
    g.collected += collected
  }

  for (const po of payouts ?? []) {
    const g = groupFor(po.instructor_id as string)
    g.paid += Number(po.amount)
    g.payouts.push({ id: po.id as string, amount: Number(po.amount), paid_at: po.paid_at as string, notes: po.notes as string | null })
  }

  const list = Array.from(groups.values())
  for (const g of list) {
    g.students.sort((a, b) => a.name.localeCompare(b.name))
    g.assigned = round2(g.assigned)
    g.collected = round2(g.collected)
    g.paid = round2(g.paid)
    if (g.key !== 'none' && !g.isOwner) {
      g.commissionAssigned = round2(g.assigned * COMMISSION_RATE)
      g.commissionCollected = round2(g.collected * COMMISSION_RATE)
    }
  }
  list.sort((a, b) => {
    if (a.key === 'none') return 1
    if (b.key === 'none') return -1
    return Number(a.isOwner) - Number(b.isOwner) || a.name.localeCompare(b.name)
  })

  const totalAssigned = round2(list.reduce((a, g) => a + g.assigned, 0))
  const totalCollected = round2(list.reduce((a, g) => a + g.collected, 0))
  const commAssigned = list.reduce((a, g) => a + g.commissionAssigned, 0)
  const commCollected = list.reduce((a, g) => a + g.commissionCollected, 0)

  return {
    month,
    groups: list,
    totalAssigned,
    totalCollected,
    studioAssigned: round2(totalAssigned - commAssigned),
    studioCollected: round2(totalCollected - commCollected),
    withoutInstructor: groups.get('none')?.students.length ?? 0,
  }
}
