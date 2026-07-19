'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function markAttendance({
  classId,
  sessionDate,
  studentId,
  status,
  enrollmentId,
  recoveryCreditId,
}: {
  classId: string
  sessionDate: string
  studentId: string
  status: 'present' | 'absent'
  enrollmentId?: string | null
  recoveryCreditId?: string | null
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado.' }

  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).single()
  const roles: string[] = profile?.roles ?? []

  if (!roles.includes('admin')) {
    const { data: classInfo } = await supabase
      .from('classes')
      .select('instructor_id')
      .eq('id', classId)
      .single()
    if (classInfo?.instructor_id !== user.id) {
      return { error: 'No tenés permisos para esta clase.' }
    }
  }

  const { error } = await supabase.from('attendance').upsert(
    {
      class_id: classId,
      session_date: sessionDate,
      student_id: studentId,
      status,
      enrollment_id: enrollmentId ?? null,
      recovery_credit_id: recoveryCreditId ?? null,
      marked_by: user.id,
      marked_at: new Date().toISOString(),
    },
    { onConflict: 'class_id,session_date,student_id' }
  )

  if (error) return { error: error.message }

  revalidatePath(`/instructor/clases/${classId}`)
  return { success: true }
}
