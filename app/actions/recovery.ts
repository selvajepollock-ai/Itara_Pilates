'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMonday, getSunday, toISODate, hoursUntil, isInPast } from '@/lib/sessions'
import { todayART } from '@/lib/dates'
import { notifyAdmins, notifyUsers } from '@/lib/push'
import { dayDate } from '../alumno/format'

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
  return { ok: true as const, supabase, userId: user.id }
}

const weekdayOf = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay()

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
  // Las escrituras se hacen con permisos del servidor: la alumna no puede escribir estas tablas directamente.
  const admin = createAdminClient()

  const { data: classInfo } = await supabase
    .from('classes')
    .select('start_time, class_type_id, instructor_id, day_of_week')
    .eq('id', classId)
    .maybeSingle()

  if (!classInfo) return { error: 'La clase no existe.' }
  // La fecha tiene que ser un día en que esa clase realmente se da, y todavía no haber empezado.
  if (weekdayOf(sessionDate) !== classInfo.day_of_week) return { error: 'Esa fecha no corresponde al día de esa clase.' }
  if (hoursUntil(sessionDate, classInfo.start_time) < 0) return { error: 'Esa clase ya empezó o ya pasó.' }

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

  const minHours = settings?.cancellation_min_hours ?? 4
  const hoursLeft = hoursUntil(sessionDate, classInfo.start_time)
  const withinDeadline = hoursLeft >= minHours

  const { data: cancellation, error } = await admin
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

    const { data: credit, error: creditError } = await admin
      .from('recovery_credits')
      .insert({
        student_id: studentId,
        source_cancellation_id: cancellation.id,
        class_type_id: classInfo.class_type_id,
        instructor_id: classInfo.instructor_id,
        week_start: toISODate(monday),
        week_end: toISODate(sunday),
        status: 'available',
      })
      .select('id')
      .maybeSingle()

    if (!creditError && credit) {
      recoveryCreditId = credit.id
      await admin
        .from('session_cancellations')
        .update({ recovery_credit_id: credit.id })
        .eq('id', cancellation.id)
    }
  }

  await notifyFreedSpot(classId, sessionDate)

  revalidatePath('/alumno')
  revalidatePath(`/admin/alumnos/${studentId}`)
  revalidatePath('/admin/avisos')

  return { success: true, withinDeadline, recoveryCreditId }
}

