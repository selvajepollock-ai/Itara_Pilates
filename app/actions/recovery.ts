'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getMonday, getSunday, toISODate, hoursUntil } from '@/lib/sessions'

async function assertSelfOrAdmin(targetStudentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false as const, error: 'No autenticado.' }

  if (user.id === targetStudentId) return { ok: true as const, supabase, actingAdmin: false }

  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).maybeSingle()
  if (!profile?.roles?.includes('admin')) {
    return { ok: false as const, error: 'No tenés permisos para esta acción.' }
  }
  return { ok: true as const, supabase, actingAdmin: true }
}

export async function cancelSession({
  studentId,
  enrollmentId,
  classId,
  sessionDate,
}: {
  studentId: string
  enrollmentId: string
  classId: string
  sessionDate: string
}) {
  const auth = await assertSelfOrAdmin(studentId)
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  const { data: classInfo } = await supabase
    .from('classes')
    .select('start_time, class_type_id')
    .eq('id', classId)
    .maybeSingle()

  if (!classInfo) return { error: 'La clase no existe.' }

  const { data: settings } = await supabase
    .from('studio_settings')
    .select('cancellation_min_hours')
    .maybeSingle()

  const minHours = settings?.cancellation_min_hours ?? 12
  const hoursLeft = hoursUntil(sessionDate, classInfo.start_time)
  const withinDeadline = hoursLeft >= minHours

  const { data: cancellation, error } = await supabase
    .from('session_cancellations')
    .insert({
      enrollment_id: enrollmentId,
      student_id: studentId,
      class_id: classId,
      session_date: sessionDate,
      within_deadline: withinDeadline,
    })
    .select('id')
    .maybeSingle()

  if (error) {
    if (error.message.toLowerCase().includes('duplicate')) {
      return { error: 'Ya avisaste que no vas a esa clase.' }
    }
    return { error: error.message }
  }

  if (!cancellation) return { error: 'No se pudo registrar el aviso. Probá de nuevo.' }

  let recoveryCreditId: string | null = null

  if (withinDeadline) {
    const sessionDateObj = new Date(`${sessionDate}T00:00:00`)
    const monday = getMonday(sessionDateObj)
    const sunday = getSunday(monday)

    const { data: credit, error: creditError } = await supabase
      .from('recovery_credits')
      .insert({
        student_id: studentId,
        source_cancellation_id: cancellation.id,
        class_type_id: classInfo.class_type_id,
        week_start: toISODate(monday),
        week_end: toISODate(sunday),
        status: 'available',
      })
      .select('id')
      .maybeSingle()

    if (!creditError && credit) {
      recoveryCreditId = credit.id
      await supabase
        .from('session_cancellations')
        .update({ recovery_credit_id: credit.id })
        .eq('id', cancellation.id)
    }
  }

  revalidatePath('/alumno')
  revalidatePath(`/admin/alumnos/${studentId}`)
  revalidatePath('/admin/avisos')

  return { success: true, withinDeadline, recoveryCreditId }
}

export async function bookRecovery({
  studentId,
  creditId,
  classId,
  sessionDate,
}: {
  studentId: string
  creditId: string
  classId: string
  sessionDate: string
}) {
  const auth = await assertSelfOrAdmin(studentId)
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  const { data: credit } = await supabase
    .from('recovery_credits')
    .select('id, status, class_type_id, week_end, student_id')
    .eq('id', creditId)
    .maybeSingle()

  if (!credit) return { error: 'Esa clase a recuperar ya no existe. Volvé a tu horario e intentá de nuevo.' }
  if (credit.student_id !== studentId) return { error: 'Esa clase a recuperar no te pertenece.' }
  if (credit.status !== 'available') {
    return { error: 'Esa clase a recuperar ya fue usada o venció. Volvé a tu horario para ver el estado actual.' }
  }
  if (sessionDate > credit.week_end) return { error: 'Esa fecha ya está fuera de la semana disponible.' }

  const { data: targetClass } = await supabase
    .from('classes')
    .select('id, class_type_id, capacity')
    .eq('id', classId)
    .maybeSingle()

  if (!targetClass) return { error: 'La clase no existe.' }
  if (targetClass.class_type_id !== credit.class_type_id) {
    return { error: 'Esa clase es de otro tipo, no coincide con lo que tenés para recuperar.' }
  }

  const [{ count: enrolledCount }, { count: cancelledCount }, { count: recoveringCount }] = await Promise.all([
    supabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('status', 'active'),
    supabase
      .from('session_cancellations')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('session_date', sessionDate),
    supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('session_date', sessionDate)
      .not('recovery_credit_id', 'is', null),
  ])

  const occupancy = (enrolledCount ?? 0) - (cancelledCount ?? 0) + (recoveringCount ?? 0)
  if (occupancy >= targetClass.capacity) return { error: 'Esa clase ya está completa.' }

  const { error: attendanceError } = await supabase.from('attendance').insert({
    class_id: classId,
    session_date: sessionDate,
    student_id: studentId,
    status: 'recovering',
    recovery_credit_id: creditId,
  })

  if (attendanceError) {
    if (attendanceError.message.toLowerCase().includes('duplicate')) {
      return { error: 'Ya tenés una recuperación anotada en esa clase.' }
    }
    return { error: attendanceError.message }
  }

  const { data: updatedCredit, error: creditUpdateError } = await supabase
    .from('recovery_credits')
    .update({ status: 'used', used_class_id: classId, used_session_date: sessionDate })
    .eq('id', creditId)
    .eq('status', 'available')
    .select('id')
    .maybeSingle()

  if (creditUpdateError || !updatedCredit) {
    // La reserva (attendance) ya quedó registrada; avisamos igual si el estado no se pudo confirmar.
    return { error: creditUpdateError?.message ?? 'La clase quedó anotada, pero no se pudo actualizar el estado. Refrescá la página.' }
  }

  revalidatePath('/alumno')
  revalidatePath(`/admin/alumnos/${studentId}`)
  revalidatePath('/admin/avisos')

  return { success: true }
}
