'use client'

import { useState, useTransition } from 'react'
import { DAY_NAMES } from '@/lib/day-names'

type ClassType = { id: string; name: string }
type Instructor = { id: string; full_name: string }

type ClassFormValues = {
  class_type_id?: string
  instructor_id?: string
  room?: string
  day_of_week?: number
  start_time?: string
  end_time?: string
  capacity?: number
}

export function ClassForm({
  classTypes,
  instructors,
  initialValues,
  submitLabel,
  action,
}: {
  classTypes: ClassType[]
  instructors: Instructor[]
  initialValues?: ClassFormValues
  submitLabel: string
  action: (formData: FormData) => Promise<{ error?: string } | undefined>
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await action(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form action={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-sand bg-white p-6">
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
          Tipo de clase
        </label>
        <select
          name="class_type_id"
          required
          defaultValue={initialValues?.class_type_id ?? ''}
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
        >
          <option value="" disabled>
            Elegir...
          </option>
          {classTypes.map((ct) => (
            <option key={ct.id} value={ct.id}>
              {ct.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
          Instructor
        </label>
        <select
          name="instructor_id"
          defaultValue={initialValues?.instructor_id ?? ''}
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
        >
          <option value="">Sin asignar</option>
          {instructors.map((i) => (
            <option key={i.id} value={i.id}>
              {i.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Día</label>
          <select
            name="day_of_week"
            required
            defaultValue={initialValues?.day_of_week ?? 1}
            className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
          >
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <option key={d} value={d}>
                {DAY_NAMES[d]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
            Cupo máximo
          </label>
          <input
            type="number"
            name="capacity"
            min={1}
            required
            defaultValue={initialValues?.capacity ?? 8}
            className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
            Hora inicio
          </label>
          <input
            type="time"
            name="start_time"
            required
            defaultValue={initialValues?.start_time ?? ''}
            className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
            Hora fin
          </label>
          <input
            type="time"
            name="end_time"
            required
            defaultValue={initialValues?.end_time ?? ''}
            className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Sala</label>
        <input
          name="room"
          defaultValue={initialValues?.room ?? 'Sala principal'}
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
        />
      </div>

      {error && <p className="text-sm text-clay">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-moss px-4 py-2.5 text-sm font-medium text-white transition hover:bg-moss-dark disabled:opacity-50"
      >
        {isPending ? 'Guardando...' : submitLabel}
      </button>
    </form>
  )
}
