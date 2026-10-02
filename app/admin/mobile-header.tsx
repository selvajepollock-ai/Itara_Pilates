'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { NotificationBell } from './notification-bell'
import type { InboxItem } from './notification-types'

/** Cabecera del celular (< 1024 px): logo, buscador visible y campana. */
export function MobileHeader({ notifications = [] }: { notifications?: InboxItem[] }) {
  return (
    <div className="flex items-center gap-3 border-b border-edge bg-white px-4 py-3 lg:hidden">
      <Link href="/admin" aria-label="Inicio" className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-emblem.png" alt="Itara Pilates" className="h-9 w-9 object-contain" />
      </Link>
      {/* TODO: buscador global. Por ahora lleva a Alumnos con el campo de búsqueda activo. */}
      <Link
        href="/admin/alumnos?buscar=1"
        className="flex min-h-[44px] flex-1 items-center gap-2 rounded-[12px] border border-edge-strong bg-white px-3.5 text-sm text-muted"
      >
        <Search size={16} />
        Buscar alumno
      </Link>
      <NotificationBell initialItems={notifications} />
    </div>
  )
}
