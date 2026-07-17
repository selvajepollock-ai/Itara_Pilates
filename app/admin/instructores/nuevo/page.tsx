'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createInstructor } from '../actions'

export default function NuevoInstructorPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createInstructor(formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSuccess(true)
      setTimeout(() => router.push('/admin/instructores'), 1500)
    })
  }

  return (
    <div className="max-w-md">
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Instructores</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">Nuevo instructor</h1>
      <p className="mt-2 text-sm text-ink/60">
        Vos elegís el usuario y la contraseña, y se los pasás a la instructora por el medio que prefieras (no se manda ningún email).
      </p>

      <form action={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-sand bg-white p-6">
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
            Nombre completo
          </label>
          <input
            name="full_name"
            required
            className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
          />
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
            Usuario (sin espacios)
          </label>
          <input
            name="username"
            required
            placeholder="ej: caro"
            className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
          />
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
            Contraseña
          </label>
          <input
            type="text"
            name="password"
            required
            minLength={6}
            placeholder="mínimo 6 caracteres"
            className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
          />
          <p className="mt-1 text-xs text-ink/40">
            Se muestra en texto plano a propósito, para que se la copies fácil.
          </p>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
            Teléfono (opcional)
          </label>
          <input
            name="phone"
            className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" name="also_admin" className="h-4 w-4 rounded border-sand accent-moss" />
          También es dueño/admin del estudio
        </label>

        {error && <p className="text-sm text-clay">{error}</p>}
        {success && <p className="text-sm text-moss-dark">Instructor creado correctamente ✓</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-moss px-4 py-2.5 text-sm font-medium text-white transition hover:bg-moss-dark disabled:opacity-50"
        >
          {isPending ? 'Creando...' : 'Crear instructor'}
        </button>
      </form>
    </div>
  )
}
