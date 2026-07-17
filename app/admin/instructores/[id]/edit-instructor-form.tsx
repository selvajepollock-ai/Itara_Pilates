'use client'

import { useState, useTransition } from 'react'
import { updateInstructor } from './actions'

type Instructor = {
  id: string
  full_name: string
  username: string | null
  phone: string | null
  roles: string[]
}

export function EditInstructorForm({ instructor }: { instructor: Instructor }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateInstructor(instructor.id, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSaved(true)
    })
  }

  return (
    <form action={handleSubmit} className="mt-6 space-y-5 rounded-2xl border border-sand bg-white p-6">
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
          Nombre completo
        </label>
        <input
          name="full_name"
          required
          defaultValue={instructor.full_name}
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
        />
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
          Usuario
        </label>
        <input
          name="username"
          required
          defaultValue={instructor.username ?? ''}
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
        />
        <p className="mt-1 text-xs text-ink/40">Si lo cambiás, va a tener que usar el usuario nuevo para entrar.</p>
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Teléfono</label>
        <input
          name="phone"
          defaultValue={instructor.phone ?? ''}
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink/70">
        <input
          type="checkbox"
          name="also_admin"
          defaultChecked={instructor.roles?.includes('admin')}
          className="h-4 w-4 rounded border-sand accent-moss"
        />
        También es dueño/admin del estudio
      </label>

      {error && <p className="text-sm text-clay">{error}</p>}
      {saved && <p className="text-sm text-moss-dark">Guardado ✓</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-white transition hover:bg-moss-dark disabled:opacity-50"
      >
        {isPending ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  )
}
