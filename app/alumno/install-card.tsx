'use client'

import { useEffect, useState } from 'react'
import { Share, X } from 'lucide-react'

const DISMISS_KEY = 'itara-install-dismissed-at'
const DISMISS_DAYS = 14

/** "Instalar la app": tarjeta descartable al final del panel (nunca flotante). Recuerda la decisión en localStorage. */
export function InstallCard() {
  const [mode, setMode] = useState<'android' | 'ios' | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferred, setDeferred] = useState<any>(null)

  useEffect(() => {
    try {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true
      const stored = localStorage.getItem(DISMISS_KEY)
      const recently = stored ? (Date.now() - Number(stored)) / 86_400_000 < DISMISS_DAYS : false
      if (standalone || recently) return
    } catch {
      // sin almacenamiento: se muestra igual
    }
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) setMode('ios')
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e)
      setMode('android')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // ignorar
    }
    setMode(null)
  }

  async function install() {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setMode(null)
  }

  if (!mode) return null

  return (
    <section className="flex items-center gap-4 rounded-2xl border border-[#DCE7DE] bg-moss-soft p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">Instalá Itara Pilates</p>
        {mode === 'ios' ? (
          <p className="text-[13px] text-muted">
            Tocá <Share size={13} className="mx-0.5 inline align-[-2px]" aria-hidden /> Compartir y después &quot;Agregar a inicio&quot;.
          </p>
        ) : (
          <p className="text-[13px] text-muted">Entrá directo desde tu pantalla de inicio.</p>
        )}
      </div>
      {mode === 'android' && (
        <button type="button" onClick={install} className="btn-primary shrink-0">
          Instalar
        </button>
      )}
      <button
        type="button"
        aria-label="Descartar"
        onClick={dismiss}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-muted hover:bg-white"
      >
        <X size={16} />
      </button>
    </section>
  )
}
