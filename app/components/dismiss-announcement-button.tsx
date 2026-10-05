'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { dismissAnnouncement } from '@/app/actions/announcements'

/** "✕" para cerrar un aviso del estudio. */
export function DismissAnnouncementButton({ announcementId }: { announcementId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      aria-label="Cerrar este aviso"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await dismissAnnouncement(announcementId)
          router.refresh()
        })
      }
      className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-muted transition hover:bg-moss-soft hover:text-ink disabled:opacity-40"
    >
      <X size={16} />
    </button>
  )
}
