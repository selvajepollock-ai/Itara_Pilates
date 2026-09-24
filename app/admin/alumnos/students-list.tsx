'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Pencil, CheckCircle2, Clock, AlertCircle, HelpCircle, Gift } from 'lucide-react'
import { STATUS_LABEL, STATUS_CLASSES, type PaymentStatus } from '@/lib/billing'

type Student = {
  id: string
  full_name: string
  nickname: string | null
  email: string
  displayEmail: string | null
  hasAccess: boolean
  phone: string | null
  active: boolean
  status: PaymentStatus
  instructorId: string | null
  instructorName: string | null
}

const STATUS_CARDS: { status: PaymentStatus; label: string; icon: typeof CheckCircle2 }[] = [
  { status: 'al_dia', label: 'Al día', icon: CheckCircle2 },
  { status: 'por_vencer', label: 'Por vencer', icon: Clock },
  { status: 'vencido', label: 'Vencidos', icon: AlertCircle },
  { status: 'sin_plan', label: 'Sin plan', icon: HelpCircle },
  { status: 'bonificado', label: 'Bonificados', icon: Gift },
]

export function StudentsList({ students }: { students: Student[] }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | null>(null)
  const [instructorFilter, setInstructorFilter] = useState<string | null>(null)

  const instructors = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of students) {
      if (s.instructorId && s.instructorName) map.set(s.instructorId, s.instructorName)
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [students])

  const counts = useMemo(() => {
    const c: Record<PaymentStatus, number> = {
      al_dia: 0,
      por_vencer: 0,
      vencido: 0,
      sin_plan: 0,
      bonificado: 0,
    }
    for (const s of students) c[s.status]++
    return c
  }, [students])

  const noInstructorCount = useMemo(() => students.filter((s) => s.active && !s.instructorId).length, [students])

  const filtered = useMemo(() => {
    let list = students
    if (statusFilter) list = list.filter((s) => s.status === statusFilter)
    if (instructorFilter === '__none') list = list.filter((s) => !s.instructorId)
    else if (instructorFilter) list = list.filter((s) => s.instructorId === instructorFilter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (s) =>
          s.full_name.toLowerCase().includes(q) ||
          s.nickname?.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.displayEmail?.toLowerCase().includes(q)
      )
    }
    return list
  }, [students, query, statusFilter, instructorFilter])

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATUS_CARDS.map(({ status, label, icon: Icon }) => {
          const isActive = statusFilter === status
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(isActive ? null : status)}
              className={`rounded-2xl border p-4 text-left transition ${
                isActive ? 'border-moss bg-moss/5' : 'border-sand bg-white hover:border-moss/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon size={16} className="text-ink/40" />
                <span className="font-display text-2xl italic text-ink">{counts[status]}</span>
              </div>
              <p className="mt-1 text-xs text-ink/50">{label}</p>
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full rounded-full border border-sand bg-white py-2.5 pl-10 pr-4 text-sm text-ink outline-none focus:border-moss"
          />
        </div>
        {(instructors.length > 0 || noInstructorCount > 0) && (
          <select
            value={instructorFilter ?? ''}
            onChange={(e) => setInstructorFilter(e.target.value || null)}
            className="rounded-full border border-sand bg-white py-2.5 px-4 text-sm text-ink outline-none focus:border-moss"
          >
            <option value="">Todos los profesores</option>
            {noInstructorCount > 0 && <option value="__none">Sin profesor asignado ({noInstructorCount})</option>}
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Mobile: tarjetas apiladas */}
      <ul className="mt-4 space-y-2 sm:hidden">
        {filtered.map((s) => (
          <li key={s.id}>
            <Link
              href={`/admin/alumnos/${s.id}`}
              className="block rounded-2xl border border-sand bg-white p-4 transition hover:border-moss"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-medium text-ink">
                  {s.full_name?.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{s.full_name}</p>
                  {s.nickname && <p className="truncate text-xs text-ink/40">"{s.nickname}"</p>}
                  {s.instructorName ? (
                    <p className="truncate text-xs text-ink/40">Prof. {s.instructorName}</p>
                  ) : (
                    <p className="truncate text-xs text-clay">Sin profesor — asignar horarios</p>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[s.status]}`}>
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-sand/60 pt-2.5 text-xs text-ink/50">
                <span className="min-w-0 truncate">
                  {s.hasAccess ? (
                    s.email
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="rounded-full bg-sand px-2 py-0.5 text-ink/50">Sin acceso</span>
                      {s.displayEmail && <span className="truncate text-ink/40">{s.displayEmail}</span>}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-1 font-medium text-moss">
                  <Pencil size={13} strokeWidth={2} />
                  Editar
                </span>
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="rounded-2xl border border-sand bg-white px-5 py-14 text-center text-sm text-ink/40">
            {students.length === 0 ? 'Todavía no hay alumnos cargados.' : 'No hay resultados.'}
          </li>
        )}
      </ul>

      {/* Tablet / desktop: tabla */}
      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-sand bg-white sm:block">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-sand text-left text-xs uppercase tracking-wide text-ink/40">
              <th className="px-5 py-3.5 font-medium">Nombre</th>
              <th className="px-5 py-3.5 font-medium">Profesor</th>
              <th className="px-5 py-3.5 font-medium">Email</th>
              <th className="px-5 py-3.5 font-medium">Cuota</th>
              <th className="px-5 py-3.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-sand/60 transition last:border-0 hover:bg-linen/50">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-medium text-ink">
                      {s.full_name?.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-ink">{s.full_name}</span>
                      {s.nickname && <p className="text-xs text-ink/40">"{s.nickname}"</p>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-ink/60">
                  {s.instructorName ?? (
                    <Link
                      href={`/admin/alumnos/${s.id}`}
                      className="rounded-full bg-clay/10 px-2.5 py-1 text-xs font-medium text-clay hover:bg-clay/20"
                    >
                      Sin profesor · asignar
                    </Link>
                  )}
                </td>
                <td className="px-5 py-3.5 text-ink/60">
                  {s.hasAccess ? (
                    s.email
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="rounded-full bg-sand px-2 py-0.5 text-xs text-ink/50">
                        Sin acceso
                      </span>
                      {s.displayEmail && <span className="text-xs text-ink/40">{s.displayEmail}</span>}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[s.status]}`}>
                    {STATUS_LABEL[s.status]}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/admin/alumnos/${s.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-moss hover:text-moss-dark"
                  >
                    <Pencil size={13} strokeWidth={2} />
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center text-sm text-ink/40">
                  {students.length === 0 ? 'Todavía no hay alumnos cargados.' : 'No hay resultados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
