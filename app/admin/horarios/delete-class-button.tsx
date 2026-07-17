'use client'

import { useTransition } from 'react'
import { deleteClass } from './actions'

export function DeleteClassButton({ classId }: { classId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('¿Eliminar esta clase del horario? Esta acción no se puede deshacer.')) return
    startTransition(() => {
      deleteClass(classId)
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="font-medium text-clay hover:text-clay/70 disabled:opacity-50"
    >
      {isPending ? '...' : 'Eliminar'}
    </button>
  )
}
