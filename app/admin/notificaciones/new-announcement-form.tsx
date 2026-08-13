'use client'

import { useRef, useState, useTransition } from 'react'
import { createAnnouncement } from './actions'

type ClassOption = { id: string; label: string }

export function NewAnnouncementForm({ classOptions }: { classOptions: ClassOption[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [targetType, setTargetType] = useState<'all' | 'people' | 'class'>('all')

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
      setTargetType('all')
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
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Para quién</label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {(['all', 'people', 'class'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTargetType(t)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                targetType === t ? 'border-moss bg-moss text-white' : 'border-sand text-ink/50 hover:border-moss'
              }`}
            >
              {t === 'all' ? 'Todos' : t === 'people' ? 'Personas puntuales' : 'Una clase'}
            </button>
          ))}
        </div>
        <input type="hidden" name="target_type" value={targetType} />
      </div>

      {targetType === 'people' && (
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
            Usuarios (separados por coma)
          </label>
          <input
            name="target_usernames"
            placeholder="ej: vicucha, mariap, juan.d"
            className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
          />
          <p className="mt-1 text-xs text-ink/40">Sin el @, separados por coma.</p>
        </div>
      )}

      {targetType === 'class' && (
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Clase</label>
          <select
            name="target_class_id"
            required
            defaultValue=""
            className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
          >
            <option value="" disabled>
              Elegí una clase...
            </option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink/40">
            Lo ven los alumnos anotados fijos en esa clase, y el instructor que la da.
          </p>
        </div>
      )}

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
        {isPending ? 'Enviando...' : 'Enviar'}
      </button>
      {error && <p className="text-sm text-clay">{error}</p>}
      {success && <p className="text-sm text-moss-dark">Enviado ✓</p>}
    </form>
  )
}
