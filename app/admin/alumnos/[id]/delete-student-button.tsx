'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteStudent } from './actions'

export function DeleteStudentButton({ studentId, fullName }: { studentId: string; fullName: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    const confirmText = prompt(
      `Esto borra a "${fullName}" y todo su historial (horario, cuota, cancelaciones). No se puede deshacer.\n\nEscribí ELIMINAR para confirmar:`
    )
    if (confirmText !== 'ELIMINAR') return

    setError(null)
    startTransition(async () => {
      const result = await deleteStudent(studentId)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.push('/admin/alumnos')
      router.refresh()
    })
  }

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs font-medium text-clay hover:text-clay/70 disabled:opacity-50"
      >
        <Trash2 size={13} strokeWidth={2} />
        {isPending ? 'Eliminando...' : 'Eliminar alumno'}
      </button>
      {error && <p className="mt-1 text-xs text-clay">{error}</p>}
    </div>
  )
}
