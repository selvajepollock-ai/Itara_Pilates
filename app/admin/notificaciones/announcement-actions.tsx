'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAnnouncement, reactivateAnnouncement } from './actions'

export function AnnouncementActions({
  announcementId,
  isExpired,
}: {
  announcementId: string
  isExpired: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    if (!confirm('¿Eliminar esta notificación? No se puede deshacer.')) return
    setError(null)
    startTransition(async () => {
      const result = await deleteAnnouncement(announcementId)
      if (result?.error) setError(result.error)
    })
  }

  function handleReactivate() {
    setError(null)
    startTransition(async () => {
      const result = await reactivateAnnouncement(announcementId)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        {isExpired && (
          <button
            onClick={handleReactivate}
            disabled={isPending}
            className="whitespace-nowrap text-xs font-medium text-moss hover:text-moss-dark disabled:opacity-50"
          >
            {isPending ? '...' : 'Reactivar'}
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="whitespace-nowrap text-xs font-medium text-clay hover:text-clay/70 disabled:opacity-50"
        >
          {isPending ? '...' : 'Eliminar'}
        </button>
      </div>
      {error && <p className="text-xs text-clay">{error}</p>}
    </div>
  )
}
