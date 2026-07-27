'use client'

import { useState, useTransition } from 'react'
import { grantStudentAccess } from './actions'

export function GrantAccessForm({ studentId, defaultEmail }: { studentId: string; defaultEmail: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await grantStudentAccess(studentId, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSuccess(true)
    })
  }

  if (success) {
    return <p className="mt-3 text-sm text-moss-dark">Acceso enviado ✓ — le llegó un mail para crear su contraseña.</p>
  }

  return (
    <form action={handleSubmit} className="mt-3 flex flex-wrap items-end gap-3">
      <div className="flex-1">
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Email real</label>
        <input
          type="email"
          name="email"
          required
          defaultValue={defaultEmail}
          className="mt-1.5 w-full rounded-lg border border-sand bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-clay px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Enviando...' : 'Dar acceso'}
      </button>
      {error && <p className="w-full text-sm text-clay">{error}</p>}
    </form>
  )
}
