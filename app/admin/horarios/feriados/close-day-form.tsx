'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelDayOccurrences } from '@/app/actions/recovery'

export function CloseDayForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!date) return
    if (!confirm('¿Cancelar todas las clases de ese día? Cada alumno anotado recibe una recuperación y un aviso.')) return
    setMsg(null)
    startTransition(async () => {
      const res = await cancelDayOccurrences({ sessionDate: date, reason: reason.trim() || undefined })
      if (res?.error) setMsg({ ok: false, text: res.error })
      else {
        setMsg({ ok: true, text: `Listo: se cancelaron ${res.count} clases.` })
        setDate('')
        setReason('')
        router.refresh()
      }
    })
  }

  const field =
    'mt-1.5 rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white'
  return (
    <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-sand bg-white/50 p-5">
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Fecha</label>
        <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={`block ${field}`} />
      </div>
      <div className="flex-1">
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Motivo (opcional)</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Estudio cerrado por refacciones" className={`w-full ${field}`} />
      </div>
      <button type="submit" disabled={isPending || !date} className="btn-primary">
        {isPending ? 'Cancelando...' : 'Cancelar el día'}
      </button>
      {msg && <p className={`w-full text-sm ${msg.ok ? 'text-moss-dark' : 'text-clay'}`}>{msg.text}</p>}
    </form>
  )
}
