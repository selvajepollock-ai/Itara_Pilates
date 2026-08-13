'use client'

import { useState, useTransition } from 'react'
import { createSignupRequest } from './actions'
import { PhoneInput } from '@/app/components/phone-input'

export default function RegistroPage() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const emailConfirm = String(formData.get('email_confirm') ?? '').trim().toLowerCase()

    if (email !== emailConfirm) {
      setEmailError('Los mails no coinciden. Revisá que estén escritos igual.')
      return
    }

    setEmailError(null)
    setError(null)
    startTransition(async () => {
      const res = await createSignupRequest(formData)
      if (res?.error) {
        setError(res.error)
        return
      }
      setDone(true)
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-linen px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-emblem.png" alt="Itara Pilates" className="mx-auto h-16 w-16 object-contain" />
          <p className="mt-3 text-xs uppercase tracking-[0.3em] text-moss">Sumate al estudio</p>
          <h1 className="mt-2 font-display text-3xl italic text-ink">Itara Pilates</h1>
        </div>

        <div className="rounded-2xl border border-sand bg-white p-8 shadow-[0_2px_20px_rgba(46,43,38,0.06)]">
          {done ? (
            <div className="text-center">
              <p className="font-display text-xl italic text-ink">¡Listo! ✓</p>
              <p className="mt-2 text-sm text-ink/60">
                Recibimos tus datos. Nos vamos a contactar en breve para coordinar todo.
              </p>
            </div>
          ) : (
            <form action={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
                    Nombre
                  </label>
                  <input
                    name="first_name"
                    required
                    className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
                    Apellido
                  </label>
                  <input
                    name="last_name"
                    required
                    className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Usuario</label>
                <div className="mt-1.5 flex items-center rounded-lg border border-sand bg-linen/40 focus-within:border-moss focus-within:bg-white">
                  <span className="pl-3.5 text-sm text-ink/40">@</span>
                  <input
                    name="username"
                    required
                    pattern="[a-z0-9_.]{3,20}"
                    title="Minúsculas, números, puntos o guiones bajos. Entre 3 y 20 caracteres."
                    placeholder="tuusuario"
                    className="w-full bg-transparent px-2 py-2.5 text-sm text-ink outline-none"
                  />
                </div>
                <p className="mt-1 text-xs text-ink/40">Minúsculas, sin espacios. Se permiten "_" y ".".</p>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
                  Confirmá tu email
                </label>
                <input
                  type="email"
                  name="email_confirm"
                  required
                  className={`mt-1.5 w-full rounded-lg border bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:bg-white ${
                    emailError ? 'border-clay focus:border-clay' : 'border-sand focus:border-moss'
                  }`}
                />
                {emailError && <p className="mt-1 text-xs text-clay">{emailError}</p>}
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
                  Teléfono (opcional)
                </label>
                <div className="mt-1.5">
                  <PhoneInput name="phone" defaultValue="" />
                </div>
              </div>

              {error && <p className="text-sm text-clay">{error}</p>}

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full bg-moss px-4 py-2.5 text-sm font-medium text-white hover:bg-moss-dark disabled:opacity-50"
              >
                {isPending ? 'Enviando...' : 'Quiero sumarme'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
