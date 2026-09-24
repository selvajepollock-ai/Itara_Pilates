'use client'

import { useState, useTransition } from 'react'
import { grantInstructorAccess } from './actions'

export function GrantInstructorAccessForm({ instructorId, defaultEmail }: { instructorId: string; defaultEmail: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    const email = String(formData.get('email') ?? '')
    startTransition(async () => {
      const result = await grantInstructorAccess(instructorId, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSentTo(email)
    })
  }

  if (sentTo) {
    return (
      <div className="mt-3 rounded-xl border border-moss/30 bg-moss/5 p-4">
        <p className="text-sm font-medium text-moss-dark">Invitación enviada ✓</p>
        <p className="mt-1 text-xs text-ink/60">
          Le mandamos un mail a <span className="font-medium">{sentTo}</span> para que cree su contraseña.
          Recargá la página para ver el estado actualizado.
        </p>
      </div>
    )
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
      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? 'Enviando...' : 'Dar acceso'}
      </button>
      {error && <p className="w-full text-sm text-clay">{error}</p>}
    </form>
  )
}
