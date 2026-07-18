'use client'

import { useMemo, useState, useTransition } from 'react'
import { Search } from 'lucide-react'
import { registerPayment } from './planes/actions'
import { formatARS } from '@/lib/currency'

type StudentBilling = {
  id: string
  full_name: string
  subscriptionId: string | null
  planName: string | null
  planPrice: number
  endDate: string | null
  suggestedNextDate: string
}

export function QuickPayment({ students }: { students: StudentBilling[] }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<StudentBilling | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.trim().toLowerCase()
    return students.filter((s) => s.full_name.toLowerCase().includes(q)).slice(0, 6)
  }, [query, students])

  function handleSelect(student: StudentBilling) {
    setSelected(student)
    setQuery('')
    setError(null)
    setSuccess(false)
  }

  function handleSubmit(formData: FormData) {
    if (!selected?.subscriptionId) return
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await registerPayment(selected.subscriptionId!, selected.id, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSuccess(true)
    })
  }

  return (
    <div className="rounded-2xl border border-sand bg-white p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Acceso rápido</p>
      <p className="mt-1 font-display text-xl italic text-ink">Registrar un pago</p>

      {!selected ? (
        <div className="relative mt-3">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar alumno por nombre..."
            className="w-full rounded-lg border border-sand bg-linen/40 py-2.5 pl-9 pr-3.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
          />
          {results.length > 0 && (
            <ul className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-lg border border-sand bg-white shadow-lg">
              {results.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(s)}
                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm hover:bg-linen"
                  >
                    <span className="text-ink">{s.full_name}</span>
                    <span className="text-xs text-ink/40">
                      {s.planName ?? 'Sin plan'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink">{selected.full_name}</p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-ink/40 hover:text-ink"
            >
              Cambiar
            </button>
          </div>

          {!selected.subscriptionId ? (
            <p className="mt-3 text-sm text-ink/50">
              Todavía no tiene un plan asignado.{' '}
              <a href={`/admin/alumnos/${selected.id}`} className="text-moss hover:text-moss-dark">
                Asignale uno acá
              </a>
              .
            </p>
          ) : (
            <form action={handleSubmit} className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
                  Monto (ARS)
                </label>
                <input
                  type="number"
                  name="amount"
                  min={0}
                  step="0.01"
                  defaultValue={selected.planPrice}
                  className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
                  Nueva fecha de vencimiento
                </label>
                <input
                  type="date"
                  name="new_end_date"
                  required
                  defaultValue={selected.suggestedNextDate}
                  className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full bg-moss px-4 py-2.5 text-sm font-medium text-white hover:bg-moss-dark disabled:opacity-50"
              >
                {isPending ? 'Registrando...' : 'Marcar como pagado'}
              </button>
              {error && <p className="text-sm text-clay">{error}</p>}
              {success && <p className="text-sm text-moss-dark">Pago registrado ✓</p>}
            </form>
          )}
        </div>
      )}
    </div>
  )
}
