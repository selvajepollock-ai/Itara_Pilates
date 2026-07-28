'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Pencil, CheckCircle2, Clock, AlertCircle, HelpCircle } from 'lucide-react'
import { STATUS_LABEL, STATUS_CLASSES, type PaymentStatus } from '@/lib/billing'

type Student = {
  id: string
  full_name: string
  email: string
  phone: string | null
  active: boolean
  status: PaymentStatus
}

const STATUS_CARDS: { status: PaymentStatus; label: string; icon: typeof CheckCircle2 }[] = [
  { status: 'al_dia', label: 'Al día', icon: CheckCircle2 },
  { status: 'por_vencer', label: 'Por vencer', icon: Clock },
  { status: 'vencido', label: 'Vencidos', icon: AlertCircle },
  { status: 'sin_plan', label: 'Sin plan', icon: HelpCircle },
]

export function StudentsList({ students }: { students: Student[] }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | null>(null)

  const counts = useMemo(() => {
    const c: Record<PaymentStatus, number> = { al_dia: 0, por_vencer: 0, vencido: 0, sin_plan: 0 }
    for (const s of students) c[s.status]++
    return c
  }, [students])

  const filtered = useMemo(() => {
    let list = students
    if (statusFilter) list = list.filter((s) => s.status === statusFilter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (s) => s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
      )
    }
    return list
  }, [students, query, statusFilter])

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

      <div className="relative mt-6">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="w-full rounded-full border border-sand bg-white py-2.5 pl-10 pr-4 text-sm text-ink outline-none focus:border-moss"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-sand bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand text-left text-xs uppercase tracking-wide text-ink/40">
              <th className="px-5 py-3.5 font-medium">Nombre</th>
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
                    <span className="text-ink">{s.full_name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-ink/60">{s.email}</td>
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
                <td colSpan={4} className="px-5 py-14 text-center text-sm text-ink/40">
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
