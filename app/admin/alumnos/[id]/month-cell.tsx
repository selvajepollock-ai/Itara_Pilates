'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelSession } from '@/app/actions/recovery'
import { formatTime } from '@/lib/day-names'

type FixedClass = {
  enrollmentId: string
  classId: string
  typeName: string
  startTime: string
  cancelled: boolean
}

type Recovered = {
  typeName: string
  startTime: string
}

export function MonthCell({
  studentId,
  date,
  dateISO,
  inMonth,
  past,
  fixedClass,
  recovered,
}: {
  studentId: string
  date: number
  dateISO: string
  inMonth: boolean
  past: boolean
  fixedClass?: FixedClass
  recovered?: Recovered
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleCancel() {
    if (!fixedClass) return
    if (!confirm(`¿Cancelar la clase del ${date} (${fixedClass.typeName} ${formatTime(fixedClass.startTime)})?`))
      return
    setError(null)
    startTransition(async () => {
      const res = await cancelSession({
        studentId,
        enrollmentId: fixedClass.enrollmentId,
        classId: fixedClass.classId,
        sessionDate: dateISO,
      })
      if (res?.error) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  if (!inMonth) {
    return <div className="h-16 rounded-md" />
  }

  const isCancelled = fixedClass?.cancelled

  return (
    <div className="relative">
      <button
        type="button"
        disabled={!fixedClass || isCancelled || isPending || past}
        onClick={handleCancel}
        title={fixedClass ? `${fixedClass.typeName} ${formatTime(fixedClass.startTime)} — click para cancelar` : ''}
        className={`flex h-16 w-full flex-col items-center justify-center rounded-md border text-[10px] transition ${
          isCancelled
            ? 'border-sand bg-sand/40 text-ink/30 line-through'
            : fixedClass
              ? past
                ? 'border-moss/20 bg-moss/40 text-white/90'
                : 'border-moss/30 bg-moss text-white hover:bg-moss-dark'
              : 'border-sand/50 bg-linen/30 text-ink/25'
        } ${isPending ? 'opacity-50' : ''}`}
      >
        <span className="font-medium">{date}</span>
        {fixedClass && <span className="mt-0.5">{formatTime(fixedClass.startTime)}</span>}
      </button>
      {recovered && (
        <div
          title={`Recuperación: ${recovered.typeName} ${formatTime(recovered.startTime)}`}
          className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-moss text-[8px] text-white"
        >
          ✓
        </div>
      )}
      {error && (
        <p className="absolute left-0 top-full z-10 mt-1 w-32 text-[10px] text-clay">{error}</p>
      )}
    </div>
  )
}
