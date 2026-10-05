'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { Avatar } from '@/app/components/avatar'
import { normalize } from '../../alumnos/format'
import { formatARS } from '@/lib/currency'
import { MonthPicker } from '../month-picker'
import { monthLabel } from '../month-label'
import { Private, useMoneyHidden } from '../privacy'
import { ExportMenu, type ExportSet } from './export-menu'
import { PayCalendar } from './pay-calendar'
import { PaymentRowActions } from './payment-row-actions'
import { ExtraChargeActions } from './extra-charge-actions'
import { dayNumber, dayTitle, monthName, shortMoney } from './format'
import type { RegistroRow } from './types'

type TipoFiltro = 'todos' | 'cuotas' | 'sueltas'

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const onChange = () => setMatches(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

const addMonth = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

const SEG =
  'min-h-[40px] rounded-[9px] px-3.5 text-sm transition'

export function RegistroView({
  month,
  today,
  rows,
}: {
  month: string
  today: string
  rows: RegistroRow[]
}) {
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const currentMonth = today.slice(0, 7)

  // ── Filtros en la URL (copia local, como en Alumnos y Horarios) ─────────────────────────
  const initialParams = useSearchParams()
  const [search, setSearch] = useState(() => initialParams.toString())
  useEffect(() => setSearch(initialParams.toString()), [initialParams])
  useEffect(() => {
    const onPop = () => setSearch(window.location.search.replace(/^\?/, ''))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const params = useMemo(() => new URLSearchParams(search), [search])

  const tipoParam = params.get('tipo')
  const tipo: TipoFiltro = tipoParam === 'cuotas' || tipoParam === 'sueltas' ? tipoParam : 'todos'
  const registro = params.get('registro') ?? ''
  const q = params.get('q') ?? ''
  const showVoided = params.get('anulados') === '1'
  const diaParam = params.get('dia')
  const router = useRouter()
  const dia = diaParam && diaParam.startsWith(month) ? diaParam : null
  // En celular, sin día elegido se muestra "hoy" (si estamos en el mes actual).
  const effectiveDia = dia ?? (isMobile && month === currentMonth ? today : null)

  const [qInput, setQInput] = useState(q)
  useEffect(() => setQInput(q), [q])

  const updateUrl = useCallback((changes: Record<string, string | null>, mode: 'replace' | 'push' = 'replace') => {
    const next = new URLSearchParams(window.location.search)
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    const qs = next.toString()
    const url = window.location.pathname + (qs ? `?${qs}` : '')
    if (mode === 'push') {
      window.history.pushState(window.history.state, '', url)
    } else window.history.replaceState(window.history.state, '', url)
    setSearch(qs)
  }, [])

  // ── Datos filtrados ──────────────────────────────────────────────────────────────────────
  const team = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of rows) if (r.recordedById && r.recordedByName) map.set(r.recordedById, r.recordedByName)
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [rows])

  /** Filtros que no dependen del día (sirven también para pintar el calendario). */
  const baseFiltered = useMemo(() => {
    const text = normalize(q.trim())
    return rows.filter((r) => {
      if (r.voided && !showVoided) return false
      if (tipo === 'cuotas' && r.kind !== 'cuota') return false
      if (tipo === 'sueltas' && r.kind !== 'suelta') return false
      if (registro && r.recordedById !== registro) return false
      if (text && !normalize(r.studentName).includes(text)) return false
      return true
    })
  }, [rows, tipo, registro, q, showVoided])

  const dayTotals = useMemo(() => {
    const t: Record<string, number> = {}
    for (const r of baseFiltered) if (!r.voided) t[r.date] = (t[r.date] ?? 0) + r.amount
    return t
  }, [baseFiltered])

  const scoped = useMemo(
    () => (effectiveDia ? baseFiltered.filter((r) => r.date === effectiveDia) : baseFiltered),
    [baseFiltered, effectiveDia]
  )

  const groups = useMemo(() => {
    const map = new Map<string, RegistroRow[]>()
    for (const r of scoped) {
      if (!map.has(r.date)) map.set(r.date, [])
      map.get(r.date)!.push(r)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [scoped])

  const live = scoped.filter((r) => !r.voided)
  const total = live.reduce((s, r) => s + r.amount, 0)
  const cuotas = live.filter((r) => r.kind === 'cuota')
  const sueltas = live.filter((r) => r.kind === 'suelta')
  const byPerson = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number }>()
    for (const r of live) {
      if (!r.recordedById || !r.recordedByName) continue
      const cur = map.get(r.recordedById) ?? { name: r.recordedByName, count: 0, total: 0 }
      cur.count++
      cur.total += r.amount
      map.set(r.recordedById, cur)
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [live])

  const sum = (list: RegistroRow[]) => list.reduce((s, r) => s + r.amount, 0)

  const scopeTitle = effectiveDia
    ? `Total del ${dayTitle(effectiveDia).charAt(0).toLowerCase()}${dayTitle(effectiveDia).slice(1)}`
    : month === currentMonth
      ? `Total de ${monthName(month)} hasta hoy`
      : `Total de ${monthName(month)}`

  // Exports: siguen separados (cuotas / clases sueltas) y respetan los filtros activos.
  const exportSets: ExportSet[] = useMemo(() => {
    const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
    const sets: ExportSet[] = []
    const c = scoped.filter((r) => r.kind === 'cuota')
    const s = scoped.filter((r) => r.kind === 'suelta')
    const scope = effectiveDia ?? month
    if (tipo !== 'sueltas')
      sets.push({
        label: 'Cuotas',
        filename: `cuotas-${scope}`,
        sheetName: 'Cuotas',
        title: `Cuotas ${scope}`,
        rows: c.map((r) => ({
          Fecha: fmt(r.paidAt),
          Alumno: r.studentName,
          Plan: r.concept,
          Monto: r.voided ? 0 : r.amount,
          Nota: r.note,
          Registró: r.recordedByName ?? '—',
          Estado: r.voided ? `Anulado: ${r.voidedReason}` : 'OK',
        })),
      })
    if (tipo !== 'cuotas')
      sets.push({
        label: 'Clases sueltas',
        filename: `clases-sueltas-${scope}`,
        sheetName: 'Clases sueltas',
        title: `Clases sueltas ${scope}`,
        rows: s.map((r) => ({
          'Fecha pago': fmt(r.paidAt),
          Alumno: r.studentName,
          Concepto: r.concept,
          Monto: r.amount,
          Estado: 'Pagado',
        })),
      })
    return sets
  }, [scoped, tipo, effectiveDia, month])

  const goMonth = (ym: string) => {
    const qs = new URLSearchParams(search)
    qs.set('mes', ym)
    qs.delete('dia')
    return `/admin/pagos/registro?${qs.toString()}`
  }

  const tipoOptions: { key: TipoFiltro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'cuotas', label: 'Cuotas' },
    { key: 'sueltas', label: 'Clases sueltas' },
  ]

  const openStudent = (id: string | null) => id && router.push(`/admin/alumnos/${id}`)

  const rowView = (r: RegistroRow) => (
    <li
      key={`${r.kind}-${r.id}`}
      className="flex min-h-[54px] items-center gap-3 border-t border-edge-row px-4 py-2 first:border-t-0"
    >
      <Avatar name={r.studentName} size={32} />
      <div className="min-w-0 flex-1 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,0.7fr)] lg:items-center lg:gap-4">
        <div className="min-w-0">
          {r.studentId ? (
            <button
              type="button"
              onClick={() => openStudent(r.studentId)}
              className="max-w-full truncate text-left text-sm font-medium text-ink hover:text-moss hover:underline"
            >
              {r.studentName}
            </button>
          ) : (
            <p className="truncate text-sm font-medium text-ink">{r.studentName}</p>
          )}
          <p className="truncate text-xs text-muted lg:hidden">
            {r.kind === 'cuota' ? 'Cuota' : 'Suelta'} · {r.concept}
            {r.recordedByName ? ` · ${r.recordedByName}` : ''}
          </p>
        </div>
        <div className="hidden min-w-0 lg:block">
          <div className="flex items-center gap-2">
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                r.kind === 'cuota' ? 'bg-slot-free text-slot-free-ink' : 'bg-info-soft text-info-ink'
              }`}
            >
              {r.kind === 'cuota' ? 'Cuota' : 'Suelta'}
            </span>
            <span className="truncate text-sm text-ink">{r.concept}</span>
            {r.voided && (
              <span className="shrink-0 rounded-full bg-slot-full px-2 py-0.5 text-[11px] font-semibold text-slot-full-ink">
                Anulado
              </span>
            )}
          </div>
          {(r.voided ? r.voidedReason : r.note) && (
            <p className="truncate text-xs text-muted">{r.voided ? `Anulado: ${r.voidedReason}` : r.note}</p>
          )}
        </div>
        <p className="hidden truncate text-sm text-muted lg:block">{r.recordedByName ?? '—'}</p>
      </div>
      <p
        className={`shrink-0 text-right text-sm font-semibold tabular-nums ${r.voided ? 'text-muted line-through' : 'text-ink'}`}
      >
        <Private>{formatARS(r.amount)}</Private>
      </p>
      <div className="w-[34px] shrink-0">
        {r.voided ? null : r.kind === 'cuota' ? (
          <PaymentRowActions
            paymentId={r.id}
            amount={r.amount}
            notes={r.note}
            paidAt={r.paidAt}
            label={`Más acciones del pago de ${r.studentName}`}
          />
        ) : (
          <ExtraChargeActions chargeId={r.id} label={`Más acciones de la clase suelta de ${r.studentName}`} />
        )}
      </div>
    </li>
  )

  return (
    <div>
      {/* ── Barra de herramientas ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={goMonth(addMonth(month, -1))} className="icon-btn" aria-label="Mes anterior">
            <ChevronLeft size={16} />
          </Link>
          <Link href={goMonth(currentMonth)} className="btn-secondary">
            Hoy
          </Link>
          {month < currentMonth ? (
            <Link href={goMonth(addMonth(month, 1))} className="icon-btn" aria-label="Mes siguiente">
              <ChevronRight size={16} />
            </Link>
          ) : (
            <span className="icon-btn pointer-events-none opacity-40" aria-hidden>
              <ChevronRight size={16} />
            </span>
          )}
          <h2 className="ml-1 font-display text-2xl italic text-ink">
            {effectiveDia && !isMobile ? dayTitle(effectiveDia) : monthLabel(month)}
          </h2>
          {dia && (
            <button
              type="button"
              onClick={() => updateUrl({ dia: null })}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-moss-soft px-3 text-xs font-medium text-moss-dark hover:bg-slot-free"
            >
              Ver todo {monthName(month)} <X size={12} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthPicker param="mes" value={month} currentMonth={currentMonth} clear={['dia']} />
          <ExportMenu sets={exportSets} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        <div
          role="tablist"
          aria-label="Tipo de pago"
          className="flex gap-1 rounded-[12px] bg-edge-row p-1"
        >
          {tipoOptions.map((o) => (
            <button
              key={o.key}
              type="button"
              role="tab"
              aria-selected={tipo === o.key}
              onClick={() => updateUrl({ tipo: o.key === 'todos' ? null : o.key })}
              className={`${SEG} ${tipo === o.key ? 'bg-white font-semibold text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          Registró
          <select
            value={registro}
            onChange={(e) => updateUrl({ registro: e.target.value || null })}
            className="h-11 rounded-[12px] border border-edge-strong bg-white px-3 text-sm text-ink outline-none focus:border-moss"
          >
            <option value="">Todos</option>
            {team.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="relative block">
          <span className="sr-only">Buscar alumno</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={qInput}
            onChange={(e) => {
              setQInput(e.target.value)
              updateUrl({ q: e.target.value || null })
            }}
            placeholder="Buscar alumno"
            className="h-11 w-full min-w-[220px] rounded-[12px] border border-edge-strong bg-white pl-9 pr-3 text-sm text-ink outline-none transition focus:border-moss"
          />
        </label>

        <label className="flex min-h-[44px] items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={showVoided}
            onChange={(e) => updateUrl({ anulados: e.target.checked ? '1' : null })}
            className="h-4 w-4 accent-[#5B7561]"
          />
          Ver anulados
        </label>
      </div>

      {/* ── Celular: tira de días y tarjeta del día ───────────────────────────────────────── */}
      <div className="mt-4 lg:hidden">
        <DayStrip month={month} today={today} totals={dayTotals} selected={effectiveDia} onSelect={(d) => updateUrl({ dia: d })} />
        <div className="mt-3 rounded-[14px] bg-moss-soft p-4">
          <p className="text-xs text-muted">{scopeTitle}</p>
          <p className="mt-1 text-[28px] font-semibold leading-none tabular-nums text-ink">
            <Private>{formatARS(total)}</Private>
          </p>
          <p className="mt-1 text-sm text-muted">
            {live.length} {live.length === 1 ? 'pago' : 'pagos'}
          </p>
          {byPerson.length > 0 && (
            <p className="mt-1 text-[13px] text-muted">
              {byPerson.map((p, i) => (
                <span key={p.name}>
                  {i > 0 && ' · '}
                  {p.name.split(' ')[0]} <Private mask="$ ••••">{formatARS(p.total)}</Private>
                </span>
              ))}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* ── Grupos por día ─────────────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {groups.length === 0 ? (
            <p className="surface-card px-4 py-10 text-center text-sm text-muted">
              No hay pagos de este tipo en el período.
            </p>
          ) : (
            groups.map(([date, list]) => {
              const dayTotal = sum(list.filter((r) => !r.voided))
              const count = list.filter((r) => !r.voided).length
              return (
                <section key={date} className="surface-card">
                  <header className="flex items-center justify-between gap-3 rounded-t-[16px] bg-edge-head px-4 py-3">
                    <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                      {dayTitle(date)}
                      {date === today && (
                        <span className="rounded-full bg-moss px-2 py-px text-[10px] font-semibold text-white">Hoy</span>
                      )}
                      <span className="font-normal text-muted">
                        {count} {count === 1 ? 'pago' : 'pagos'}
                      </span>
                    </h3>
                    <p className="text-base font-semibold tabular-nums text-ink">
                      <Private>{formatARS(dayTotal)}</Private>
                    </p>
                  </header>
                  <ul>{list.map(rowView)}</ul>
                </section>
              )
            })
          )}
        </div>

        {/* ── Columna lateral ─────────────────────────────────────────────────────────────── */}
        <aside className="hidden space-y-4 lg:sticky lg:top-6 lg:block">
          <div className="surface-card p-4">
            <PayCalendar month={month} today={today} totals={dayTotals} selected={dia} onSelect={(d) => updateUrl({ dia: d })} />
          </div>

          <div className="surface-card p-5">
            <p className="text-sm text-muted">{scopeTitle}</p>
            <p className="mt-2 text-[28px] font-semibold leading-none tabular-nums text-ink">
              <Private>{formatARS(total)}</Private>
            </p>
            <p className="mt-1 text-sm text-muted">
              {live.length} {live.length === 1 ? 'pago' : 'pagos'}
            </p>
            <dl className="mt-4 space-y-1.5 border-t border-edge-divider pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Cuotas</dt>
                <dd className="tabular-nums text-ink">
                  <Private>{formatARS(sum(cuotas))}</Private>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Clases sueltas</dt>
                <dd className="tabular-nums text-ink">
                  <Private>{formatARS(sum(sueltas))}</Private>
                </dd>
              </div>
            </dl>
            {byPerson.length > 0 && (
              <div className="mt-3 border-t border-edge-divider pt-3">
                <p className="text-xs font-semibold text-muted">Registró</p>
                <ul className="mt-1.5 space-y-1.5 text-sm">
                  {byPerson.map((p) => (
                    <li key={p.name} className="flex justify-between gap-2">
                      <span className="text-ink">
                        {p.name} <span className="text-muted">· {p.count}</span>
                      </span>
                      <span className="tabular-nums text-ink">
                        <Private>{formatARS(p.total)}</Private>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>

    </div>
  )
}

/** Tira horizontal de días del mes (celular). */
function DayStrip({
  month,
  today,
  totals,
  selected,
  onSelect,
}: {
  month: string
  today: string
  totals: Record<string, number>
  selected: string | null
  onSelect: (day: string | null) => void
}) {
  const hidden = useMoneyHidden()
  const [y, m] = month.split('-').map(Number)
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const days = Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`).filter(
    (d) => d <= today
  )
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [selected, month])
  const W = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

  return (
    <div ref={ref} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {days.map((d) => {
        const total = totals[d] ?? 0
        const active = selected === d
        return (
          <button
            key={d}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(active ? null : d)}
            className={`flex h-[72px] w-14 shrink-0 flex-col items-center justify-center rounded-[12px] border text-xs ${
              active
                ? 'border-moss bg-moss text-white'
                : total > 0
                  ? 'border-transparent bg-slot-free text-slot-free-ink'
                  : 'border-edge bg-white text-ink'
            }`}
          >
            <span className="opacity-80">{W[new Date(`${d}T12:00:00Z`).getUTCDay()]}</span>
            <span className="text-base font-semibold tabular-nums">{dayNumber(d)}</span>
            <span className="text-[10px] tabular-nums">{total > 0 ? (hidden ? '••' : shortMoney(total)) : '—'}</span>
          </button>
        )
      })}
    </div>
  )
}
