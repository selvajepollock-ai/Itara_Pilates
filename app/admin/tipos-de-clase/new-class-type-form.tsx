'use client'

import { useRef, useState, useTransition } from 'react'
import { createClassType } from '../horarios/actions'

export function NewClassTypeForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createClassType(formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      formRef.current?.reset()
    })
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-sand bg-white/50 p-5"
    >
      <div className="flex-1">
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
          Nombre nuevo tipo
        </label>
        <input
          name="name"
          required
          placeholder="Ej: Barre"
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
        />
      </div>
      <div className="flex-1">
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
          Descripción (opcional)
        </label>
        <input
          name="description"
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-white transition hover:bg-moss-dark disabled:opacity-50"
      >
        {isPending ? 'Agregando...' : '+ Agregar'}
      </button>
      {error && <p className="w-full text-sm text-clay">{error}</p>}
    </form>
  )
}
