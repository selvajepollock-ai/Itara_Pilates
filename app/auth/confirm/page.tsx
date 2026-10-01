'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { type EmailOtpType } from '@supabase/supabase-js'
import Link from 'next/link'
import { confirmInviteLink } from './actions'

export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmContent />
    </Suspense>
  )
}

function ConfirmContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tokenHash = params.get('token_hash')
  const type = params.get('type') as EmailOtpType | null
  const next = params.get('next') ?? '/auth/set-password'

  function handleConfirm() {
    if (!tokenHash || !type) return
    setError(null)
    setIsPending(true)
    confirmInviteLink({ tokenHash, type }).then((res) => {
      setIsPending(false)
      if (res?.error) {
        setError('invalid')
        return
      }
      router.push(next)
    })
  }

  const invalidLink = !tokenHash || !type

  return (
    <main className="flex min-h-screen items-center justify-center bg-linen px-4">
      <div className="w-full max-w-sm rounded-2xl border border-sand bg-white p-8 text-center shadow-[0_2px_20px_rgba(46,43,38,0.06)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-emblem.png" alt="Itara Pilates" className="mx-auto h-14 w-14 object-contain" />

        {invalidLink || error ? (
          <>
            <h1 className="mt-4 font-display text-2xl italic text-ink">Link vencido</h1>
            <p className="mt-2 text-sm text-ink/60">
              Este link ya no es válido — a veces el mismo mail lo abre antes de que lo toques vos. Pedí uno nuevo
              acá:
            </p>
            <Link href="/forgot-password" className="btn-primary mt-5 inline-block">
              Recuperar acceso
            </Link>
          </>
        ) : (
          <>
            <h1 className="mt-4 font-display text-2xl italic text-ink">Bienvenido/a a Itara</h1>
            <p className="mt-2 text-sm text-ink/60">Tocá el botón para confirmar tu cuenta y crear tu contraseña.</p>
            <button type="button" onClick={handleConfirm} disabled={isPending} className="btn-primary mt-5 w-full">
              {isPending ? 'Confirmando...' : 'Confirmar mi cuenta'}
            </button>
          </>
        )}
      </div>
    </main>
  )
}
