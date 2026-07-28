'use client'

import { useTransition } from 'react'
import { deleteAnnouncement } from './actions'

export function DeleteAnnouncementButton({ announcementId }: { announcementId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('¿Eliminar esta notificación?')) return
    startTransition(() => {
      deleteAnnouncement(announcementId)
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="whitespace-nowrap text-xs font-medium text-clay hover:text-clay/70 disabled:opacity-50"
    >
      {isPending ? '...' : 'Eliminar'}
    </button>
  )
}
