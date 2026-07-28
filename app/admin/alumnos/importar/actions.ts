'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateNoAccessEmail } from '@/lib/auth-username'

async function assertAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado.' }

  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).maybeSingle()
  if (!profile?.roles?.includes('admin')) {
    return { ok: false as const, error: 'No tenés permisos para esta acción.' }
  }
  return { ok: true as const }
}

// Trae el mapa de clases activas: "Reformer_1_07:00:00" -> classId
export async function getActiveClassesMap() {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classes')
    .select('id, day_of_week, start_time, class_types(name)')
    .eq('active', true)

  if (error) return { error: error.message }

  const map: Record<string, string> = {}
  for (const c of data ?? []) {
    const typeName = (c.class_types as unknown as { name: string } | null)?.name
    const key = `${typeName}_${c.day_of_week}_${c.start_time}`
    map[key] = c.id
  }
  return { map }
}

// Crea (o reutiliza) cuentas de alumno sin acceso, para un lote de nombres
export async function createStudentsBatch(names: string[]) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const admin = createAdminClient()
  const result: Record<string, string> = {}

  // Reutilizar los que ya existen
  const { data: existing } = await admin
    .from('profiles')
    .select('id, full_name')
    .contains('roles', ['student'])
    .in('full_name', names)

  const existingNames = new Set<string>()
  for (const p of existing ?? []) {
    result[p.full_name] = p.id
    existingNames.add(p.full_name)
  }

  for (const name of names) {
    if (existingNames.has(name)) continue
    const { data: created, error } = await admin.auth.admin.createUser({
      email: generateNoAccessEmail(name),
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { full_name: name, roles: ['student'] },
    })
    if (!error && created.user?.id) {
      result[name] = created.user.id
    }
  }

  return { result }
}

// Inscribe un lote de asignaciones (alumno ya creado + clase) usando el mapa de clases
export async function enrollBatch(
  rows: { studentId: string; classKey: string }[]
) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  const { data: classesData } = await supabase
    .from('classes')
    .select('id, day_of_week, start_time, class_types(name)')
    .eq('active', true)

  const map: Record<string, string> = {}
  for (const c of classesData ?? []) {
    const typeName = (c.class_types as unknown as { name: string } | null)?.name
    map[`${typeName}_${c.day_of_week}_${c.start_time}`] = c.id
  }

  const toInsert: { student_id: string; class_id: string; status: string }[] = []
  const notFound: string[] = []

  for (const row of rows) {
    const classId = map[row.classKey]
    if (!classId) {
      notFound.push(row.classKey)
      continue
    }
    toInsert.push({ student_id: row.studentId, class_id: classId, status: 'active' })
  }

  if (toInsert.length > 0) {
    const { error } = await supabase
      .from('enrollments')
      .upsert(toInsert, { onConflict: 'student_id,class_id', ignoreDuplicates: true })
    if (error) return { error: error.message, notFound }
  }

  return { success: true, inserted: toInsert.length, notFound }
}
