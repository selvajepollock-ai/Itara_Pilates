'use client'

import { useState, useTransition } from 'react'
import { markAttendance } from '@/app/actions/attendance'

export function AttendanceToggle({
  classId,
  sessionDate,
  studentId,
  enrollmentId,
  recoveryCreditId,
  initialStatus,
}: {
  classId: string
  sessionDate: string
  studentId: string
  enrollmentId?: string | null
  recoveryCreditId?: string | null
  initialStatus: string | null
}) {
  const [status, setStatus] = useState(initialStatus)
  const [isPending, startTransition] = useTransition()

  function handleMark(newStatus: 'present' | 'absent') {
    const next = status === newStatus ? null : newStatus
    startTransition(async () => {
      if (!next) return // no hay "des-marcar" en el schema, solo alternar entre presente/ausente
      setStatus(next)
      await markAttendance({
        classId,
        sessionDate,
        studentId,
        status: next,
        enrollmentId,
        recoveryCreditId,
      })
    })
  }

  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => handleMark('present')}
        disabled={isPending}
        className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
          status === 'present'
            ? 'bg-moss text-white'
            : 'border border-sand text-ink/50 hover:border-moss hover:text-moss'
        }`}
      >
        Presente
      </button>
      <button
        onClick={() => handleMark('absent')}
        disabled={isPending}
        className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
          status === 'absent'
            ? 'bg-clay text-white'
            : 'border border-sand text-ink/50 hover:border-clay hover:text-clay'
        }`}
      >
        Ausente
      </button>
    </div>
  )
}
