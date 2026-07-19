import { createClient } from '@/lib/supabase/server'
import { AttendanceToggle } from './attendance-toggle'

type RosterPerson = {
  studentId: string
  fullName: string
  kind: 'fijo' | 'recupera'
  enrollmentId: string | null
  recoveryCreditId: string | null
  status: string | null
}

export async function ClassRoster({ classId, sessionDate }: { classId: string; sessionDate: string }) {
  const supabase = await createClient()

  const [{ data: enrollments }, { data: cancellations }, { data: recovering }, { data: attendanceRows }] =
    await Promise.all([
      supabase
        .from('enrollments')
        .select('id, student_id, profiles(full_name)')
        .eq('class_id', classId)
        .eq('status', 'active'),
      supabase
        .from('session_cancellations')
        .select('enrollment_id')
        .eq('class_id', classId)
        .eq('session_date', sessionDate),
      supabase
        .from('attendance')
        .select('id, student_id, recovery_credit_id, status, profiles(full_name)')
        .eq('class_id', classId)
        .eq('session_date', sessionDate)
        .not('recovery_credit_id', 'is', null),
      supabase
        .from('attendance')
        .select('student_id, status')
        .eq('class_id', classId)
        .eq('session_date', sessionDate),
    ])

  const cancelledEnrollmentIds = new Set((cancellations ?? []).map((c) => c.enrollment_id))
  const statusByStudent = new Map((attendanceRows ?? []).map((a) => [a.student_id, a.status]))

  const roster: RosterPerson[] = []

  for (const e of enrollments ?? []) {
    if (cancelledEnrollmentIds.has(e.id)) continue
    roster.push({
      studentId: e.student_id,
      fullName: (e.profiles as unknown as { full_name: string } | null)?.full_name ?? 'Alumno',
      kind: 'fijo',
      enrollmentId: e.id,
      recoveryCreditId: null,
      status: statusByStudent.get(e.student_id) ?? null,
    })
  }

  for (const r of recovering ?? []) {
    roster.push({
      studentId: r.student_id,
      fullName: (r.profiles as unknown as { full_name: string } | null)?.full_name ?? 'Alumno',
      kind: 'recupera',
      enrollmentId: null,
      recoveryCreditId: r.recovery_credit_id,
      status: r.status,
    })
  }

  roster.sort((a, b) => a.fullName.localeCompare(b.fullName))

  if (roster.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-sand bg-white/50 px-5 py-8 text-center text-sm text-ink/40">
        No hay alumnos anotados en esta clase para esta fecha.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-sand/60 rounded-2xl border border-sand bg-white">
      {roster.map((p) => (
        <li key={p.studentId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-medium text-ink">
              {p.fullName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-ink">{p.fullName}</p>
              {p.kind === 'recupera' && (
                <p className="text-xs text-clay">Recupera clase</p>
              )}
            </div>
          </div>
          <AttendanceToggle
            classId={classId}
            sessionDate={sessionDate}
            studentId={p.studentId}
            enrollmentId={p.enrollmentId}
            recoveryCreditId={p.recoveryCreditId}
            initialStatus={p.status}
          />
        </li>
      ))}
    </ul>
  )
}
