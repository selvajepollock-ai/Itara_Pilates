'use client'

import { useRouter } from 'next/navigation'
import { MessageCircle, Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { DropdownMenu, type MenuItem } from '@/app/components/dropdown-menu'
import { whatsappLink } from '@/lib/whatsapp'
import { deleteStudent, setStudentActive } from './[id]/actions'
import type { StudentRow } from './types'

/**
 * Ítems del menú "⋯" de un alumno. Reutiliza las acciones y confirmaciones que ya existían
 * en la ficha (dar de baja con confirm, eliminar escribiendo ELIMINAR): acá solo cambia dónde se ven.
 */
export function useStudentMenuItems(student: StudentRow, onDeleted?: () => void): MenuItem[] {
  const router = useRouter()

  async function handleToggleActive() {
    const label = student.active ? 'dar de baja temporalmente' : 'reactivar'
    if (!confirm(`¿Querés ${label} a ${student.fullName}?`)) return
    const res = await setStudentActive(student.id, !student.active)
    if (res && 'error' in res && res.error) alert(res.error)
    router.refresh()
  }

  async function handleDelete() {
    const confirmText = prompt(
      `Esto borra a "${student.fullName}" y todo su historial (horario, cuota, cancelaciones). No se puede deshacer.\n\nEscribí ELIMINAR para confirmar:`
    )
    if (confirmText !== 'ELIMINAR') return
    const res = await deleteStudent(student.id)
    if (res?.error) {
      alert(res.error)
      return
    }
    onDeleted?.()
    router.refresh()
  }

  return [
    { key: 'edit', label: 'Editar', icon: <Pencil size={15} />, href: `/admin/alumnos/${student.id}` },
    {
      key: 'toggle',
      label: student.active ? 'Dar de baja' : 'Reactivar',
      icon: student.active ? <Pause size={15} /> : <Play size={15} />,
      onSelect: handleToggleActive,
    },
    {
      key: 'delete',
      label: 'Eliminar',
      icon: <Trash2 size={15} />,
      danger: true,
      separatorBefore: true,
      onSelect: handleDelete,
    },
  ]
}

/** Acciones de una fila: WhatsApp (si hay teléfono válido) y menú "⋯". */
export function RowActions({ student, onDeleted }: { student: StudentRow; onDeleted?: () => void }) {
  const items = useStudentMenuItems(student, onDeleted)
  const wa = whatsappLink(student.phone)

  return (
    <div className="flex items-center justify-end gap-1">
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Escribir a ${student.fullName} por WhatsApp`}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-muted transition hover:bg-moss-soft hover:text-moss-dark"
        >
          <MessageCircle size={17} />
        </a>
      )}
      <DropdownMenu label={`Más acciones para ${student.fullName}`} items={items} />
    </div>
  )
}
