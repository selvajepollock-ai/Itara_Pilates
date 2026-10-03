'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { Avatar } from '@/app/components/avatar'
import { RegisterPaymentDialog } from '../inicio/register-payment-dialog'
import { formatARS } from '@/lib/currency'
import { shortDate } from '../alumnos/format'
import { whatsappLink } from '@/lib/whatsapp'
import { Private, useMoneyHidden } from './privacy'
import { ChargePaidToggle } from './sueltas/charge-paid-toggle'
import { monthLabel } from './month-picker'

type Students = Parameters<typeof RegisterPaymentDialog>[0]['students']

export type OverdueItem = {
  studentId: string
  name: string
  planName: string | null
  amount: number
  phone: string | null
  lastPaymentAt: string | null
}

/** Lista de vencidas: nombre, plan, último pago, monto, WhatsApp y "Cobrar" (abre QuickPayment con el alumno elegido). */
export function OverdueList({ items, students }: { items: OverdueItem[]; students: Students }) {
  const router = useRouter()
  return (
    <ul>
      {items.map((d) => {
        const wa = whatsappLink(d.phone)
        const last = shortDate(d.lastPaymentAt)
        return (
          <li key={d.studentId} className="flex min-h-[58px] items-center gap-3 border-t border-edge-row py-2 first:border-t-0">
            <Avatar name={d.name} size={34} />
            <div className="min-w-0 flex-1">
              <Link href={`/admin/alumnos?alumno=${d.studentId}`} className="block truncate text-sm font-medium text-ink hover:text-moss hover:underline">
                {d.name}
              </Link>
              <p className="truncate text-xs text-muted">
                {d.planName ?? 'Sin plan'}
                {last ? ` · último pago ${last}` : ''}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">
              <Private>{formatARS(d.amount)}</Private>
            </p>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Escribir a ${d.name} por WhatsApp`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-muted transition hover:bg-moss-soft hover:text-moss"
              >
                <MessageCircle size={17} />
              </a>
            )}
            <RegisterPaymentDialog
              students={students}
              initialStudentId={d.studentId}
              onClosed={() => router.refresh()}
              className="inline-flex h-[34px] shrink-0 items-center rounded-[10px] bg-moss px-3.5 text-[13px] font-semibold text-white transition hover:bg-moss-dark"
            >
              Cobrar
            </RegisterPaymentDialog>
          </li>
        )
      })}
    </ul>
  )
}

export type PendingCharge = { id: string; studentId: string | null; name: string; description: string; amount: number }

/** Clases sueltas pendientes de cobro: usa la acción existente (Pagado / Bonificar). */
export function PendingChargesList({ items }: { items: PendingCharge[] }) {
  return (
    <ul>
      {items.map((c) => (
        <li key={c.id} className="flex min-h-[58px] items-center gap-3 border-t border-edge-row py-2 first:border-t-0">
          <Avatar name={c.name} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{c.name}</p>
            <p className="truncate text-xs text-muted">{c.description}</p>
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">
            <Private>{formatARS(c.amount)}</Private>
          </p>
          <ChargePaidToggle chargeId={c.id} paid={false} comp={false} />
        </li>
      ))}
    </ul>
  )
}

/** Cobrado por mes (últimos 6, terminando en el mes elegido). */
export function TrendChart({ trend, selected }: { trend: [string, number][]; selected: string }) {
  const max = Math.max(...trend.map(([, v]) => v), 1)
  const hasPrevious = trend.some(([k, v]) => k !== selected && v > 0)
  const current = trend.find(([k]) => k === selected)?.[1] ?? 0

  if (!hasPrevious) {
    return (
      <div className="rounded-[12px] bg-edge-head px-4 py-6 text-center">
        <p className="text-sm font-medium text-ink">Todavía no hay meses anteriores</p>
        <p className="mt-1 text-[13px] text-muted">
          El gráfico se arma a medida que se registran pagos. {monthLabel(selected).split(' ')[0]} va{' '}
          <Private>{formatARS(current)}</Private>.
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2" style={{ height: 140 }} role="img" aria-label="Cobrado por mes, últimos 6 meses">
      {trend.map(([key, value]) => (
        <div key={key} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex w-full flex-1 items-end">
            <HiddenBar value={value} max={max} active={key === selected} />
          </div>
          <span className="text-[11px] text-muted">{monthLabel(key).split(' ')[0].slice(0, 3)}</span>
        </div>
      ))}
    </div>
  )
}

/** Las barras revelan la magnitud: con montos ocultos quedan todas iguales y neutras. */
function HiddenBar({ value, max, active }: { value: number; max: number; active: boolean }) {
  const hidden = useMoneyHidden()
  return (
    <div
      className={`w-full rounded-t ${hidden ? 'bg-edge-divider' : active ? 'bg-moss' : 'bg-moss/30'}`}
      style={{ height: hidden ? '40%' : `${Math.max((value / max) * 100, 2)}%` }}
      title={hidden ? 'monto oculto' : formatARS(value)}
    />
  )
}

/** Una fila por plan: nombre, monto, porcentaje del total y barra proporcional. */
export function PlanIncome({ items }: { items: [string, number][] }) {
  const total = items.reduce((s, [, v]) => s + v, 0)
  const hidden = useMoneyHidden()
  if (items.length === 0) return <p className="mt-3 text-sm text-muted">Sin pagos este mes.</p>
  return (
    <ul className="mt-3 space-y-3">
      {items.map(([plan, amount]) => {
        const pct = total > 0 ? Math.round((amount / total) * 100) : 0
        return (
          <li key={plan}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-ink">{plan}</span>
              <span className="shrink-0 tabular-nums text-ink">
                <Private>{formatARS(amount)}</Private>
                <span className="ml-2 text-muted">{hidden ? '' : `${pct}%`}</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-edge-divider" aria-hidden>
              <div className="h-full rounded-full bg-moss" style={{ width: hidden ? '0%' : `${pct}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