// Deshace el aviso de "no voy" de UN alumno en UNA fecha puntual: vuelve a contar
// como que viene normal ese día (horario fijo), sin cargarle una clase paga nueva
// ni tratarlo como recuperación. Es para el caso de "avisó que no venía y al final
// sí va a venir".
export async function undoSessionCancellation({
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

  const db = createAdminClient()
  const { data: cancellation } = await db
    .from('session_cancellations')
    .select('id, recovery_credit_id, student_id')
    .eq('enrollment_id', enrollmentId)
    .eq('class_id', classId)
    .eq('session_date', sessionDate)
    .maybeSingle()

  if (!cancellation) return { error: 'No encontré un aviso de cancelación para esa fecha.' }
  if (cancellation.student_id !== studentId) return { error: 'Ese aviso no te corresponde.' }

  // Si otra persona ya ocupó el lugar liberado, no se puede volver a anotar (la clase quedaría con más gente que el cupo).
  {
    const admin = createAdminClient()
    const [{ data: cls }, { count: enrolledCount }, { count: cancelledCount }, { count: recoveringCount }] = await Promise.all([
      admin.from('classes').select('capacity').eq('id', classId).maybeSingle(),
      admin.from('enrollments').select('id', { count: 'exact', head: true }).eq('class_id', classId).eq('status', 'active'),
      admin.from('session_cancellations').select('id', { count: 'exact', head: true }).eq('class_id', classId).eq('session_date', sessionDate),
      admin
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('session_date', sessionDate)
        .not('recovery_credit_id', 'is', null),
    ])
    const occupancyAfterUndo = (enrolledCount ?? 0) - ((cancelledCount ?? 1) - 1) + (recoveringCount ?? 0)
    if (cls && occupancyAfterUndo > cls.capacity) {
      return { error: 'Ya ocuparon tu lugar en esa clase, así que no se puede deshacer el aviso. Podés usar tu recuperación en otra clase.' }
    }
  }

  if (cancellation.recovery_credit_id) {
    const { data: credit } = await db
      .from('recovery_credits')
      .select('id, status')
      .eq('id', cancellation.recovery_credit_id)
      .maybeSingle()

    if (credit?.status === 'used') {
      return {
        error: 'Ya usó la recuperación de esta cancelación en otra clase. Para deshacer esto, primero hay que resolver esa recuperación.',
      }
    }
    if (credit?.status === 'requested') {
      return {
        error: 'Tiene un pedido de recuperación esperando aprobación para esta cancelación. Resolvelo desde Avisos antes de deshacer esto.',
      }
    }
    if (credit) {
      // Crédito sin usar (available/expired): se descarta, nunca se llegó a usar.
      await db.from('session_cancellations').update({ recovery_credit_id: null }).eq('id', cancellation.id)
      await db.from('recovery_credits').delete().eq('id', credit.id)
    }
  }

  const { error } = await db.from('session_cancellations').delete().eq('id', cancellation.id)
  if (error) return { error: error.message }

  revalidatePath('/alumno')
  revalidatePath(`/admin/alumnos/${studentId}`)
  revalidatePath('/admin/avisos')
  revalidatePath(`/admin/horarios/${classId}`)
  revalidatePath('/admin/horarios')

  return { success: true }
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
    .select('id, status, class_type_id, instructor_id, week_start, week_end, student_id')
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
  if (sessionDate > credit.week_end || sessionDate < credit.week_start) {
    return { error: 'Esa fecha está fuera de la semana en la que podés recuperar.' }
  }

  const { data: targetClass } = await supabase
    .from('classes')
    .select('id, class_type_id, instructor_id, capacity, start_time, day_of_week')
    .eq('id', classId)
    .maybeSingle()

  if (!targetClass) return { error: 'La clase no existe.' }
  if (isInPast(sessionDate, targetClass.start_time)) return { error: 'Esa clase ya empezó.' }
  if (weekdayOf(sessionDate) !== targetClass.day_of_week) return { error: 'Esa fecha no corresponde al día de esa clase.' }
  if (targetClass.class_type_id !== credit.class_type_id) {
    return { error: 'Esa clase es de otro tipo, no coincide con lo que tenés para recuperar.' }
  }
  if (credit.instructor_id && targetClass.instructor_id !== credit.instructor_id) {
    return { error: 'Solo podés recuperar con el mismo profesor que te dio la clase original.' }
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

  // Ni un feriado.
  const { data: holiday } = await admin.from('holidays').select('date').eq('date', sessionDate).maybeSingle()
  if (holiday) return { error: 'Ese día es feriado.' }

  // Esa clase no puede estar cancelada por el estudio ese día.
  const { data: studioCancelled } = await admin
    .from('class_cancellations')
    .select('id')
    .eq('class_id', classId)
    .eq('session_date', sessionDate)
    .maybeSingle()
  if (studioCancelled) return { error: 'Esa clase está cancelada ese día.' }

  // Ni una clase en la que ya tiene su lugar fijo (y no avisó que faltaba).
  const { data: ownEnrollment } = await admin
    .from('enrollments')
    .select('id')
    .eq('class_id', classId)
    .eq('student_id', studentId)
    .eq('status', 'active')
    .maybeSingle()
  if (ownEnrollment) {
    const { data: ownAbsence } = await admin
      .from('session_cancellations')
      .select('id')
      .eq('enrollment_id', ownEnrollment.id)
      .eq('session_date', sessionDate)
      .maybeSingle()
    if (!ownAbsence) return { error: 'Ya tenés tu lugar fijo en esa clase.' }
  }

  // Queda confirmada al instante (sin aprobación del estudio). Se escribe con permisos del servidor
  // porque la alumna no puede insertar asistencia directamente; antes se verificó que el crédito es suyo.
  const { error: attendanceError } = await admin.from('attendance').insert({
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

  const { data: usedCredit, error: creditError } = await admin
    .from('recovery_credits')
    .update({ status: 'used', used_class_id: classId, used_session_date: sessionDate })
    .eq('id', creditId)
    .eq('status', 'available')
    .select('id')
    .maybeSingle()

  if (creditError || !usedCredit) {
    // Si el crédito no se pudo marcar como usado, se deshace la asistencia para no dejar nada a medias.
    await admin.from('attendance').delete().eq('class_id', classId).eq('session_date', sessionDate).eq('student_id', studentId)
    return { error: creditError?.message ?? 'Alguien más ya modificó esta recuperación. Refrescá la página.' }
  }

  const { data: who } = await admin.from('profiles').select('full_name').eq('id', studentId).maybeSingle()
  const when = `${dayDate(sessionDate)} a las ${String(targetClass.start_time).slice(0, 5)}`
  if (auth.actingAdmin) {
    await notifyUsers([studentId], {
      kind: 'recovery_approved',
      title: 'Recuperación confirmada',
      body: `Te anotaron en tu recuperación del ${when}.`,
      url: '/alumno',
      tag: `recovery-${creditId}`,
    })
  } else {
    // El estudio se entera por la campanita y el push (solo informativo, no hay nada que aprobar).
    await notifyAdmins({
      title: 'Recuperación 🔄',
      body: `${who?.full_name ?? 'Una alumna'} recuperó el ${when}.`,
      url: '/admin/avisos',
      tag: `recovery-${creditId}`,
    })
  }

  revalidatePath('/alumno')
  revalidatePath(`/admin/alumnos/${studentId}`)
  revalidatePath('/admin/avisos')
  revalidatePath('/admin/horarios')
  return { success: true }
}

/**
 * Cancela una recuperación ya anotada. Con el plazo de anticipación, la recuperación vuelve a estar disponible
 * (mientras siga en su semana); si es tarde, se pierde. Si lo hace el estudio, siempre vuelve a estar disponible.
 */
export async function cancelRecovery({ studentId, creditId }: { studentId: string; creditId: string }) {
  const auth = await assertSelfOrAdmin(studentId)
  if (!auth.ok) return { error: auth.error }

  const admin = createAdminClient()
  const { data: credit } = await admin
    .from('recovery_credits')
    .select('id, student_id, status, week_end, used_class_id, used_session_date')
    .eq('id', creditId)
    .maybeSingle()

  if (!credit || credit.student_id !== studentId) return { error: 'Esa recuperación no existe.' }
  if (credit.status !== 'used' || !credit.used_class_id || !credit.used_session_date) {
    return { error: 'Esa recuperación no está anotada en ninguna clase.' }
  }

  const classId = credit.used_class_id as string
  const sessionDate = credit.used_session_date as string
  const { data: cls } = await admin.from('classes').select('start_time').eq('id', classId).maybeSingle()
  if (!cls) return { error: 'La clase no existe.' }
  if (isInPast(sessionDate, cls.start_time)) return { error: 'Esa clase ya pasó.' }

  const { data: settings } = await admin.from('studio_settings').select('cancellation_min_hours').maybeSingle()
  const minHours = settings?.cancellation_min_hours ?? 4
  const onTime = auth.actingAdmin || hoursUntil(sessionDate, cls.start_time) >= minHours
  const restore = onTime && (credit.week_end as string) >= todayART()

  const { error: delError } = await admin
    .from('attendance')
    .delete()
    .eq('class_id', classId)
    .eq('session_date', sessionDate)
    .eq('student_id', studentId)
    .eq('recovery_credit_id', creditId)
  if (delError) return { error: delError.message }

  if (restore) {
    await admin
      .from('recovery_credits')
      .update({ status: 'available', used_class_id: null, used_session_date: null })
      .eq('id', creditId)
  }

  const { data: who } = await admin.from('profiles').select('full_name').eq('id', studentId).maybeSingle()
  await notifyAdmins({
    title: 'Recuperación cancelada',
    body: `${who?.full_name ?? 'Una alumna'} canceló su recuperación del ${dayDate(sessionDate)} a las ${String(cls.start_time).slice(0, 5)}.`,
    url: '/admin/avisos',
    tag: `recovery-${creditId}`,
  })
  await notifyFreedSpot(classId, sessionDate)

  revalidatePath('/alumno')
  revalidatePath(`/admin/alumnos/${studentId}`)
  revalidatePath('/admin/avisos')
  revalidatePath('/admin/horarios')
  return { success: true, restored: restore }
}

/**
 * Si una clase estaba completa y se acaba de liberar un lugar, avisa (campanita y push) a quienes tienen una
 * recuperación disponible para ese tipo de clase, con ese profesor, esa semana. Es automático.
 */
async function notifyFreedSpot(classId: string, sessionDate: string) {
  try {
    const admin = createAdminClient()
    const { data: cls } = await admin
      .from('classes')
      .select('capacity, class_type_id, instructor_id, start_time, class_types(name)')
      .eq('id', classId)
      .maybeSingle()
    if (!cls || isInPast(sessionDate, cls.start_time)) return

    const [{ count: enrolled }, { count: cancelled }, { count: recovering }] = await Promise.all([
      admin.from('enrollments').select('id', { count: 'exact', head: true }).eq('class_id', classId).eq('status', 'active'),
      admin.from('session_cancellations').select('id', { count: 'exact', head: true }).eq('class_id', classId).eq('session_date', sessionDate),
      admin
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('session_date', sessionDate)
        .not('recovery_credit_id', 'is', null),
    ])
    const occupancy = (enrolled ?? 0) - (cancelled ?? 0) + (recovering ?? 0)
    // Solo cuando estaba llena y se abrió justo un lugar.
    if (occupancy !== cls.capacity - 1) return

    let q = admin
      .from('recovery_credits')
      .select('id, student_id')
      .eq('status', 'available')
      .eq('class_type_id', cls.class_type_id)
      .lte('week_start', sessionDate)
      .gte('week_end', sessionDate)
    q = cls.instructor_id ? q.or(`instructor_id.is.null,instructor_id.eq.${cls.instructor_id}`) : q
    const { data: waiting } = await q
    if (!waiting || waiting.length === 0) return

    const typeName = (cls.class_types as unknown as { name: string } | null)?.name ?? 'Clase'
    for (const w of waiting) {
      await notifyUsers([w.student_id as string], {
        kind: 'spot_freed',
        title: 'Se liberó un lugar',
        body: `${typeName} del ${dayDate(sessionDate)} a las ${String(cls.start_time).slice(0, 5)}. Elegilo desde tu panel antes de que se ocupe.`,
        url: `/alumno/recuperar/${w.id}`,
        tag: `spot-${classId}-${sessionDate}`,
      })
    }
  } catch {
    // Un aviso que falla no debe romper la acción principal.
  }
}

// Admin agrega una clase EXTRA paga individual (se mantiene por compatibilidad).
export async function addExtraClass({
  studentId,
  classId,
  sessionDate,
}: {
  studentId: string
  classId: string
  sessionDate: string
}) {
  return addExtraClassesBatch({ studentId, selections: [{ classId, sessionDate }] })
}

// Admin agrega una o varias clases EXTRA pagas en una misma tanda.
// Si el alumno NO tiene plan activo, el precio se calcula por escalón según
// la cantidad total elegida en esta tanda (1/2/3/4+). Si tiene plan, se usa
// el precio proporcional de siempre (igual para cada clase de la tanda).
export async function addExtraClassesBatch({
  studentId,
  selections,
}: {
  studentId: string
  selections: { classId: string; sessionDate: string }[]
}) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  if (!selections || selections.length === 0) return { error: 'Elegí al menos una clase.' }

  const [{ data: settings }, { data: subscription }] = await Promise.all([
    supabase
      .from('studio_settings')
      .select('drop_in_class_price, drop_in_price_1, drop_in_price_2, drop_in_price_3, drop_in_price_4_plus')
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('plans(price, classes_per_week)')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .maybeSingle(),
  ])

  const plan = subscription?.plans as unknown as { price: number; classes_per_week: number | null } | null
  const hasPlan = Boolean(plan?.classes_per_week && plan.classes_per_week > 0)

  let unitPrice: number
  if (hasPlan) {
    unitPrice = Math.round((plan!.price / (plan!.classes_per_week! * 4)) * 100) / 100
  } else {
    const count = selections.length
    unitPrice =
      count === 1
        ? settings?.drop_in_price_1 ?? 10000
        : count === 2
          ? settings?.drop_in_price_2 ?? 9000
          : count === 3
            ? settings?.drop_in_price_3 ?? 8000
            : settings?.drop_in_price_4_plus ?? 7000
  }

  for (const sel of selections) {
    const { data: targetClass } = await supabase
      .from('classes')
      .select('id, class_type_id, capacity')
      .eq('id', sel.classId)
      .maybeSingle()

    if (!targetClass) return { error: 'Una de las clases seleccionadas ya no existe.' }

    const [{ count: enrolledCount }, { count: cancelledCount }, { count: recoveringCount }] = await Promise.all([
      supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', sel.classId)
        .eq('status', 'active'),
      supabase
        .from('session_cancellations')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', sel.classId)
        .eq('session_date', sel.sessionDate),
      supabase
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', sel.classId)
        .eq('session_date', sel.sessionDate)
        .not('recovery_credit_id', 'is', null),
    ])

    const occupancy = (enrolledCount ?? 0) - (cancelledCount ?? 0) + (recoveringCount ?? 0)
    if (occupancy >= targetClass.capacity) {
      return { error: `La clase del ${sel.sessionDate} ya está completa.` }
    }

    const { data: credit, error: creditError } = await supabase
      .from('recovery_credits')
      .insert({
        student_id: studentId,
        class_type_id: targetClass.class_type_id,
        week_start: sel.sessionDate,
        week_end: sel.sessionDate,
        status: 'used',
        used_class_id: sel.classId,
        used_session_date: sel.sessionDate,
        is_paid_extra: true,
      })
      .select('id')
      .maybeSingle()

    if (creditError || !credit) return { error: creditError?.message ?? 'No se pudo crear la reserva.' }

    const { error: attendanceError } = await supabase.from('attendance').insert({
      class_id: sel.classId,
      session_date: sel.sessionDate,
      student_id: studentId,
      status: 'recovering',
      recovery_credit_id: credit.id,
    })

    if (attendanceError) {
      if (attendanceError.message.toLowerCase().includes('duplicate')) {
        return { error: `Ya hay una reserva anotada en la clase del ${sel.sessionDate}.` }
      }
      return { error: attendanceError.message }
    }

    const { error: chargeError } = await supabase.from('extra_charges').insert({
      student_id: studentId,
      recovery_credit_id: credit.id,
      description: hasPlan
        ? `Clase extra — ${sel.sessionDate}`
        : `Clase suelta (${selections.length}) — ${sel.sessionDate}`,
      amount: unitPrice,
    })

    if (chargeError) return { error: chargeError.message }
  }

  revalidatePath(`/admin/alumnos/${studentId}`)
  revalidatePath('/alumno')
  return { success: true, unitPrice, count: selections.length }
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

  const { data: approvedClass } = await supabase
    .from('classes')
    .select('start_time')
    .eq('id', credit.requested_class_id)
    .maybeSingle()
  await notifyUsers([credit.student_id], {
    kind: 'recovery_approved',
    title: 'Recuperación aprobada',
    body: `Tu recuperación del ${dayDate(credit.requested_session_date)}${approvedClass ? ` a las ${String(approvedClass.start_time).slice(0, 5)}` : ''} quedó confirmada.`,
    url: '/alumno',
    tag: `recovery-${creditId}`,
  })

  revalidatePath('/admin/avisos')
  revalidatePath('/alumno')
  return { success: true }
}

// Admin rechaza el horario solicitado: vuelve a "available" para que el alumno elija otro.
export async function rejectRecoveryRequest(creditId: string) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  const { data: rejected } = await supabase.from('recovery_credits').select('student_id').eq('id', creditId).maybeSingle()

  const { error } = await supabase
    .from('recovery_credits')
    .update({ status: 'available', requested_class_id: null, requested_session_date: null })
    .eq('id', creditId)
    .eq('status', 'requested')

  if (error) return { error: error.message }

  if (rejected?.student_id) {
    await notifyUsers([rejected.student_id as string], {
      kind: 'recovery_rejected',
      title: 'Recuperación',
      body: 'El estudio no pudo aprobar el horario que pediste. Elegí otro desde tu panel.',
      url: '/alumno',
      tag: `recovery-${creditId}`,
    })
  }

  revalidatePath('/admin/avisos')
  revalidatePath('/alumno')
  return { success: true }
}

// Admin cancela una clase ENTERA de un día puntual (ej: no hay instructor ese jueves).
// A cada alumno anotado se le genera crédito de recuperación automático (igual que si
// hubiese cancelado individualmente), y se dispara un aviso automático a esa clase/fecha.
export async function cancelClassOccurrence({
  classId,
  sessionDate,
  reason,
}: {
  classId: string
  sessionDate: string
  reason?: string
}) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase, userId } = auth

  const { data: classInfo } = await supabase
    .from('classes')
    .select('id, class_type_id, instructor_id, class_types(name)')
    .eq('id', classId)
    .maybeSingle()

  if (!classInfo) return { error: 'La clase no existe.' }

  const { data: cancellation, error: cancelError } = await supabase
    .from('class_cancellations')
    .insert({
      class_id: classId,
      session_date: sessionDate,
      reason: reason || null,
      cancelled_by: userId,
    })
    .select('id')
    .maybeSingle()

  if (cancelError) {
    if (cancelError.message.toLowerCase().includes('duplicate')) {
      return { error: 'Esa clase ya estaba cancelada para esa fecha.' }
    }
    return { error: cancelError.message }
  }
  if (!cancellation) return { error: 'No se pudo cancelar la clase.' }

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, student_id')
    .eq('class_id', classId)
    .eq('status', 'active')

  const sessionDateObj = new Date(`${sessionDate}T00:00:00`)
  const monday = getMonday(sessionDateObj)
  const sunday = getSunday(monday)

  for (const e of enrollments ?? []) {
    const { data: sc } = await supabase
      .from('session_cancellations')
      .insert({
        enrollment_id: e.id,
        student_id: e.student_id,
        class_id: classId,
        session_date: sessionDate,
        within_deadline: true,
      })
      .select('id')
      .maybeSingle()

    // Si el alumno ya se había avisado individualmente ese día, no duplicamos el crédito.
    if (!sc) continue

    const { data: credit } = await supabase
      .from('recovery_credits')
      .insert({
        student_id: e.student_id,
        source_cancellation_id: sc.id,
        class_type_id: classInfo.class_type_id,
        instructor_id: classInfo.instructor_id,
        week_start: toISODate(monday),
        week_end: toISODate(sunday),
        status: 'available',
      })
      .select('id')
      .maybeSingle()

    if (credit) {
      await supabase.from('session_cancellations').update({ recovery_credit_id: credit.id }).eq('id', sc.id)
    }
  }

  const className = (classInfo as unknown as { class_types: { name: string } | null }).class_types?.name ?? 'la clase'
  const dateLabel = sessionDateObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })

  await supabase.from('announcements').insert({
    message: `Se canceló la clase de ${className} del ${dateLabel}. Si estabas anotado, ya tenés una recuperación disponible para agendar en tu horario.`,
    expires_at: sessionDate,
    created_by: userId,
    target_type: 'class',
    target_class_id: classId,
    target_date: sessionDate,
  })

  await notifyUsers((enrollments ?? []).map((e) => e.student_id as string), {
    kind: 'class_cancelled',
    title: 'Clase cancelada',
    body: `Se canceló la clase de ${className} del ${dateLabel}. Ya tenés una recuperación disponible.`,
    url: '/alumno',
    tag: `class-cancel-${classId}-${sessionDate}`,
  })

  revalidatePath('/admin/horarios')
  revalidatePath(`/admin/horarios/${classId}`)
  revalidatePath('/alumno')
  revalidatePath('/admin/avisos')

  return { success: true }
}

// Admin deshace la cancelación de una fecha puntual (por si fue un error).
// No revierte créditos ya usados por el alumno, solo saca la marca de "Cancelada".
export async function uncancelClassOccurrence({
  classId,
  sessionDate,
}: {
  classId: string
  sessionDate: string
}) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const { supabase } = auth

  const { error } = await supabase
    .from('class_cancellations')
    .delete()
    .eq('class_id', classId)
    .eq('session_date', sessionDate)

  if (error) return { error: error.message }

  revalidatePath('/admin/horarios')
  revalidatePath(`/admin/horarios/${classId}`)
  revalidatePath('/alumno')
  return { success: true }
}
