'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { bookRecovery } from '@/app/actions/recovery'

export function BookRecoveryButton({
  studentId,
  creditId,
  classId,
  sessionDate,
  redirectTo = '/alumno',
}: {
  studentId: string
  creditId: string
  classId: string
  sessionDate: string
  redirectTo?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleBook() {
    setError(null)
    startTransition(async () => {
      const res = await bookRecovery({ studentId, creditId, classId, sessionDate })
      if (res?.error) {
        setError(res.error)
        return
      }
      router.push(redirectTo)
      router.refresh()
    })
  }

  return (
    <div>
      <button
        onClick={handleBook}
        disabled={isPending}
        className="rounded-full bg-moss px-4 py-2 text-xs font-medium text-white hover:bg-moss-dark disabled:opacity-50"
      >
        {isPending ? 'Anotando...' : 'Anotarme acá'}
      </button>
      {error && <p className="mt-1 text-xs text-clay">{error}</p>}
    </div>
  )
}
