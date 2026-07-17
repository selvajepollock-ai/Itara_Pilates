'use client'

import { useRef, useState, useTransition } from 'react'
import { setInstructorPassword } from './actions'

export function SetInstructorPasswordForm({ instructorId }: { instructorId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await setInstructorPassword(instructorId, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSuccess(true)
      formRef.current?.reset()
    })
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="mt-3 flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-sand bg-white/50 p-5"
    >
      <div className="flex-1">
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
          Contraseña nueva
        </label>
        <input
          type="text"
          name="password"
          required
          minLength={6}
          placeholder="mínimo 6 caracteres"
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-clay px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Cambiando...' : 'Restablecer'}
      </button>
      {error && <p className="w-full text-sm text-clay">{error}</p>}
      {success && <p className="w-full text-sm text-moss-dark">Contraseña actualizada ✓</p>}
    </form>
  )
}
