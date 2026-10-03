'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { ProgressBar } from '@/app/components/progress-bar'
import { formatARS } from '@/lib/currency'
import { COMMISSION_RATE, type RepartoGroup } from '@/lib/reparto'
import { Private } from '../privacy'
import { PayoutForm } from './payout-form'

const PAGE = 25

/** Tarjeta desplegable de un profesor: resumen en la cabecera y alumnos + pagos al abrir. */
export function TeacherCard({ group: g, month, defaultOpen }: { group: RepartoGroup; month: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [shown, setShown] = useState(PAGE)
  const pays = g.key !== 'none' && !g.isOwner
  const pending = Math.max(g.commissionCollected - g.paid, 0)
  const pct = g.assigned > 0 ? (g.collected / g.assigned) * 100 : 0
  const rate = Math.round(COMMISSION_RATE * 100)

  return (
    <section className="surface-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center gap-x-6 gap-y-3 rounded-[16px] p-5 text-left"
      >
        <div className="min-w-[160px]">
          <p className="font-display text-xl italic text-ink">{g.name}</p>
          <p className="text-[13px] text-muted">
            {g.students.length} {g.students.length === 1 ? 'alumno' : 'alumnos'}
          </p>
        </div>

        <div className="min-w-[200px] flex-1">
          <p className="text-[13px] text-muted">
            Cobrado <span className="font-semibold text-ink"><Private mask="$ ••••••">{formatARS(g.collected)}</Private></span> de{' '}
            <Private mask="$ ••••••">{formatARS(g.assigned)}</Private> asignado
          </p>
          <ProgressBar value={pct} label={`Cobrado de ${g.name}`} className="mt-1.5" />
        </div>

        {pays && (
          <p className="text-sm tabular-nums text-ink">
            <Private mask="$ ••••••">{formatARS(g.commissionCollected)}</Private>{' '}
            <span className="text-muted">({rate}%)</span>
          </p>
        )}

        {pays ? (
          pending > 0 ? (
            <span className="rounded-full bg-slot-cancel px-3 py-1 text-xs font-semibold text-danger-ink">
              A pagar <Private mask="$ ••••">{formatARS(pending)}</Private>
            </span>
          ) : (
            <span className="rounded-full bg-slot-free px-3 py-1 text-xs font-semibold text-slot-free-ink">Al día</span>
          )
        ) : (
          <span className="text-xs text-muted">{g.isOwner ? 'Dueño · sin comisión' : 'Sin comisión'}</span>
        )}

        <ChevronDown size={18} className={`ml-auto shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div className="border-t border-edge-divider px-5 pb-5 pt-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-muted">
                  <th className="py-2 pr-3">Alumno</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2 text-right">Asignado</th>
                  <th className="px-3 py-2">Estado</th>
                  {pays && <th className="py-2 pl-3 text-right">Comisión</th>}
                </tr>
              </thead>
              <tbody>
                {g.students.slice(0, shown).map((s) => {
                  const paid = !s.comp && s.assigned > 0 && s.collected >= s.assigned
                  return (
                    <tr key={s.studentId} className="border-t border-edge-row">
                      <td className="py-2.5 pr-3">
                        <Link href={`/admin/alumnos?alumno=${s.studentId}`} className="text-ink hover:text-moss hover:underline">
                          {s.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-muted">{s.comp ? 'Bonificado' : s.planName}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink">
                        <Private>{formatARS(s.assigned)}</Private>
                      </td>
                      <td className="px-3 py-2.5">
                        {s.comp ? (
                          <span className="inline-flex items-center gap-1.5 text-state-free-ink">
                            <span className="h-2 w-2 rounded-full bg-state-free" aria-hidden />
                            Bonificado
                          </span>
                        ) : paid ? (
                          <span className="inline-flex items-center gap-1.5 text-state-ok-ink">
                            <span className="h-2 w-2 rounded-full bg-state-ok" aria-hidden />
                            Pagó
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-state-due-ink">
                            <span className="h-2 w-2 rounded-full bg-state-due" aria-hidden />
                            Vencido
                          </span>
                        )}
                      </td>
                      {pays && (
                        <td className="py-2.5 pl-3 text-right tabular-nums text-ink">
                          <Private>{formatARS(Math.round(s.collected * COMMISSION_RATE * 100) / 100)}</Private>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {g.students.length > shown && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="mt-3 text-[13px] font-medium text-moss hover:text-moss-dark"
            >
              Ver {Math.min(PAGE, g.students.length - shown)} más ({shown} de {g.students.length})
            </button>
          )}

          {pays && <PayoutForm instructorId={g.key} month={month} suggested={pending} payouts={g.payouts} />}
        </div>
      )}
    </section>
  )
}
