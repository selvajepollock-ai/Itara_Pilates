'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, List, Plus, Settings2, CalendarOff } from 'lucide-react'
import { PageHeader } from '@/app/components/page-header'
import { DropdownMenu, type MenuItem } from '@/app/components/dropdown-menu'
import { StudentDrawer } from '../alumnos/student-drawer'
import type { StudentRow } from '../alumnos/types'
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
  students,
  dueDay,
  pendingExtraCapacityCount,
}: {
  monday: string
  today: string
  isAdmin: boolean
  classes: ClassItem[]
  occurrences: OccurrenceData
  holidays: Record<string, string>
  students: StudentRow[]
  dueDay: number
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
  const alumnoId = params.get('alumno')

  // Cuántas entradas de historial agregamos al abrir paneles (para cerrar con "atrás").
  const pushed = useRef(0)
  useEffect(() => {
    if (!claseId && !alumnoId) pushed.current = 0
  }, [claseId, alumnoId])

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
  const drawerStudent = alumnoId ? students.find((s) => s.id === alumnoId) ?? null : null

  const weekHref = (week: string | null) => {
    const qs = new URLSearchParams()
    if (week) qs.set('week', week)
    if (vista === 'fijo') qs.set('vista', 'fijo')
    const s = qs.toString()
    return `/admin/horarios${s ? `?${s}` : ''}`
  }

  const headerMenu: MenuItem[] = [
    { key: 'holidays', label: 'Feriados', icon: <CalendarOff size={15} />, href: '/admin/horarios/feriados' },
    { key: 'types', label: 'Tipos de clase', icon: <Settings2 size={15} />, href: '/admin/tipos-de-clase' },
    { key: 'list', label: 'Lista', icon: <List size={15} />, href: '/admin/horarios/lista' },
  ]

  const tabs: { key: Vista; label: string }[] = [
    { key: 'semana', label: 'Esta semana' },
    ...(isAdmin ? [{ key: 'fijo' as const, label: 'Horario fijo' }] : []),
  ]

  const studentFixedSchedule = (studentId: string) =>
    classes
      .filter((c) => c.fixed.some((f) => f.studentId === studentId))
      .sort((a, b) => (a.dow === 0 ? 7 : a.dow) - (b.dow === 0 ? 7 : b.dow) || a.start.localeCompare(b.start))

  return (
    <div>
      <PageHeader
        title="Horarios"
        actions={
          <>
            {pendingExtraCapacityCount > 0 && <ActivateAllExtraCapacityButton pendingCount={pendingExtraCapacityCount} />}
            <DropdownMenu label="Más opciones de Horarios" items={headerMenu} buttonClassName="h-11 w-11" />
            <Link href="/admin/horarios/nuevo" className="btn-primary">
              <Plus size={16} strokeWidth={2.5} />
              Nueva clase
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

              <div className="flex flex-wrap items-center gap-2" aria-label="Resumen de la semana">
                <SlotChip tone="free">{plural(totals.fixedFree, 'lugar fijo libre', 'lugares fijos libres')}</SlotChip>
                <SlotChip tone="freed">+{totals.freed} para recuperar</SlotChip>
                <SlotChip tone="recover">{plural(totals.recovering, 'recuperación', 'recuperaciones')}</SlotChip>
                <SlotChip tone="cancel">{plural(totals.cancelled, 'clase cancelada', 'clases canceladas')}</SlotChip>
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
            selectedStudentId={alumnoId}
            onOpenStudent={(id) => updateUrl({ alumno: id }, 'push')}
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
          onOpenStudent={(id) => updateUrl({ alumno: id }, 'push')}
        />
      )}

      {drawerStudent && (
        <StudentDrawer
          student={drawerStudent}
          dueDay={dueDay}
          isMobile={isMobile}
          onClose={() => closePanel({ alumno: null })}
          fullHref={`/admin/alumnos?alumno=${drawerStudent.id}`}
          extra={<FixedSchedule studentId={drawerStudent.id} classes={studentFixedSchedule(drawerStudent.id)} />}
        />
      )}
    </div>
  )
}

/** "Sus horarios fijos": una fila por clase con lugar fijo del alumno. */
function FixedSchedule({ studentId, classes }: { studentId: string; classes: ClassItem[] }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-ink">Sus horarios fijos</h3>
      <p className="text-[13px] text-muted">
        {classes.length === 0 ? 'Sin clases fijas' : `${plural(classes.length, 'clase fija', 'clases fijas')} por semana`}
      </p>
      {classes.length > 0 && (
        <ul className="mt-2 divide-y divide-edge-divider rounded-[12px] border border-edge-divider">
          {classes.map((c) => (
            <li key={`${studentId}-${c.id}`} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
              <span className="text-ink">
                {dayLong(c.dow)} · <span className="tabular-nums">{c.start}</span>
              </span>
              <span className="text-[13px] tabular-nums text-muted">
                {c.fixed.length}/{c.capacity} en la clase
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
