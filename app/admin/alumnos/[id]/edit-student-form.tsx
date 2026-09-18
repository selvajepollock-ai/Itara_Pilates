'use client'

import { useState, useTransition } from 'react'
import { updateStudent } from './actions'
import { PhoneInput } from '@/app/components/phone-input'

type Student = {
  id: string
  full_name: string
  nickname: string | null
  email: string
  phone: string | null
  birth_date: string | null
  health_notes: string | null
}

export function EditStudentForm({ student }: { student: Student }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [birthDate, setBirthDate] = useState(student.birth_date ?? '')

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
      setDirty(false)
    })
  }

  return (
    <form
      action={handleSubmit}
      onChange={() => setDirty(true)}
      className="space-y-5"
    >
      <p className="section-title">Datos personales</p>

      <div className="grid gap-5 sm:grid-cols-2">
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
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
            Apodo / nombre de pila (opcional)
          </label>
          <input
            name="nickname"
            defaultValue={student.nickname ?? ''}
            placeholder="Ej: Vale, Cami, Toti..."
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
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Teléfono</label>
          <div className="mt-1.5">
            <PhoneInput name="phone" defaultValue={student.phone ?? ''} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
            Fecha de nacimiento
          </label>
          <input
            type="date"
            name="birth_date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
          />
          {birthDate && (
            <p className="mt-1 text-xs text-ink/40">
              Vas a guardar:{' '}
              <span className="font-medium text-ink/60">
                {new Date(`${birthDate}T00:00:00`).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
            Salud / Patologías
          </label>
          <textarea
            name="health_notes"
            rows={1}
            defaultValue={student.health_notes ?? ''}
            placeholder="Ej: Lesión de rodilla derecha, evitar impacto"
            className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
          />
        </div>
      </div>

      <p className="text-xs text-ink/40">
        Si cambiás el email, va a tener que usar el nuevo para entrar. El apodo también sirve para
        buscarlo en el listado de Alumnos.
      </p>

      {error && <p className="text-sm text-clay">{error}</p>}
      {saved && <p className="text-sm text-moss-dark">Guardado ✓</p>}

      <button
        type="submit"
        disabled={isPending || !dirty}
        className="btn-primary"
      >
        {isPending ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  )
}
