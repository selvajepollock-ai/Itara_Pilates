'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus } from 'lucide-react'
import { PageHeader } from '@/app/components/page-header'
import { BottomSheet } from '@/app/components/bottom-sheet'
import { ActivateAllExtraCapacityButton } from './activate-all-extra-capacity-button'
import { ClassPanel } from './class-panel'
import { FixedTab } from './fixed-tab'
import { SlotChip } from './slot-chip'
import { WeekTab, weekTotals } from './week-tab'
import { addDaysISO, buildColumns, dayLong, plural, visibleDays, weekRange } from './slots'
import type { ClassItem, OccurrenceData, Vista } from './types'

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

export function HorariosView({
  monday,
  today,
  isAdmin,
  classes,
  occurrences,
  holidays,
  pendingExtraCapacityCount,
}: {
  monday: string
  today: string
  isAdmin: boolean
  classes: ClassItem[]
  occurrences: OccurrenceData
  holidays: Record<string, string>
  pendingExtraCapacityCount: number
}) {
  const isMobile = useMediaQuery('(max-width: 1023px)')

  // ── Parámetros de la URL (vista, clase, fecha, alumno) ──────────────────────────────────
  // Copia local: así la pantalla responde aunque Next no detecte los cambios de history.
  const initialParams = useSearchParams()
  const [search, setSearch] = useState(() => initialParams.toString())
  useEffect(() => setSearch(initialParams.toString()), [initialParams])
  useEffect(() => {
    const onPop = () => setSearch(window.location.search.replace(/^\?/, ''))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const params = useMemo(() => new URLSearchParams(search), [search])

  const vista: Vista = params.get('vista') === 'fijo' && isAdmin ? 'fijo' : 'semana'
  const claseId = params.get('clase')
  const fecha = params.get('fecha')
  const router = useRouter()
  const goToStudent = (id: string) => router.push(`/admin/alumnos/${id}`)

  // Cuántas entradas de historial agregamos al abrir paneles (para cerrar con "atrás").
  const pushed = useRef(0)
  useEffect(() => {
    if (!claseId) pushed.current = 0
  }, [claseId])

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
      pushed.current += 1
    } else window.history.replaceState(window.history.state, '', url)
    setSearch(qs)
  }, [])

  const closePanel = useCallback(
    (changes: Record<string, string | null>) => {
      if (pushed.current > 0) {
        pushed.current -= 1
        window.history.back()
      } else updateUrl(changes)
    },
    [updateUrl]
  )

  // ── Datos de la semana ───────────────────────────────────────────────────────────────────
  const days = useMemo(() => visibleDays(classes), [classes])
  const columns = useMemo(() => buildColumns(monday, days, holidays), [monday, days, holidays])
  const totals = useMemo(() => weekTotals(classes, columns, occurrences), [classes, columns, occurrences])

  const [mobileDate, setMobileDate] = useState(() =>
    columns.some((c) => c.date === today) ? today : columns[0].date
  )
  useEffect(() => {
    setMobileDate((cur) =>
      columns.some((c) => c.date === cur) ? cur : columns.some((c) => c.date === today) ? today : columns[0].date
    )
  }, [columns, today])

  const selectedClass = claseId && fecha ? classes.find((c) => c.id === claseId) ?? null : null

  const weekHref = (week: string | null) => {
    const qs = new URLSearchParams()
    if (week) qs.set('week', week)
    if (vista === 'fijo') qs.set('vista', 'fijo')
    const s = qs.toString()
    return `/admin/horarios${s ? `?${s}` : ''}`
  }

  const [menuOpen, setMenuOpen] = useState(false)
  const headerLinks = [
    { key: 'holidays', emoji: '🗓️', bg: '#FDF0D5', long: 'Feriados y cierres', short: 'Feriados', desc: 'Días en que el estudio no abre', href: '/admin/horarios/feriados' },
    { key: 'types', emoji: '🏷️', bg: '#EFE7FB', long: 'Tipos de clase', short: 'Tipos', desc: 'Reformer, cupos y duración', href: '/admin/tipos-de-clase' },
    { key: 'list', emoji: '📋', bg: '#E3F4E6', long: 'Lista', short: 'Lista', desc: 'Todas las clases en una tabla', href: '/admin/horarios/lista' },
  ]

  const tabs: { key: Vista; label: string }[] = [
    { key: 'semana', label: 'Esta semana' },
    ...(isAdmin ? [{ key: 'fijo' as const, label: 'Horario fijo' }] : []),
  ]

  return (
    <div className="pb-[120px] lg:pb-0">
      <PageHeader
        title="Horarios"
        actions={
          <>
            {pendingExtraCapacityCount > 0 && <ActivateAllExtraCapacityButton pendingCount={pendingExtraCapacityCount} />}
            {/* Tablet y escritorio: botones visibles con nombre. */}
            {headerLinks.map((l) => (
              <Link
                key={l.key}
                href={l.href}
                className="hidden h-11 items-center gap-1.5 rounded-[12px] border border-edge-strong bg-white px-3.5 text-sm text-ink transition hover:border-moss md:inline-flex"
              >
                <span aria-hidden>{l.emoji}</span>
                <span className="lg:hidden">{l.short}</span>
                <span className="hidden lg:inline">{l.long}</span>
              </Link>
            ))}
            {/* Celular: un "⋯" que abre la hoja con las opciones. */}
            <button
              type="button"
              aria-label="Más opciones: feriados y tipos de clase"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-edge-strong bg-white text-ink md:hidden"
            >
              <MoreHorizontal size={18} />
            </button>
            <Link href="/admin/horarios/nuevo" className="btn-primary min-h-[44px]">
              <Plus size={16} strokeWidth={2.5} />
              <span className="md:hidden">Clase</span>
              <span className="hidden md:inline">Nueva clase</span>
            </Link>
          </>
        }
      />

      {/* Pestañas: control segmentado en celular, subrayado en escritorio. */}
      <div
        role="tablist"
        aria-label="Vista de horarios"
        className="mt-4 flex gap-1 rounded-[12px] bg-edge-row p-1 lg:mt-5 lg:gap-6 lg:rounded-none lg:border-b lg:border-edge lg:bg-transparent lg:p-0"
      >
        {tabs.map((t) => {
          const active = vista === t.key
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => updateUrl({ vista: t.key === 'semana' ? null : t.key, clase: null, fecha: null })}
              className={`min-h-[40px] flex-1 rounded-[9px] px-4 text-sm lg:-mb-px lg:flex-none lg:rounded-none lg:border-b-2 lg:bg-transparent lg:px-1 lg:shadow-none ${
                active
                  ? 'bg-white font-semibold text-ink shadow-sm lg:border-moss'
                  : 'text-muted hover:text-ink lg:border-transparent'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="mt-5">
        {vista === 'semana' ? (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <div className="flex items-center gap-2">
                <Link href={weekHref(addDaysISO(monday, -7))} className="icon-btn" aria-label="Semana anterior">
                  <ChevronLeft size={16} />
                </Link>
                <Link href={weekHref(null)} className="btn-secondary">
                  Hoy
                </Link>
                <Link href={weekHref(addDaysISO(monday, 7))} className="icon-btn" aria-label="Semana siguiente">
                  <ChevronRight size={16} />
                </Link>
                <span className="ml-1 text-sm font-medium text-ink">{weekRange(monday, columns.length)}</span>
              </div>

              <div className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:w-auto md:flex-wrap md:overflow-visible md:px-0 md:pb-0 [&>span]:shrink-0 [&>span]:whitespace-nowrap" aria-label="Resumen de la semana">
                <SlotChip tone="free">
                  <span className="md:hidden">{totals.fixedFree} libres</span>
                  <span className="hidden md:inline">{plural(totals.fixedFree, 'lugar fijo libre', 'lugares fijos libres')}</span>
                </SlotChip>
                <SlotChip tone="freed">+{totals.freed} para recuperar</SlotChip>
                <SlotChip tone="recover">
                  <span className="md:hidden">{totals.recovering} recuperan</span>
                  <span className="hidden md:inline">{plural(totals.recovering, 'recuperación', 'recuperaciones')}</span>
                </SlotChip>
                <SlotChip tone="cancel">
                  <span className="md:hidden">{totals.cancelled} canceladas</span>
                  <span className="hidden md:inline">{plural(totals.cancelled, 'clase cancelada', 'clases canceladas')}</span>
                </SlotChip>
              </div>
            </div>

            <WeekTab
              classes={classes}
              columns={columns}
              occ={occurrences}
              today={today}
              selected={selectedClass && fecha ? { classId: selectedClass.id, date: fecha } : null}
              mobileDate={mobileDate}
              onMobileDate={setMobileDate}
              onOpen={(classId, date) => updateUrl({ clase: classId, fecha: date }, 'push')}
            />
          </>
        ) : (
          <FixedTab
            classes={classes}
            days={days}
            selectedStudentId={null}
            onOpenStudent={goToStudent}
          />
        )}
      </div>

      {vista === 'semana' && selectedClass && fecha && (
        <ClassPanel
          item={selectedClass}
          date={fecha}
          today={today}
          occ={occurrences}
          weekQuery={`?week=${monday}`}
          isMobile={isMobile}
          onClose={() => closePanel({ clase: null, fecha: null })}
          onOpenStudent={goToStudent}
        />
      )}

      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Más opciones" className="md:hidden">
        <ul className="space-y-1">
          {headerLinks.map((l) => (
            <li key={l.key}>
              <Link href={l.href} className="flex min-h-[60px] items-center gap-3 rounded-[14px] p-2 hover:bg-edge-row">
                <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-[22px]" style={{ background: l.bg }}>
                  {l.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink">{l.long}</span>
                  <span className="block text-[13px] text-muted">{l.desc}</span>
                </span>
                <ChevronRight size={18} className="text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </div>
  )
}
