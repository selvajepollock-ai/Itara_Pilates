'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  MessageCircle,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react'
import { PageHeader } from '@/app/components/page-header'
import { Avatar } from '@/app/components/avatar'
import { StatusDot, STATUS_VIEW } from '@/app/components/status-dot'
import { DropdownMenu, type MenuItem } from '@/app/components/dropdown-menu'
import { exportToExcel } from '@/lib/export'
import { PUBLIC_SITE_URL } from '@/lib/site-url'
import { whatsappLink } from '@/lib/whatsapp'
import type { PaymentStatus } from '@/lib/billing'
import { FiltersSheet } from './filters-sheet'
import { RowActions } from './row-actions'
import { normalize, shortDate } from './format'
import {
  ESTADO_FROM_PARAM,
  ESTADO_ORDER,
  ESTADO_TO_PARAM,
  PAGE_SIZE,
  type PlanOption,
  type StudentRow,
} from './types'

type SortKey = 'nombre' | 'plan' | 'profesor' | 'estado' | 'pago'
const SORT_KEYS: SortKey[] = ['nombre', 'plan', 'profesor', 'estado', 'pago']
const STATE_RANK: Record<PaymentStatus, number> = { vencido: 0, por_vencer: 1, sin_plan: 2, bonificado: 3, al_dia: 4 }

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

const SELECT =
  'h-11 rounded-[12px] border border-edge-strong bg-white px-3 text-sm text-ink outline-none transition focus:border-moss'

