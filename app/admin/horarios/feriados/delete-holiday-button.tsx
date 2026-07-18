'use client'

import { useTransition } from 'react'
import { deleteHoliday } from '../actions'

export function DeleteHolidayButton({ holidayId }: { holidayId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('¿Eliminar este feriado?')) return
    startTransition(() => {
      deleteHoliday(holidayId)
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-xs font-medium text-clay hover:text-clay/70 disabled:opacity-50"
    >
      {isPending ? '...' : 'Eliminar'}
    </button>
  )
}
