'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type AdminCheck =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; error: string }

async function assertAdmin(): Promise<AdminCheck> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'No autenticado.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()

  if (!profile?.roles?.includes('admin')) {
    return { ok: false, error: 'No tenés permisos para esta acción.' }
  }

  return { ok: true, supabase }
}

export async function createClass(formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  const class_type_id = String(formData.get('class_type_id') ?? '')
  const instructor_id = String(formData.get('instructor_id') ?? '') || null
  const room = String(formData.get('room') ?? 'Sala principal').trim()
  const day_of_week = Number(formData.get('day_of_week'))
  const start_time = String(formData.get('start_time') ?? '')
  const end_time = String(formData.get('end_time') ?? '')
  const capacity = Number(formData.get('capacity') ?? 8)

  if (!class_type_id || !start_time || !end_time || Number.isNaN(day_of_week)) {
    return { error: 'Completá todos los campos obligatorios.' }
  }

  const { error } = await supabase.from('classes').insert({
    class_type_id,
    instructor_id,
    room,
    day_of_week,
    start_time,
    end_time,
    capacity,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/horarios')
  redirect('/admin/horarios')
}

export async function updateClass(classId: string, formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  const class_type_id = String(formData.get('class_type_id') ?? '')
  const instructor_id = String(formData.get('instructor_id') ?? '') || null
  const room = String(formData.get('room') ?? 'Sala principal').trim()
  const day_of_week = Number(formData.get('day_of_week'))
  const start_time = String(formData.get('start_time') ?? '')
  const end_time = String(formData.get('end_time') ?? '')
  const capacity = Number(formData.get('capacity') ?? 8)

  const { error } = await supabase
    .from('classes')
    .update({
      class_type_id,
      instructor_id,
      room,
      day_of_week,
      start_time,
      end_time,
      capacity,
    })
    .eq('id', classId)

  if (error) return { error: error.message }

  revalidatePath('/admin/horarios')
  redirect('/admin/horarios')
}

export async function deleteClass(classId: string) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  const { error } = await supabase.from('classes').delete().eq('id', classId)
  if (error) return { error: error.message }

  revalidatePath('/admin/horarios')
}

export async function enrollStudent(classId: string, formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  const student_id = String(formData.get('student_id') ?? '')
  if (!student_id) return { error: 'Elegí un alumno.' }

  const { error } = await supabase.from('enrollments').insert({
    student_id,
    class_id: classId,
    status: 'active',
  })

  if (error) return { error: error.message }

  revalidatePath(`/admin/horarios/${classId}`)
  return { success: true }
}

export async function removeEnrollment(enrollmentId: string, classId: string) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/horarios/${classId}`)
}

export async function createClassType(formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()

  if (!name) return { error: 'El nombre es obligatorio.' }

  const { error } = await supabase.from('class_types').insert({ name, description })
  if (error) return { error: error.message }

  revalidatePath('/admin/tipos-de-clase')
  revalidatePath('/admin/horarios/nuevo')
  return { success: true }
}

export async function updateClassType(classTypeId: string, formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()

  if (!name) return { error: 'El nombre es obligatorio.' }

  const { error } = await supabase
    .from('class_types')
    .update({ name, description })
    .eq('id', classTypeId)

  if (error) return { error: error.message }

  revalidatePath('/admin/tipos-de-clase')
  revalidatePath('/admin/horarios')
  return { success: true }
}

export async function setClassTypeActive(classTypeId: string, active: boolean) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  const { error } = await supabase.from('class_types').update({ active }).eq('id', classTypeId)
  if (error) return { error: error.message }

  revalidatePath('/admin/tipos-de-clase')
  revalidatePath('/admin/horarios')
}
