'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createStudent } from '../actions'
import { formatARS } from '@/lib/currency'
import { PhoneInput } from '@/app/components/phone-input'

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
  const [grantAccess, setGrantAccess] = useState(true)

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

  const inputClass =
    'mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white'
  const labelClass = 'text-xs font-medium uppercase tracking-wide text-ink/60'
  const cardClass = 'rounded-2xl border border-sand bg-white p-6'

  return (
    <div className="max-w-4xl">
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Alumnos</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">Nuevo alumno</h1>

      <form action={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className={`${cardClass} lg:col-span-2`}>
          <p className="text-sm font-medium text-ink">Acceso al portal</p>
          <p className="mt-0.5 text-xs text-ink/50">
            Si no le das acceso ahora, igual queda cargado — se lo podés activar después desde su ficha.
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              name="grant_access"
              checked={grantAccess}
              onChange={(e) => setGrantAccess(e.target.checked)}
              className="h-4 w-4 rounded border-sand accent-moss"
            />
            Darle acceso a la app ahora (le llega un mail para crear su contraseña)
          </label>
        </div>

        <div className={cardClass}>
          <p className="text-sm font-medium text-ink">Identidad</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nombre</label>
              <input name="first_name" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Apellido</label>
              <input name="last_name" required className={inputClass} />
            </div>
          </div>
          <div className="mt-3">
            <label className={labelClass}>
              Email {grantAccess ? '' : '(opcional)'}
            </label>
            <input type="email" name="email" required={grantAccess} className={inputClass} />
          </div>
          <div className="mt-3">
            <label className={labelClass}>Apodo / nombre de pila (opcional)</label>
            <input name="nickname" placeholder="Ej: Vale, Cami, Toti..." className={inputClass} />
          </div>
        </div>

        <div className={cardClass}>
          <p className="text-sm font-medium text-ink">Datos personales</p>
          <div className="mt-3">
            <label className={labelClass}>Teléfono</label>
            <div className="mt-1.5">
              <PhoneInput name="phone" defaultValue="" />
            </div>
          </div>
          <div className="mt-3">
            <label className={labelClass}>Fecha de nacimiento</label>
            <input type="date" name="birth_date" className={inputClass} />
          </div>
        </div>

        <div className={cardClass}>
          <p className="text-sm font-medium text-ink">Salud</p>
          <p className="mt-0.5 text-xs text-ink/50">Lesiones, condiciones a tener en cuenta.</p>
          <textarea
            name="health_notes"
            rows={3}
            placeholder="Ej: Lesión de rodilla derecha, evitar impacto"
            className={`${inputClass} mt-3`}
          />
        </div>

        <div className={cardClass}>
          <p className="text-sm font-medium text-ink">Plan contratado</p>
          <div className="mt-3">
            <label className={labelClass}>Plan (opcional)</label>
            <select name="plan_id" defaultValue="" className={inputClass}>
              <option value="">Sin asignar todavía</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatARS(p.price)}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <label className={labelClass}>Pagado hasta</label>
            <input type="date" name="end_date" defaultValue={defaultEndDate} className={inputClass} />
          </div>
        </div>

        <div className="lg:col-span-2">
          {error && <p className="text-sm text-clay">{error}</p>}
          {success && <p className="text-sm text-moss-dark">Alumno creado correctamente ✓</p>}

          <button
            type="submit"
            disabled={isPending}
            className="mt-3 w-full rounded-full bg-moss px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 lg:w-auto lg:px-10"
          >
            {isPending ? 'Creando...' : 'Crear alumno'}
          </button>
        </div>
      </form>
    </div>
  )
}
