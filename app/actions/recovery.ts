'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  const { data: enrollmentInfo } = await supabase
    .from('enrollments')
    .select('id, student_id, class_id')
    .eq('id', enrollmentId)
    .maybeSingle()

  if (!enrollmentInfo || enrollmentInfo.student_id !== studentId || enrollmentInfo.class_id !== classId) {
    return { error: 'Esa clase no corresponde al horario de este alumno.' }
  }

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

// El alumno elige un horario candidato. Queda "solicitado", esperando el OK del estudio.
// Todavía NO se anota de verdad (no se crea asistencia) hasta que el admin apruebe.
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
  if (credit.status === 'requested') {
    return { error: 'Ya tenés un horario esperando aprobación. Esperá la respuesta antes de elegir otro.' }
  }
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

  const admin = createAdminClient()
  const [{ count: enrolledCount }, { count: cancelledCount }, { count: recoveringCount }] = await Promise.all([
    admin
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('status', 'active'),
    admin
      .from('session_cancellations')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('session_date', sessionDate),
    admin
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('session_date', sessionDate)
      .not('recovery_credit_id', 'is', null),
  ])

  const occupancy = (enrolledCount ?? 0) - (cancelledCount ?? 0) + (recoveringCount ?? 0)
  if (occupancy >= targetClass.capacity) return { error: 'Esa clase ya está completa.' }

  const { data: updated, error: updateError } = await supabase
    .from('recovery_credits')
    .update({
      status: 'requested',
      requested_class_id: classId,
      requested_session_date: sessionDate,
    })
    .eq('id', creditId)
    .eq('status', 'available')
    .select('id')
    .maybeSingle()

  if (updateError) return { error: updateError.message }
  if (!updated) return { error: 'Alguien más ya modificó esta recuperación. Refrescá la página.' }

  revalidatePath('/alumno')
  revalidatePath(`/admin/alumnos/${studentId}`)
  revalidatePath('/admin/avisos')

  return { success: true }
}

// Admin aprueba el horario solicitado: recién ahora se confirma la asistencia de verdad.
export async function approveRecoveryRequest(creditId: string) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  const { data: credit } = await supabase
    .from('recovery_credits')
    .select('id, student_id, status, requested_class_id, requested_session_date')
    .eq('id', creditId)
    .maybeSingle()

  if (!credit) return { error: 'Esa solicitud ya no existe.' }
  if (credit.status !== 'requested' || !credit.requested_class_id || !credit.requested_session_date) {
    return { error: 'Esta solicitud ya fue resuelta.' }
  }

  const { error: attendanceError } = await supabase.from('attendance').insert({
    class_id: credit.requested_class_id,
    session_date: credit.requested_session_date,
    student_id: credit.student_id,
    status: 'recovering',
    recovery_credit_id: creditId,
  })

  if (attendanceError) {
    if (attendanceError.message.toLowerCase().includes('duplicate')) {
      return { error: 'Esa clase ya tiene una recuperación anotada.' }
    }
    return { error: attendanceError.message }
  }

  const { error } = await supabase
    .from('recovery_credits')
    .update({ status: 'used', used_class_id: credit.requested_class_id, used_session_date: credit.requested_session_date })
    .eq('id', creditId)
    .eq('status', 'requested')

  if (error) return { error: error.message }

  revalidatePath('/admin/avisos')
  revalidatePath('/alumno')
  return { success: true }
}

// Admin rechaza el horario solicitado: vuelve a "available" para que el alumno elija otro.
export async function rejectRecoveryRequest(creditId: string) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  const { error } = await supabase
    .from('recovery_credits')
    .update({ status: 'available', requested_class_id: null, requested_session_date: null })
    .eq('id', creditId)
    .eq('status', 'requested')

  if (error) return { error: error.message }

  revalidatePath('/admin/avisos')
  revalidatePath('/alumno')
  return { success: true }
}
