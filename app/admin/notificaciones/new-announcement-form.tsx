'use client'

import { useRef, useState, useTransition } from 'react'
import { createAnnouncement } from './actions'

export function NewAnnouncementForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await createAnnouncement(formData)
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
      className="mt-6 space-y-3 rounded-2xl border border-sand bg-white p-6"
    >
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Mensaje</label>
        <textarea
          name="message"
          required
          rows={3}
          placeholder="Ej: El estudio permanece cerrado el 9 de julio por feriado."
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
        />
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
          Se oculta a partir de (opcional)
        </label>
        <input
          type="date"
          name="expires_at"
          className="mt-1.5 rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-white hover:bg-moss-dark disabled:opacity-50"
      >
        {isPending ? 'Enviando...' : 'Enviar a todos'}
      </button>
      {error && <p className="text-sm text-clay">{error}</p>}
      {success && <p className="text-sm text-moss-dark">Enviado ✓</p>}
    </form>
  )
}
