'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { removePushSubscription, savePushSubscription } from '@/app/actions/push'

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

type State = 'loading' | 'no-key' | 'unsupported' | 'old-ios' | 'no-sw' | 'ios-install' | 'denied' | 'off' | 'on'

/**
 * Activar / desactivar los avisos en este dispositivo (notificaciones push).
 * En iPhone solo funcionan si la app está instalada en la pantalla de inicio.
 */
export function PushToggle({ title = 'Avisos en tu celular', description }: { title?: string; description?: string }) {
  const [state, setState] = useState<State>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function detect() {
      if (!PUBLIC_KEY) return active && setState('no-key')
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true
      if (isIOS && !standalone) return active && setState('ios-install')
      if (isIOS && !('PushManager' in window)) return active && setState('old-ios')
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        return active && setState('unsupported')
      }
      if (Notification.permission === 'denied') return active && setState('denied')
      try {
        const reg = await Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 5000))])
        if (!reg) return active && setState('no-sw')
        const sub = await reg.pushManager.getSubscription()
        active && setState(sub && Notification.permission === 'granted' ? 'on' : 'off')
      } catch {
        active && setState('no-sw')
      }
    }
    detect()
    return () => {
      active = false
    }
  }, [])

  async function enable() {
    setBusy(true)
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY!) }))
      const json = sub.toJSON()
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? '',
        auth: json.keys?.auth ?? '',
        userAgent: navigator.userAgent,
      })
      if (res?.error) {
        setError(res.error)
        return
      }
      setState('on')
    } catch {
      setError('No se pudieron activar los avisos. Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await removePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setState('off')
    } catch {
      setError('No se pudieron desactivar los avisos.')
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading') return null

  return (
    <section className="rounded-2xl border border-edge bg-white p-5">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${state === 'on' ? 'bg-moss-soft text-moss' : 'bg-edge-row text-muted'}`}
          aria-hidden
        >
          {state === 'on' ? <Bell size={18} /> : <BellOff size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            {state === 'no-key'
              ? 'Los avisos todavía no están configurados en esta versión de la app (falta la clave). Avisale a quien administra el sistema.'
              : state === 'old-ios'
                ? 'Este iPhone no permite avisos en la app. Hace falta iOS 16.4 o más: actualizá desde Ajustes, General, Actualización de software.'
                : state === 'unsupported'
                  ? 'Este navegador no permite avisos. Probá con Chrome (Android) o con la app instalada (iPhone).'
                  : state === 'no-sw'
                    ? 'No se pudo iniciar el servicio de avisos. Cerrá la app por completo y volvé a abrirla.'
                    : state === 'ios-install'
                      ? 'Para recibir avisos en iPhone, primero instalá la app: tocá Compartir y después "Agregar a inicio". Después abrila desde ahí y activá los avisos.'
                      : state === 'denied'
                        ? 'Los avisos están bloqueados en este dispositivo. Activalos desde los ajustes del navegador o de la app.'
                        : state === 'on'
                          ? 'Activados en este dispositivo.'
                          : (description ?? 'Enterate al instante cuando aprueben tu recuperación o cambie una clase.')}
          </p>
          {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
        </div>
        {state === 'off' && (
          <button type="button" onClick={enable} disabled={busy} className="btn-primary shrink-0 disabled:opacity-50">
            {busy ? '...' : 'Activar'}
          </button>
        )}
        {state === 'on' && (
          <button type="button" onClick={disable} disabled={busy} className="btn-secondary shrink-0 disabled:opacity-50">
            {busy ? '...' : 'Desactivar'}
          </button>
        )}
      </div>
    </section>
  )
}
