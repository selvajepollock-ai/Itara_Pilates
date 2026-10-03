'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { Avatar } from '@/app/components/avatar'
import { DropdownMenu, type MenuItem } from '@/app/components/dropdown-menu'
import { formatPhoneDisplay } from '@/lib/phone'
import { whatsappLink } from '@/lib/whatsapp'
import { deleteTeamMember } from './actions'

export type TeamPerson = {
  id: string
  fullName: string
  username: string | null
  phone: string | null
  isAdmin: boolean
  isInstructor: boolean
  /** Alumnos que tiene asignados (mismo dato que Liquidación); null si no da clases. */
  students: number | null
  /** Texto corto de la columna "Extra" (solo con datos que ya existen). */
  extra: string
}

const GRID = 'lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.1fr)_110px_minmax(0,1fr)_44px]'

function Row({ person, canDelete }: { person: TeamPerson; canDelete: boolean }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const wa = whatsappLink(person.phone)
  const phone = formatPhoneDisplay(person.phone)

  function remove() {
    if (
      !confirm(
        `¿Eliminar a ${person.fullName} del equipo? Si tiene clases asignadas, primero hay que reasignarlas a otro instructor. Esta acción no se puede deshacer.`
      )
    )
      return
    startTransition(async () => {
      const res = await deleteTeamMember(person.id)
      if (res?.error) alert(res.error)
      router.refresh()
    })
  }

  const items: MenuItem[] = [
    { key: 'edit', label: 'Editar', icon: <Pencil size={15} />, href: `/admin/instructores/${person.id}` },
    ...(canDelete
      ? [{ key: 'delete', label: 'Eliminar', icon: <Trash2 size={15} />, danger: true, separatorBefore: true, onSelect: remove }]
      : []),
  ]

  return (
    <li className={`grid min-h-[68px] items-center gap-x-4 gap-y-2 border-t border-edge-row px-4 py-3 first:border-t-0 lg:px-5 ${GRID}`}>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={person.fullName} size={38} />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-ink">
            <span className="truncate">{person.fullName}</span>
            {person.isAdmin && (
              <span className="rounded-full bg-[#EFE6DA] px-2 py-0.5 text-[11px] font-semibold text-[#6E4A30]">Admin</span>
            )}
            {person.isInstructor && (
              <span className="rounded-full bg-slot-free px-2 py-0.5 text-[11px] font-semibold text-slot-free-ink">Instructor</span>
            )}
          </p>
          <p className="text-[12.5px] text-muted">Usuario: {person.username ?? '—'}</p>
        </div>
        <div className="ml-auto lg:hidden">
          <DropdownMenu label={`Más acciones de ${person.fullName}`} items={items} />
        </div>
      </div>

      <div className="flex items-center gap-2 pl-[50px] lg:pl-0">
        {phone ? (
          <>
            <span className="text-sm tabular-nums text-ink">{phone}</span>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Escribir a ${person.fullName} por WhatsApp`}
                className="flex h-11 w-11 items-center justify-center rounded-[10px] text-muted transition hover:bg-moss-soft hover:text-moss lg:h-9 lg:w-9"
              >
                <MessageCircle size={17} />
              </a>
            )}
          </>
        ) : (
          <Link href={`/admin/instructores/${person.id}`} className="text-[13px] font-medium text-moss hover:text-moss-dark">
            + Agregar teléfono
          </Link>
        )}
      </div>

      <p className="pl-[50px] text-sm tabular-nums text-ink lg:pl-0">
        {person.students !== null ? `${person.students} ${person.students === 1 ? 'alumno' : 'alumnos'}` : <span className="text-muted">—</span>}
      </p>

      <p className="pl-[50px] text-[13px] text-muted lg:pl-0">{person.extra}</p>

      <div className="hidden lg:block">
        <DropdownMenu label={`Más acciones de ${person.fullName}`} items={items} />
      </div>
    </li>
  )
}

export function TeamSection({
  title,
  description,
  people,
  currentUserId,
  emptyText,
}: {
  title: string
  description: string
  people: TeamPerson[]
  currentUserId: string
  emptyText: string
}) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mt-0.5 text-[13px] text-muted">{description}</p>
      <div className="surface-card mt-3">
        <div className={`hidden gap-4 rounded-t-[16px] bg-edge-head px-5 py-3 text-xs font-semibold text-muted lg:grid ${GRID}`}>
          <span>Persona</span>
          <span>Teléfono</span>
          <span>Alumnos</span>
          <span>Extra</span>
          <span />
        </div>
        {people.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">{emptyText}</p>
        ) : (
          <ul>
            {people.map((p) => (
              <Row key={p.id} person={p} canDelete={p.id !== currentUserId} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/** En celular, los dos botones de alta se juntan en un "+" con menú. */
export function AddMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative lg:hidden">
      <button
        type="button"
        aria-label="Agregar al equipo"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-moss text-white"
      >
        <Plus size={20} />
      </button>
      {open && (
        <div role="menu" className="surface-card absolute right-0 top-full z-30 mt-1 w-52 p-1.5">
          <Link role="menuitem" href="/admin/instructores/nuevo" className="flex min-h-[40px] items-center rounded-[8px] px-3 text-sm text-ink hover:bg-moss-soft">
            Nuevo instructor
          </Link>
          <Link role="menuitem" href="/admin/instructores/nuevo-admin" className="flex min-h-[40px] items-center rounded-[8px] px-3 text-sm text-ink hover:bg-moss-soft">
            Nuevo administrador
          </Link>
        </div>
      )}
    </div>
  )
}
