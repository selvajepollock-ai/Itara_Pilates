'use client'

import { useState, useTransition } from 'react'
import { updateStudent } from './actions'

type Student = { id: string; full_name: string; email: string; phone: string | null }

export function EditStudentForm({ student }: { student: Student }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateStudent(student.id, formData)
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
          defaultValue={student.full_name}
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
        />
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Email</label>
        <input
          type="email"
          name="email"
          required
          defaultValue={student.email}
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
        />
        <p className="mt-1 text-xs text-ink/40">Si lo cambiás, va a tener que usar el mail nuevo para entrar.</p>
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Teléfono</label>
        <input
          name="phone"
          defaultValue={student.phone ?? ''}
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
        />
      </div>

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