export function AlumnosView({
  students,
  plans,
  dueDay,
  children,
}: {
  students: StudentRow[]
  plans: PlanOption[]
  dueDay: number
  /** Bloque que va entre el encabezado y los filtros (solicitudes nuevas de registro). */
  children?: React.ReactNode
}) {
  // Copia local de los parámetros de la URL: no depende de que Next detecte los cambios de history.
  const initialParams = useSearchParams()
  const [search, setSearch] = useState(() => initialParams.toString())
  const searchParams = useMemo(() => new URLSearchParams(search), [search])
  useEffect(() => {
    const onPop = () => setSearch(window.location.search.replace(/^\?/, ''))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const isMobile = useMediaQuery('(max-width: 1023px)')

  // ── La URL es la única fuente de verdad de filtros, orden, página y ficha abierta ──────────
  const estadoParam = searchParams.get('estado') ?? ''
  const estado = ESTADO_FROM_PARAM[estadoParam] ?? null
  const q = searchParams.get('q') ?? ''
  const profesor = searchParams.get('profesor') ?? ''
  const plan = searchParams.get('plan') ?? ''
  const sortParam = searchParams.get('orden') as SortKey | null
  const sortKey: SortKey = sortParam && SORT_KEYS.includes(sortParam) ? sortParam : 'nombre'
  const sortDir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc'
  const page = Math.max(1, parseInt(searchParams.get('pagina') ?? '1', 10) || 1)
  const router = useRouter()

  const [qInput, setQInput] = useState(q)
  useEffect(() => setQInput(q), [q])
  const [mobilePages, setMobilePages] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  /** Escribe en la URL sin pedirle nada al servidor (los datos ya están cargados). */
  const updateUrl = useCallback((changes: Record<string, string | null>, mode: 'replace' | 'push' = 'replace') => {
    const next = new URLSearchParams(window.location.search)
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    const qs = next.toString()
    const url = window.location.pathname + (qs ? `?${qs}` : '')
    if (mode === 'push') window.history.pushState({ __alumnoDrawer: true }, '', url)
    else window.history.replaceState(window.history.state, '', url)
    setSearch(qs)
  }, [])

  function setFilter(changes: Record<string, string | null>) {
    setMobilePages(1)
    updateUrl({ ...changes, pagina: null })
  }

  function clearFilters() {
    setQInput('')
    setMobilePages(1)
    updateUrl({ estado: null, q: null, profesor: null, plan: null, pagina: null })
  }

  // ── Datos derivados (todo en el cliente: son datos ya cargados) ───────────────────────────
  const instructors = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of students) if (s.instructorId && s.instructorName) map.set(s.instructorId, s.instructorName)
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [students])

  const counts = useMemo(() => {
    const c: Record<PaymentStatus, number> = { al_dia: 0, por_vencer: 0, vencido: 0, sin_plan: 0, bonificado: 0 }
    for (const s of students) c[s.status]++
    return c
  }, [students])

  const activeCount = useMemo(() => students.filter((s) => s.active).length, [students])

  const filtered = useMemo(() => {
    const text = normalize(q.trim())
    const digits = q.replace(/\D/g, '')
    let list = students.filter((s) => {
      if (estado && s.status !== estado) return false
      if (profesor === 'sin' ? s.instructorId : profesor && s.instructorId !== profesor) return false
      if (plan && s.planId !== plan) return false
      if (!text) return true
      if (
        normalize(s.fullName).includes(text) ||
        (s.nickname && normalize(s.nickname).includes(text)) ||
        normalize(s.email).includes(text) ||
        (s.displayEmail && normalize(s.displayEmail).includes(text))
      )
        return true
      return digits.length >= 3 && !!s.phone && s.phone.replace(/\D/g, '').includes(digits)
    })

    const dir = sortDir === 'desc' ? -1 : 1
    const byName = (a: StudentRow, b: StudentRow) => a.fullName.localeCompare(b.fullName, 'es')
    list = [...list].sort((a, b) => {
      let r = 0
      if (sortKey === 'plan') r = (a.planName ?? '￿').localeCompare(b.planName ?? '￿', 'es')
      else if (sortKey === 'profesor') r = (a.instructorName ?? '￿').localeCompare(b.instructorName ?? '￿', 'es')
      else if (sortKey === 'estado') r = STATE_RANK[a.status] - STATE_RANK[b.status]
      else if (sortKey === 'pago') r = (a.lastPaymentAt ?? '').localeCompare(b.lastPaymentAt ?? '')
      else r = byName(a, b)
      return r !== 0 ? r * dir : byName(a, b)
    })
    return list
  }, [students, estado, profesor, plan, q, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const desktopRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const mobileRows = filtered.slice(0, mobilePages * PAGE_SIZE)

  const activeFilterCount = (profesor ? 1 : 0) + (plan ? 1 : 0)
  const hasAnyFilter = !!(estado || q || profesor || plan)

  // ── Acciones ──────────────────────────────────────────────────────────────────────────────
  function toggleSort(key: SortKey) {
    if (sortKey === key) setFilter({ orden: key, dir: sortDir === 'asc' ? 'desc' : 'asc' })
    else setFilter({ orden: key, dir: null })
  }

  async function copyRegisterLink() {
    try {
      await navigator.clipboard.writeText(`${PUBLIC_SITE_URL}/registro`)
      setToast('Link copiado')
    } catch {
      setToast('No se pudo copiar el link')
    }
    setTimeout(() => setToast(null), 2500)
  }

  async function exportList() {
    const rows = filtered.map((s) => ({
      Alumno: s.fullName,
      Plan: s.planName ?? '',
      'Cuota mensual': s.comp ? 'Bonificado' : s.planName ? s.planPrice : '',
      Profesor: s.instructorName ?? 'Sin asignar',
      Estado: s.hasSurcharge && s.status === 'vencido' ? 'Vencido · recargo' : STATUS_VIEW[s.status].label,
      'Pagado hasta': s.endDate ?? '',
      'Último pago': shortDate(s.lastPaymentAt) ?? '',
      Teléfono: s.phone ?? '',
      Email: s.displayEmail ?? '',
      'Acceso a la app': s.hasAccess ? 'Sí' : 'No',
      'De baja': s.active ? '' : 'Sí',
    }))
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
    await exportToExcel(`alumnos-${today}`, 'Alumnos', rows)
  }

  const headerMenu: MenuItem[] = [
    { key: 'copy', label: 'Copiar link de registro', icon: <Copy size={15} />, onSelect: copyRegisterLink, className: 'lg:hidden' },
    { key: 'import', label: 'Importar', icon: <Upload size={15} />, href: '/admin/alumnos/importar' },
    { key: 'export', label: 'Exportar', icon: <Download size={15} />, onSelect: exportList },
  ]

  const chips: { key: PaymentStatus | null; label: string; count: number }[] = [
    { key: null, label: 'Todos', count: students.length },
    ...ESTADO_ORDER.map((k) => ({ key: k, label: k === 'vencido' ? 'Vencidos' : k === 'bonificado' ? 'Bonificados' : STATUS_VIEW[k].label, count: counts[k] })),
  ]

  // (función normal, no componente: así no se vuelve a montar en cada render)
  const sortHeader = (k: SortKey, label: string, className = '') => {
    const active = sortKey === k
    return (
      <th
        key={k}
        scope="col"
        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`px-4 py-3 text-left text-xs font-semibold text-muted ${className}`}
      >
        <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-ink">
          {label}
          {active && (sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
        </button>
      </th>
    )
  }

  const emptyState = (
    <div className="px-6 py-14 text-center">
      <p className="text-sm font-medium text-ink">
        {students.length === 0 ? 'Todavía no hay alumnos cargados.' : 'No hay alumnos que coincidan'}
      </p>
      {hasAnyFilter && (
        <button
          type="button"
          onClick={clearFilters}
          className="mt-3 inline-flex h-10 items-center rounded-[10px] border border-edge-strong bg-white px-4 text-sm font-medium text-ink transition hover:border-moss hover:text-moss"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )

  const subline = (s: StudentRow) =>
    s.hasAccess ? s.email : 'Sin acceso a la app'

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alumnos"
        titleAddon={`${activeCount} activos`}
        actions={
          <>
            <button
              type="button"
              onClick={copyRegisterLink}
              className="hidden h-11 items-center gap-2 rounded-[12px] border border-edge-strong bg-white px-4 text-sm font-medium text-ink transition hover:border-moss hover:text-moss lg:inline-flex"
            >
              <Copy size={15} />
              Copiar link de registro
            </button>
            <DropdownMenu label="Más opciones" items={headerMenu} buttonClassName="h-11 w-11 border-edge-strong bg-white" />
            <Link
              href="/admin/alumnos/nuevo"
              className="hidden h-11 items-center gap-2 rounded-[12px] bg-moss px-[18px] text-sm font-semibold text-white transition hover:bg-moss-dark lg:inline-flex"
            >
              <Plus size={16} />
              Nuevo alumno
            </Link>
          </>
        }
      />

      {children}

      {/* Filtros por estado */}
      <div
        role="tablist"
        aria-label="Estado de la cuota"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
      >
        {chips.map((c) => {
          const active = (c.key ?? null) === estado
          return (
            <button
              key={c.key ?? 'todos'}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter({ estado: c.key ? ESTADO_TO_PARAM[c.key] : null })}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition ${
                active ? 'border-ink bg-ink text-white' : 'border-edge-strong bg-white text-ink hover:border-ink/40'
              } ${c.count === 0 && !active ? 'opacity-50' : ''}`}
            >
              {c.key && <span aria-hidden className={`h-2 w-2 rounded-full ${STATUS_VIEW[c.key].dot}`} />}
              {c.label}
              <span className={`tabular-nums ${active ? 'text-white/80' : 'text-muted'}`}>{c.count}</span>
            </button>
          )
        })}
      </div>

      {/* Búsqueda + filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={qInput}
            autoFocus={searchParams.get('buscar') === '1'}
            onChange={(e) => {
              setQInput(e.target.value)
              setFilter({ q: e.target.value || null })
            }}
            placeholder="Buscar por nombre, email o teléfono"
            aria-label="Buscar alumno"
            className="h-11 w-full rounded-[12px] border border-edge-strong bg-white pl-10 pr-3 text-sm text-ink outline-none transition focus:border-moss"
          />
        </div>

        <select
          aria-label="Profesor"
          value={profesor}
          onChange={(e) => setFilter({ profesor: e.target.value || null })}
          className={`${SELECT} hidden lg:block`}
        >
          <option value="">Profesor: todos</option>
          {instructors.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
          <option value="sin">Sin asignar</option>
        </select>
        <select
          aria-label="Plan"
          value={plan}
          onChange={(e) => setFilter({ plan: e.target.value || null })}
          className={`${SELECT} hidden lg:block`}
        >
          <option value="">Plan: todos</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-edge-strong bg-white px-3.5 text-sm font-medium text-ink lg:hidden"
        >
          <SlidersHorizontal size={16} />
          Filtros
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-moss px-1 text-[11px] font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Tabla (escritorio) */}
      <div className="surface-card hidden lg:block">
        {filtered.length === 0 ? (
          emptyState
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="sticky top-0 z-10 bg-edge-head">
                {sortHeader('nombre', 'Alumno', 'rounded-tl-2xl')}
                {sortHeader('plan', 'Plan')}
                {sortHeader('profesor', 'Profesor')}
                {sortHeader('estado', 'Estado')}
                {sortHeader('pago', 'Último pago', 'hidden xl:table-cell')}
                <th scope="col" className="w-24 rounded-tr-2xl px-4 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {desktopRows.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => router.push(`/admin/alumnos/${s.id}`)}
                  className="h-[60px] cursor-pointer border-t border-edge-row transition hover:bg-moss-soft/60"
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.fullName} />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/alumnos/${s.id}`}
                          className="block max-w-[220px] truncate text-left text-sm font-medium text-ink hover:text-moss-dark hover:underline"
                        >
                          {s.fullName}
                        </Link>
                        <p className="max-w-[220px] truncate text-xs text-muted">
                          {subline(s)}
                          {!s.active && ' · De baja'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-ink/80">{s.planName ?? '—'}</td>
                  <td className="px-4 py-2">
                    {s.instructorName ? (
                      <span className="text-ink/80">{s.instructorName}</span>
                    ) : (
                      <span className="font-semibold text-state-none-ink">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <StatusDot status={s.status} surcharge={s.hasSurcharge} />
                  </td>
                  <td className="hidden px-4 py-2 tabular-nums text-ink/80 xl:table-cell">
                    {shortDate(s.lastPaymentAt) ?? '—'}
                  </td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <RowActions student={s} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge-row px-4 py-3">
            <p className="text-[13px] tabular-nums text-muted">
              Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de{' '}
              {filtered.length}
            </p>
            {totalPages > 1 && (
              <nav aria-label="Paginación" className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Página anterior"
                  disabled={currentPage === 1}
                  onClick={() => updateUrl({ pagina: currentPage - 1 > 1 ? String(currentPage - 1) : null })}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ink/70 hover:bg-moss-soft disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, i, arr) => (
                    <span key={p} className="flex items-center gap-1">
                      {i > 0 && p - arr[i - 1] > 1 && <span className="px-1 text-muted">…</span>}
                      <button
                        type="button"
                        aria-label={`Página ${p}`}
                        aria-current={p === currentPage ? 'page' : undefined}
                        onClick={() => updateUrl({ pagina: p > 1 ? String(p) : null })}
                        className={`h-9 min-w-9 rounded-[10px] px-2 text-sm tabular-nums ${
                          p === currentPage ? 'bg-ink font-semibold text-white' : 'text-ink/70 hover:bg-moss-soft'
                        }`}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
                <button
                  type="button"
                  aria-label="Página siguiente"
                  disabled={currentPage === totalPages}
                  onClick={() => updateUrl({ pagina: String(currentPage + 1) })}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ink/70 hover:bg-moss-soft disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </div>
        )}
      </div>

      {/* Lista (celular) */}
      <div className="surface-card lg:hidden">
        {filtered.length === 0 ? (
          emptyState
        ) : (
          <ul className="divide-y divide-edge-row">
            {mobileRows.map((s) => {
              const wa = whatsappLink(s.phone)
              return (
                <li key={s.id} className="flex items-center gap-1 pr-2">
                  <Link
                    href={`/admin/alumnos/${s.id}`}
                    className="flex min-h-[64px] min-w-0 flex-1 items-center gap-3 px-4 py-2 text-left"
                  >
                    <Avatar name={s.fullName} size={38} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{s.fullName}</span>
                      <span className="flex items-center gap-1.5 truncate text-[13px] text-muted">
                        <StatusDot status={s.status} surcharge={s.hasSurcharge} className="!text-[13px]" />
                        {s.planName && <span className="truncate">· {s.planName}</span>}
                      </span>
                    </span>
                  </Link>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Escribir a ${s.fullName} por WhatsApp`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-state-ok-ink hover:bg-moss-soft"
                    >
                      <MessageCircle size={20} />
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {filtered.length > mobileRows.length && (
          <div className="border-t border-edge-row p-3">
            <button
              type="button"
              onClick={() => setMobilePages((n) => n + 1)}
              className="h-11 w-full rounded-[12px] border border-edge-strong bg-white text-sm font-medium text-ink"
            >
              Cargar más ({filtered.length - mobileRows.length} restantes)
            </button>
          </div>
        )}
      </div>

      {/* Botón flotante: nuevo alumno (celular) */}
      <Link
        href="/admin/alumnos/nuevo"
        aria-label="Nuevo alumno"
        className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-[18px] bg-moss text-white shadow-[0_6px_18px_rgba(43,42,38,0.25)] lg:hidden"
      >
        <Plus size={24} />
      </Link>

      <FiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        instructors={instructors}
        plans={plans}
        profesor={profesor}
        plan={plan}
        onChange={(c) =>
          setFilter(
            Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v || null]))
          )
        }
        onClear={() => setFilter({ profesor: null, plan: null })}
      />

      {toast && (
        <div
          role="status"
          className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white shadow-lg lg:bottom-6"
        >
          {toast}
        </div>
      )}
    </div>
  )
}
