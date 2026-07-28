'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pause, Play } from 'lucide-react'
import { setStudentActive } from './actions'

export function ToggleStudentActiveButton({ studentId, active }: { studentId: string; active: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const label = active ? 'dar de baja temporalmente' : 'reactivar'
    if (!confirm(`¿Querés ${label} a este alumno?`)) return

    startTransition(async () => {
      await setStudentActive(studentId, !active)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="flex items-center gap-1.5 text-xs font-medium text-ink/60 hover:text-moss disabled:opacity-50"
    >
      {active ? (
        <>
          <Pause size={13} strokeWidth={2} /> Dar de baja
        </>
      ) : (
        <>
          <Play size={13} strokeWidth={2} /> Reactivar
        </>
      )}
    </button>
  )
}
