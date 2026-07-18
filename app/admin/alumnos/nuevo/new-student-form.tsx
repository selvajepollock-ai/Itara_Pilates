'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createStudent } from '../actions'
import { formatARS } from '@/lib/currency'

type Plan = { id: string; name: string; price: number }

export function NewStudentForm({
  plans,
  defaultEndDate,
}: {
  plans: Plan[]
  defaultEndDate: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createStudent(formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSuccess(true)
      setTimeout(() => router.push('/admin/alumnos'), 1200)
    })
  }

  return (
    <div className="max-w-md">
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Alumnos</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">Nuevo alumno</h1>
      <p className="mt-2 text-sm text-ink/60">
        Se le va a enviar un email de invitación para que cree su propia contraseña.
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
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Email</label>
          <input
            type="email"
            name="email"
            required
            className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
          />
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

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
            Fecha de nacimiento (opcional)
          </label>
          <input
            type="date"
            name="birth_date"
            className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
          />
        </div>

        <div className="border-t border-sand pt-5">
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
            Plan contratado (opcional)
          </label>
          <select
            name="plan_id"
            defaultValue=""
            className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
          >
            <option value="">Sin asignar todavía</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatARS(p.price)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
            Pagado hasta
          </label>
          <input
            type="date"
            name="end_date"
            defaultValue={defaultEndDate}
            className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
          />
          <p className="mt-1 text-xs text-ink/40">Solo se usa si elegiste un plan arriba.</p>
        </div>

        {error && <p className="text-sm text-clay">{error}</p>}
        {success && <p className="text-sm text-moss-dark">Alumno invitado correctamente ✓</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-moss px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? 'Enviando invitación...' : 'Invitar alumno'}
        </button>
      </form>
    </div>
  )
}
