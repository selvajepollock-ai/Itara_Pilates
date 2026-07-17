'use client'

import { useState, useTransition } from 'react'
import { Pencil, EyeOff, Eye } from 'lucide-react'
import { updateClassType, setClassTypeActive } from '../horarios/actions'

type ClassType = {
  id: string
  name: string
  description: string | null
  active: boolean
}

export function ClassTypeRow({ classType }: { classType: ClassType }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSave(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await updateClassType(classType.id, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setIsEditing(false)
    })
  }

  function handleToggleActive() {
    const label = classType.active ? 'desactivar' : 'reactivar'
    if (!confirm(`¿Querés ${label} "${classType.name}"?`)) return
    startTransition(() => {
      setClassTypeActive(classType.id, !classType.active)
    })
  }

  if (isEditing) {
    return (
      <li className="px-5 py-4">
        <form action={handleSave} className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
              Nombre
            </label>
            <input
              name="name"
              defaultValue={classType.name}
              required
              className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2 text-sm text-ink outline-none focus:border-moss focus:bg-white"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
              Descripción
            </label>
            <input
              name="description"
              defaultValue={classType.description ?? ''}
              className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2 text-sm text-ink outline-none focus:border-moss focus:bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-moss px-4 py-2 text-xs font-medium text-white hover:bg-moss-dark disabled:opacity-50"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-full border border-sand px-4 py-2 text-xs font-medium text-ink/60 hover:border-moss hover:text-moss"
          >
            Cancelar
          </button>
          {error && <p className="w-full text-sm text-clay">{error}</p>}
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between px-5 py-4">
      <div className={classType.active ? '' : 'opacity-40'}>
        <p className="font-display text-lg italic text-ink">
          {classType.name}
          {!classType.active && <span className="ml-2 text-xs not-italic text-ink/40">(inactivo)</span>}
        </p>
        {classType.description && (
          <p className="mt-0.5 text-sm text-ink/60">{classType.description}</p>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs">
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1 font-medium text-moss hover:text-moss-dark"
        >
          <Pencil size={13} strokeWidth={2} />
          Editar
        </button>
        <button
          onClick={handleToggleActive}
          disabled={isPending}
          className="flex items-center gap-1 font-medium text-clay hover:text-clay/70 disabled:opacity-50"
        >
          {classType.active ? (
            <>
              <EyeOff size={13} strokeWidth={2} />
              Desactivar
            </>
          ) : (
            <>
              <Eye size={13} strokeWidth={2} />
              Reactivar
            </>
          )}
        </button>
      </div>
    </li>
  )
}
