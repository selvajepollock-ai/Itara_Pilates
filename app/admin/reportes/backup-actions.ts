'use server'

import { createClient } from '@/lib/supabase/server'

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
  return { ok: true as const, supabase }
}

type Row = Record<string, unknown>
type Sheet = { name: string; rows: Row[] }

const TABLES = [
  'profiles',
  'plans',
  'subscriptions',
  'payments',
  'extra_charges',
  'attendance',
  'session_cancellations',
  'recovery_credits',
  'classes',
  'class_types',
  'enrollments',
  'holidays',
  'signup_requests',
  'plan_change_requests',
  'studio_settings',
] as const

/**
 * Copia de seguridad completa: devuelve todas las tablas del negocio como filas
 * planas, con el nombre del alumno resuelto donde hay un `student_id`.
 * El cliente arma un único .xlsx con una hoja por tabla.
 */
export async function exportFullBackup(): Promise<{ error?: string; sheets?: Sheet[]; generatedAt?: string }> {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const results = await Promise.all(
    TABLES.map((t) => auth.supabase.from(t).select('*').limit(20000))
  )

  const byTable = new Map<string, Row[]>()
  for (let i = 0; i < TABLES.length; i++) {
    const { data, error } = results[i]
    if (error) return { error: `Error leyendo ${TABLES[i]}: ${error.message}` }
    byTable.set(TABLES[i], (data ?? []) as Row[])
  }

  const nameById = new Map<string, string>()
  for (const p of byTable.get('profiles') ?? []) {
    if (typeof p.id === 'string') nameById.set(p.id, String(p.full_name ?? ''))
  }

  const resolveName = (id: unknown) => (typeof id === 'string' ? nameById.get(id) ?? '' : '')

  const sheets: Sheet[] = TABLES.map((t) => {
    const rows = (byTable.get(t) ?? []).map((r) => {
      const out: Row = {}
      if ('student_id' in r) out.alumno = resolveName(r.student_id)
      if (t === 'payments' && 'recorded_by' in r) out.registro = resolveName(r.recorded_by)
      if (t === 'attendance' && 'marked_by' in r) out.marco = resolveName(r.marked_by)
      return { ...out, ...r }
    })
    return { name: t, rows }
  })

  return { sheets, generatedAt: new Date().toISOString() }
}
