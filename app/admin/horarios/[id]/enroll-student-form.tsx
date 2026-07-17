'use client'

import { useRef, useState, useTransition } from 'react'
import { enrollStudent } from '../actions'

export function EnrollStudentForm({
  classId,
  students,
}: {
  classId: string
  students: { id: string; full_name: string }[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await enrollStudent(classId, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      formRef.current?.reset()
    })
  }

  if (students.length === 0) {
    return (
      <p className="mt-3 rounded-2xl border border-dashed border-sand bg-white/50 px-5 py-6 text-center text-sm text-ink/50">
        Todos los alumnos ya están anotados, o todavía no hay alumnos cargados.
      </p>
    )
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="mt-3 flex flex-wrap items-end gap-3 rounded-2xl border border-sand bg-white p-5"
    >
      <div className="flex-1">
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Alumno</label>
        <select
          name="student_id"
          required
          defaultValue=""
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
        >
          <option value="" disabled>
            Elegir...
          </option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-white transition hover:bg-moss-dark disabled:opacity-50"
      >
        {isPending ? 'Anotando...' : '+ Anotar'}
      </button>
      {error && <p className="w-full text-sm text-clay">{error}</p>}
    </form>
  )
}
