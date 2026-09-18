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
  const pending_extra_capacity = Number(formData.get('pending_extra_capacity') ?? 0) || 0

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
    pending_extra_capacity,
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
  const pending_extra_capacity = Number(formData.get('pending_extra_capacity') ?? 0) || 0

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
      pending_extra_capacity,
    })
    .eq('id', classId)

  if (error) return { error: error.message }

  revalidatePath('/admin/horarios')
  redirect('/admin/horarios')
}

/** Suma el cupo extra pendiente (ej: camas nuevas) a la capacidad real de la clase. */
export async function activateExtraCapacity(classId: string) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  const { data: classItem } = await supabase
    .from('classes')
    .select('capacity, pending_extra_capacity')
    .eq('id', classId)
    .single()

  if (!classItem || classItem.pending_extra_capacity <= 0) {
    return { error: 'Esta clase no tiene cupo extra pendiente.' }
  }

  const { error } = await supabase
    .from('classes')
    .update({
      capacity: classItem.capacity + classItem.pending_extra_capacity,
      pending_extra_capacity: 0,
    })
    .eq('id', classId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/horarios/${classId}`)
  revalidatePath('/admin/horarios')
  return { success: true }
}

/** Activa de una sola vez el cupo extra pendiente de todas las clases que lo tengan cargado. */
export async function activateAllExtraCapacity() {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  const { data: pendingClasses } = await supabase
    .from('classes')
    .select('id, capacity, pending_extra_capacity')
    .gt('pending_extra_capacity', 0)

  if (!pendingClasses || pendingClasses.length === 0) {
    return { error: 'No hay clases con cupo extra pendiente.' }
  }

  for (const c of pendingClasses) {
    await supabase
      .from('classes')
      .update({ capacity: c.capacity + c.pending_extra_capacity, pending_extra_capacity: 0 })
      .eq('id', c.id)
  }

  revalidatePath('/admin/horarios')
  return { success: true, count: pendingClasses.length }
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
  revalidatePath('/admin/horarios')
  return { success: true }
}

export async function removeEnrollment(enrollmentId: string, classId: string) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  // Si esta inscripción tiene cancelaciones/recuperaciones asociadas, hay que
  // limpiarlas primero (si no, la base bloquea el borrado por la relación).
  const { data: cancellations } = await supabase
    .from('session_cancellations')
    .select('id')
    .eq('enrollment_id', enrollmentId)

  const cancellationIds = (cancellations ?? []).map((c) => c.id)

  if (cancellationIds.length > 0) {
    const { data: credits } = await supabase
      .from('recovery_credits')
      .select('id')
      .in('source_cancellation_id', cancellationIds)

    const creditIds = (credits ?? []).map((c) => c.id)
    if (creditIds.length > 0) {
      // session_cancellations y recovery_credits se referencian mutuamente
      // (recovery_credit_id / source_cancellation_id) — hay que romper ese
      // círculo antes de poder borrar cualquiera de las dos.
      await supabase
        .from('session_cancellations')
        .update({ recovery_credit_id: null })
        .in('recovery_credit_id', creditIds)
      await supabase.from('attendance').delete().in('recovery_credit_id', creditIds)
      await supabase.from('recovery_credits').delete().in('id', creditIds)
    }
    await supabase.from('session_cancellations').delete().eq('enrollment_id', enrollmentId)
  }

  // La asistencia marcada para clases normales de este horario (no de recuperación)
  // también apunta a la inscripción — desvincularla para no bloquear el borrado.
  await supabase.from('attendance').update({ enrollment_id: null }).eq('enrollment_id', enrollmentId)

  const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/horarios/${classId}`)
  revalidatePath('/admin/horarios')
  return { success: true }
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

export async function createHoliday(formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  const date = String(formData.get('date') ?? '')
  const label = String(formData.get('label') ?? '').trim()

  if (!date) return { error: 'Elegí una fecha.' }

  const { error } = await supabase.from('holidays').insert({ date, label: label || null })
  if (error) {
    if (error.message.toLowerCase().includes('duplicate')) {
      return { error: 'Ya hay un feriado cargado en esa fecha.' }
    }
    return { error: error.message }
  }

  revalidatePath('/admin/horarios/feriados')
  revalidatePath('/admin/horarios')
  return { success: true }
}

export async function deleteHoliday(holidayId: string) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  const { error } = await supabase.from('holidays').delete().eq('id', holidayId)
  if (error) return { error: error.message }

  revalidatePath('/admin/horarios/feriados')
  revalidatePath('/admin/horarios')
}
