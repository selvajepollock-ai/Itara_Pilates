'use client'

import { useEffect, useState } from 'react'
import { X, Share, Plus } from 'lucide-react'

const DISMISS_KEY = 'itara-install-dismissed-at'
const DISMISS_DAYS = 14

function wasRecentlyDismissed() {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem(DISMISS_KEY)
  if (!stored) return false
  const days = (Date.now() - Number(stored)) / (1000 * 60 * 60 * 24)
  return days < DISMISS_DAYS
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showAndroid, setShowAndroid] = useState(false)
  const [showIOS, setShowIOS] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true

    if (isStandalone || wasRecentlyDismissed()) return

    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowAndroid(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isIOS) {
      const timer = setTimeout(() => setShowIOS(true), 2000)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setShowAndroid(false)
    setShowIOS(false)
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShowAndroid(false)
  }

  if (showAndroid) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50">
        <div className="mx-auto max-w-md p-3">
          <div className="flex items-center gap-3 rounded-2xl border border-sand bg-white p-4 shadow-[0_4px_24px_rgba(46,43,38,0.12)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">Instalá Itara Pilates</p>
              <p className="text-xs text-ink/50">Accedé directo desde tu pantalla de inicio</p>
            </div>
            <button
              onClick={handleInstallClick}
              className="shrink-0 rounded-full bg-moss px-4 py-2 text-xs font-medium text-white hover:bg-moss-dark"
            >
              Instalar
            </button>
            <button onClick={dismiss} className="shrink-0 text-ink/30 hover:text-ink/60">
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showIOS) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:px-4">
        <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon-192.png" alt="" className="h-9 w-9 rounded-xl" />
              <p className="font-display text-lg italic text-ink">Crear acceso directo</p>
            </div>
            <button onClick={dismiss} className="text-ink/30 hover:text-ink/60">
              <X size={18} />
            </button>
          </div>

          <p className="mt-3 text-sm text-ink/60">
            Así entrás directo, más rápido, sin buscar el link cada vez.
          </p>

          {/* Paso 1 */}
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-sand bg-linen/40 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ring-2 ring-clay">
              <Share size={17} className="text-ink" />
            </span>
            <div>
              <p className="text-xs font-medium text-ink/70">
                <span className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-moss text-[10px] font-medium text-white">
                  1
                </span>
                Tocá el ícono de Compartir
              </p>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="mt-3 rounded-2xl border border-sand bg-linen/40 p-3">
            <p className="text-xs font-medium text-ink/60">
              <span className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-moss text-[10px] font-medium text-white">
                2
              </span>
              En la lista que aparece, buscá y tocá:
            </p>
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-white px-3 py-2">
              <Plus size={15} className="text-ink/50" />
              <span className="text-sm text-ink">Agregar a inicio</span>
            </div>
          </div>

          <button
            onClick={dismiss}
            className="mt-5 w-full rounded-full border border-sand px-4 py-2.5 text-sm font-medium text-ink/60 hover:border-moss hover:text-moss"
          >
            Entendido
          </button>
        </div>
      </div>
    )
  }

  return null
}
