'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { undoSessionCancellation } from '@/app/actions/recovery'

export function UndoCancellationButton({
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
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const res = await undoSessionCancellation({ studentId, enrollmentId, classId, sessionDate })
      if (res?.error) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        title="Deshace el aviso de cancelación (si al final sí viene), sin cargarle una clase paga"
        className="flex items-center gap-1 text-[11px] font-medium text-moss hover:text-moss-dark disabled:opacity-50"
      >
        <RotateCcw size={11} strokeWidth={2.5} />
        {isPending ? 'Deshaciendo...' : 'Deshacer cancelación'}
      </button>
      {error && <span className="max-w-[160px] text-right text-[10px] text-clay">{error}</span>}
    </span>
  )
}
