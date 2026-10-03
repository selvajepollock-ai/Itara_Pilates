'use client'

import Link from 'next/link'
import { formatARS } from '@/lib/currency'
import { dayLong } from '../horarios/slots'
import { PaymentRowActions } from '../pagos/registro/payment-row-actions'
import { shortDate } from './format'
import type { DrawerData } from './drawer-actions'

const DOT = { yellow: 'bg-[#C9962E]', green: 'bg-state-ok', red: 'bg-danger' }

export function PagosPanel({ data, studentName }: { data: DrawerData; studentName: string }) {
  if (data.payments.length === 0) {
    return <p className="rounded-[12px] border border-dashed border-edge-strong px-4 py-8 text-center text-sm text-muted">Todavía no hay pagos registrados.</p>
  }
  return (
    <ul className="divide-y divide-edge-divider rounded-[12px] border border-edge-divider">
      {data.payments.map((p) => (
        <li key={`${p.kind}-${p.id}`} className="flex items-center gap-3 px-3.5 py-3">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  p.kind === 'cuota' ? 'bg-slot-free text-slot-free-ink' : 'bg-info-soft text-info-ink'
                }`}
              >
                {p.kind === 'cuota' ? 'Cuota' : 'Suelta'}
              </span>
              <span className="truncate">{p.concept}</span>
              {p.voided && (
                <span className="rounded-full bg-slot-full px-2 py-0.5 text-[11px] font-semibold text-slot-full-ink">Anulado</span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {shortDate(p.paidAt)}
              {p.recordedBy ? ` · ${p.recordedBy}` : ''}
              {p.voided && p.voidedReason ? ` · ${p.voidedReason}` : p.note ? ` · ${p.note}` : ''}
            </p>
          </div>
          <p className={`shrink-0 text-sm font-semibold tabular-nums ${p.voided ? 'text-muted line-through' : 'text-ink'}`}>
            {formatARS(p.amount)}
          </p>
          <div className="w-[34px] shrink-0">
            {p.kind === 'cuota' && !p.voided && (
              <PaymentRowActions
                paymentId={p.id}
                amount={p.amount}
                notes={p.note}
                paidAt={p.paidAt}
                label={`Más acciones del pago de ${studentName}`}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

export function ClasesPanel({ data }: { data: DrawerData }) {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-sm font-semibold text-ink">Horario fijo</h3>
        {data.classes.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Sin clases fijas asignadas.</p>
        ) : (
          <ul className="mt-2 divide-y divide-edge-divider rounded-[12px] border border-edge-divider">
            {data.classes.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                <span className="text-ink">
                  {dayLong(c.dow)} · <span className="tabular-nums">{c.start}</span>
                </span>
                <span className="truncate text-[13px] text-muted">
                  {c.typeName}
                  {c.instructor ? ` · ${c.instructor}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.upcomingRecoveries.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-ink">Recuperaciones próximas</h3>
          <ul className="mt-2 divide-y divide-edge-divider rounded-[12px] border border-edge-divider">
            {data.upcomingRecoveries.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                <span className="text-ink">{shortDate(r.date)}</span>
                <span className="text-[13px] text-muted">
                  {r.typeName} · <span className="tabular-nums">{r.start}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.events.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-ink">Avisos recientes</h3>
          <ul className="mt-2 divide-y divide-edge-divider rounded-[12px] border border-edge-divider">
            {data.events.map((e, i) => (
              <li key={i} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[e.tone]}`} aria-hidden />
                <span className="flex-1 text-ink">{e.text}</span>
                <span className="text-xs text-muted">{shortDate(e.date)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export function NotasPanel({ data, fullHref }: { data: DrawerData; fullHref: string }) {
  return (
    <div className="space-y-3">
      <section>
        <h3 className="text-sm font-semibold text-ink">Salud y observaciones</h3>
        {data.healthNotes?.trim() ? (
          <p className="mt-2 whitespace-pre-wrap rounded-[12px] border border-edge-divider px-3.5 py-3 text-sm text-ink">{data.healthNotes}</p>
        ) : (
          <p className="mt-2 text-sm text-muted">Sin notas cargadas.</p>
        )}
      </section>
      <Link href={fullHref} className="inline-block text-[13px] font-medium text-moss hover:text-moss-dark">
        Editar en la ficha completa →
      </Link>
    </div>
  )
}
