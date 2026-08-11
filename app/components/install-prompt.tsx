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
    // Registrar el service worker (necesario para que Chrome/Android ofrezca instalar)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true

    if (isStandalone || wasRecentlyDismissed()) return

    // Android/Chrome: capturamos el evento nativo para mostrar NUESTRO cartel en vez del suyo
    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowAndroid(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // iOS: no existe ese evento, así que detectamos manualmente y mostramos instrucciones
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

  if (!showAndroid && !showIOS) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto max-w-md p-3">
        <div className="flex items-center gap-3 rounded-2xl border border-sand bg-white p-4 shadow-[0_4px_24px_rgba(46,43,38,0.12)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />

          {showAndroid && (
            <>
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
            </>
          )}

          {showIOS && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">Instalá Itara Pilates</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-ink/50">
                Tocá <Share size={13} className="inline text-moss" /> y después{' '}
                <span className="inline-flex items-center gap-0.5 font-medium text-ink/70">
                  <Plus size={12} /> Agregar a inicio
                </span>
              </p>
            </div>
          )}

          <button onClick={dismiss} className="shrink-0 text-ink/30 hover:text-ink/60">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
