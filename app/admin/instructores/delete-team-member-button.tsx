'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteTeamMember } from './actions'

export function DeleteTeamMemberButton({ personId, fullName }: { personId: string; fullName: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    if (!confirm(`¿Eliminar a ${fullName} del equipo? Esta acción no se puede deshacer.`)) return
    setError(null)
    startTransition(async () => {
      const result = await deleteTeamMember(personId)
      if (result?.error) {
        setError(result.error)
        alert(result.error)
      }
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title="Eliminar"
      className="flex items-center gap-1 text-xs font-medium text-clay hover:text-clay/70 disabled:opacity-50"
    >
      <Trash2 size={13} strokeWidth={2} />
      {isPending ? '...' : 'Eliminar'}
    </button>
  )
}
