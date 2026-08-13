'use client'

import { useState, useTransition } from 'react'
import { updateMyProfile } from './actions'
import { PhoneInput } from '@/app/components/phone-input'

type Profile = {
  full_name: string
  nickname: string
  phone: string
  birth_date: string
  username: string
  email: string
}

export function EditMyProfileForm({ profile }: { profile: Profile }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateMyProfile(formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSaved(true)
    })
  }

  const inputClass =
    'mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white'
  const labelClass = 'text-xs font-medium uppercase tracking-wide text-ink/60'

  return (
    <form action={handleSubmit} className="mt-6 space-y-5 rounded-2xl border border-sand bg-white p-6">
      <div>
        <label className={labelClass}>Nombre completo</label>
        <input name="full_name" required defaultValue={profile.full_name} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Usuario (@)</label>
        <div className="mt-1.5 flex items-center rounded-lg border border-sand bg-linen/40 focus-within:border-moss focus-within:bg-white">
          <span className="pl-3.5 text-sm text-ink/40">@</span>
          <input
            name="username"
            required
            defaultValue={profile.username}
            pattern="[a-z0-9_.]{3,20}"
            title="Minúsculas, números, puntos o guiones bajos. Entre 3 y 20 caracteres."
            className="w-full bg-transparent px-2 py-2.5 text-sm text-ink outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-ink/40">Minúsculas, sin espacios. Se permiten "_" y ".".</p>
      </div>

      <div>
        <label className={labelClass}>Apodo (opcional)</label>
        <input name="nickname" defaultValue={profile.nickname} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Teléfono</label>
        <div className="mt-1.5">
          <PhoneInput name="phone" defaultValue={profile.phone} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Fecha de nacimiento</label>
        <input type="date" name="birth_date" defaultValue={profile.birth_date} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Email</label>
        <input value={profile.email} disabled className={`${inputClass} opacity-60`} />
        <p className="mt-1 text-xs text-ink/40">Para cambiar tu email, pedile al estudio que lo actualice.</p>
      </div>

      {error && <p className="text-sm text-clay">{error}</p>}
      {saved && <p className="text-sm text-moss-dark">Guardado ✓</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-white transition hover:bg-moss-dark disabled:opacity-50"
      >
        {isPending ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  )
}
