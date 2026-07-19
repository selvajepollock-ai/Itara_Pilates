'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isEmailLike, usernameToInternalEmail } from '@/lib/auth-username'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const email = isEmailLike(identifier) ? identifier : usernameToInternalEmail(identifier)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (error) {
      setError('Email/usuario o contraseña incorrectos.')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-linen px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-moss">Bienvenida de vuelta</p>
          <h1 className="mt-2 font-display text-3xl italic text-ink">Itara Pilates</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-sand bg-white p-8 shadow-[0_2px_20px_rgba(46,43,38,0.06)]"
        >
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
              Email o usuario
            </label>
            <input
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white"
            />
          </div>

          {error && <p className="text-sm text-clay">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-moss px-4 py-2.5 text-sm font-medium text-white transition hover:bg-moss-dark disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  )
}
