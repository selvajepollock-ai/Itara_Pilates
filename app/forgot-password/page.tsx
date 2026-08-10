'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { isEmailLike } from '@/lib/auth-username'
import { resolveLoginEmail } from '@/app/actions/auth-helpers'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const email = isEmailLike(identifier) ? identifier : await resolveLoginEmail(identifier)

    if (email) {
      const siteUrl = window.location.origin
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/confirm?next=/auth/set-password`,
      })
    }

    // Mostramos el mismo mensaje exista o no la cuenta, por seguridad.
    setLoading(false)
    setDone(true)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-linen px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-emblem.png" alt="Itara Pilates" className="mx-auto h-14 w-14 object-contain" />
          <h1 className="mt-4 font-display text-2xl italic text-ink">Recuperar acceso</h1>
        </div>

        <div className="rounded-2xl border border-sand bg-white p-8 shadow-[0_2px_20px_rgba(46,43,38,0.06)]">
          {done ? (
            <div className="text-center">
              <p className="text-sm text-ink">
                Si el usuario o email tiene un mail real cargado, le va a llegar un link para crear
                una contraseña nueva.
              </p>
              <p className="mt-2 text-xs text-ink/40">
                Si no tenés un mail cargado en tu cuenta, pedile a otra administradora que te
                restablezca la contraseña desde tu ficha.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
                  Tu email o usuario
                </label>
                <input
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-moss px-4 py-2.5 text-sm font-medium text-white transition hover:bg-moss-dark disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperación'}
              </button>
            </form>
          )}
        </div>

        <Link href="/login" className="mt-6 block text-center text-xs text-ink/40 hover:text-moss">
          ← Volver al login
        </Link>
      </div>
    </main>
  )
}
