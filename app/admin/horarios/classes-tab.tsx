'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, FileSpreadsheet, FileText, Pencil, Trash2, Users } from 'lucide-react'
import { DropdownMenu, type MenuItem } from '@/app/components/dropdown-menu'
import { exportToExcel, exportToPDF } from '@/lib/export'
import { deleteClass } from './actions'
import { dayLong } from './slots'
import type { ClassItem } from './types'

const WEEKDAYS = [1, 2, 3, 4, 5]
const SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const AVATAR = ['#E1EBE2', '#FDF0D5', '#EFE7FB', '#E3F0FA', '#FCE4EF', '#FDE6E1']

function avatarBg(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR[h % AVATAR.length]
}

/**
 * Pestaña "Clases": las clases que se repiten cada semana, por día.
 * Usa los mismos datos que "Esta semana" y "Horario fijo" (lugares fijos = alumnos con lugar en cada clase).
 */
export function ClassesTab({
  classes,
  today,
  day,
  prof,
  onChange,
}: {
  classes: ClassItem[]
  today: string
  /** "1".."5" o "todos" (null = el de hoy). */
  day: string | null
  /** id del instructor, o null para todos. */
  prof: string | null
  onChange: (changes: Record<string, string | null>) => void
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [exportOpen, setExportOpen] = useState(false)

  const todayDow = new Date(`${today}T12:00:00Z`).getUTCDay()
  const defaultDay = String(WEEKDAYS.includes(todayDow) ? todayDow : 1)
  const selectedDay = day === 'todos' || (day && WEEKDAYS.includes(Number(day))) ? day : defaultDay

  const instructors = useMemo(
    () => Array.from(new Set(classes.map((c) => c.instructorName).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'es')),
    [classes]
  )
  const profFilter = prof && instructors.includes(prof) ? prof : null

  const filtered = classes.filter((c) => !profFilter || c.instructorName === profFilter)
  const countByDay = (d: number) => filtered.filter((c) => c.dow === d).length
  const shownDays = selectedDay === 'todos' ? WEEKDAYS : [Number(selectedDay)]

  // La sala que usa la mayoría: si una clase tiene otra, se resalta (puede ser un error de carga).
  const commonRoom = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of classes) counts.set(c.room ?? '', (counts.get(c.room ?? '') ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
  }, [classes])

  function remove(c: ClassItem) {
    if (!confirm('¿Eliminar esta clase del horario? Esta acción no se puede deshacer.')) return
    startTransition(async () => {
      await deleteClass(c.id)
      router.refresh()
    })
  }

  const menuFor = (c: ClassItem): MenuItem[] => [
    { key: 'students', label: 'Ver alumnos', icon: <Users size={15} />, href: `/admin/horarios/${c.id}`, className: 'md:hidden' },
    { key: 'edit', label: 'Editar', icon: <Pencil size={15} />, href: `/admin/horarios/${c.id}/editar` },
    { key: 'delete', label: 'Eliminar', icon: <Trash2 size={15} />, danger: true, onSelect: () => remove(c), separatorBefore: true },
  ]

  const rowsForExport = () =>
    [...classes]
      .sort((a, b) => a.dow - b.dow || a.start.localeCompare(b.start))
      .map((c) => ({
        Día: dayLong(c.dow),
        Horario: `${c.start}–${c.end}`,
        Tipo: c.typeName,
        Sala: c.room ?? '',
        Instructor: c.instructorName ?? 'Sin instructor',
        Cupo: c.capacity,
      }))

  const seg = (active: boolean) =>
    `min-h-[40px] shrink-0 whitespace-nowrap rounded-[9px] px-3.5 text-sm transition ${
      active ? 'bg-white font-semibold text-ink shadow-sm' : 'text-muted hover:text-ink'
    }`

  return (
    <div>
      <p className="text-sm text-muted">Las clases que se repiten cada semana. Desde acá se crean, editan o eliminan.</p>

      {/* Barra de herramientas */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Día" className="-mx-4 flex gap-1 overflow-x-auto rounded-[12px] bg-edge-row p-1 px-4 md:mx-0 md:px-1">
          {WEEKDAYS.map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={selectedDay === String(d)}
              onClick={() => onChange({ dia: String(d) })}
              className={seg(selectedDay === String(d))}
            >
              {SHORT[d]} <span className="tabular-nums text-muted">{countByDay(d)}</span>
            </button>
          ))}
          <button type="button" role="tab" aria-selected={selectedDay === 'todos'} onClick={() => onChange({ dia: 'todos' })} className={seg(selectedDay === 'todos')}>
            Todos
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          Profesor
          <select
            value={profFilter ?? ''}
            onChange={(e) => onChange({ prof: e.target.value || null })}
            className="h-11 rounded-[12px] border border-edge-strong bg-white px-3 text-[16px] text-ink md:h-10 md:text-sm"
          >
            <option value="">Todos</option>
            {instructors.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="relative ml-auto">
          <button
            type="button"
            aria-expanded={exportOpen}
            onClick={() => setExportOpen((v) => !v)}
            className="inline-flex h-11 items-center gap-1.5 rounded-[12px] border border-edge-strong bg-white px-3.5 text-sm text-ink md:h-10"
          >
            Exportar <ChevronDown size={14} />
          </button>
          {exportOpen && (
            <>
              <button type="button" aria-label="Cerrar" tabIndex={-1} className="fixed inset-0 z-20 cursor-default" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 z-30 mt-1 w-44 rounded-[12px] border border-edge bg-white p-1 shadow-lg">
                <button
                  type="button"
                  className="flex min-h-[40px] w-full items-center gap-2 rounded-[8px] px-3 text-left text-sm hover:bg-moss-soft"
                  onClick={() => {
                    setExportOpen(false)
                    exportToExcel('horarios', 'Horarios', rowsForExport())
                  }}
                >
                  <FileSpreadsheet size={15} /> Excel
                </button>
                <button
                  type="button"
                  className="flex min-h-[40px] w-full items-center gap-2 rounded-[8px] px-3 text-left text-sm hover:bg-moss-soft"
                  onClick={() => {
                    setExportOpen(false)
                    const rows = rowsForExport()
                    exportToPDF(
                      'horarios',
                      'Horario semanal — Itara Pilates',
                      ['Día', 'Horario', 'Tipo', 'Sala', 'Instructor', 'Cupo'],
                      rows.map((r) => [r.Día, r.Horario, r.Tipo, r.Sala, r.Instructor, r.Cupo])
                    )
                  }}
                >
                  <FileText size={15} /> PDF
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Una tarjeta por día */}
      <div className="mt-5 space-y-5">
        {shownDays.map((d) => {
          const list = filtered.filter((c) => c.dow === d).sort((a, b) => a.start.localeCompare(b.start))
          const used = list.reduce((n, c) => n + c.fixed.length, 0)
          const total = list.reduce((n, c) => n + c.capacity, 0)
          return (
            <section key={d} className="surface-card overflow-hidden">
              <div className="flex flex-wrap items-baseline justify-between gap-2 bg-edge-head px-5 py-3.5">
                <h2 className="font-display text-[21px] font-normal italic text-ink">{dayLong(d)}</h2>
                <p className="text-sm text-muted">
                  {list.length} {list.length === 1 ? 'clase' : 'clases'} · {used} de {total} lugares fijos ocupados
                </p>
              </div>

              {list.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted">No hay clases este día.</p>
              ) : (
                <>
                  {/* Tablet y escritorio: tabla */}
                  <div className="hidden md:block">
                    <div className="grid grid-cols-[120px_1fr_1fr_140px_110px] items-center gap-3 border-b border-edge px-5 py-2 text-xs font-medium text-muted lg:grid-cols-[140px_1fr_150px_1fr_170px_150px]">
                      <span>Horario</span>
                      <span>Clase</span>
                      <span className="hidden lg:block">Sala</span>
                      <span>Profesor</span>
                      <span>Lugares fijos</span>
                      <span className="text-right">Acciones</span>
                    </div>
                    {list.map((c) => {
                      const odd = (c.room ?? '') !== commonRoom
                      return (
                        <div
                          key={c.id}
                          className="grid min-h-[56px] grid-cols-[120px_1fr_1fr_140px_110px] items-center gap-3 border-b border-edge-row px-5 py-2 last:border-b-0 hover:bg-edge-head lg:grid-cols-[140px_1fr_150px_1fr_170px_150px]"
                        >
                          <span className="text-sm font-semibold tabular-nums text-ink">
                            {c.start}–{c.end}
                          </span>
                          <span>
                            <span className="font-display text-[17px] italic text-ink">{c.typeName}</span>
                            {odd && <span className="mt-0.5 block text-xs lg:hidden"><RoomChip room={c.room ?? ''} /></span>}
                          </span>
                          <span className="hidden text-sm text-muted lg:block">{odd ? <RoomChip room={c.room ?? ''} /> : c.room}</span>
                          <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                            <Avatar name={c.instructorName} />
                            <span className="truncate">{c.instructorName ?? 'Sin instructor'}</span>
                          </span>
                          <FixedBar used={c.fixed.length} capacity={c.capacity} />
                          <span className="flex items-center justify-end gap-2">
                            <Link href={`/admin/horarios/${c.id}`} className="text-sm font-medium text-moss hover:underline">
                              Ver alumnos
                            </Link>
                            <DropdownMenu
                              label={`Más acciones de la clase de ${c.typeName} ${dayLong(c.dow)} ${c.start}`}
                              items={menuFor(c).filter((i) => i.key !== 'students')}
                              buttonClassName="h-9 w-9"
                            />
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Celular: una tarjeta por clase */}
                  <ul className="divide-y divide-edge-row md:hidden">
                    {list.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 px-4 py-3.5">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <p className="text-base font-semibold tabular-nums text-ink">
                            {c.start}–{c.end} <span className="font-display text-[15px] font-normal italic text-muted">{c.typeName}</span>
                          </p>
                          <p className="flex items-center gap-2 text-sm text-ink">
                            <Avatar name={c.instructorName} />
                            {c.instructorName ?? 'Sin instructor'}
                            {(c.room ?? '') !== commonRoom && <RoomChip room={c.room ?? ''} />}
                          </p>
                          <FixedBar used={c.fixed.length} capacity={c.capacity} />
                        </div>
                        <DropdownMenu
                          label={`Más acciones de la clase de ${c.typeName} ${dayLong(c.dow)} ${c.start}`}
                          items={menuFor(c)}
                          buttonClassName="h-11 w-11"
                        />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )
        })}
        {classes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-edge-strong bg-white/50 px-6 py-16 text-center">
            <p className="font-display text-xl italic text-ink">Todavía no hay clases cargadas</p>
            <p className="mt-2 text-sm text-muted">Creá la primera clase para armar el horario semanal del estudio.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function RoomChip({ room }: { room: string }) {
  return <span className="rounded-full bg-[#FDF0D5] px-2 py-0.5 text-[11px] font-semibold text-[#8A5A12]">{room}</span>
}

function Avatar({ name }: { name: string | null }) {
  return (
    <span
      aria-hidden
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-ink"
      style={{ background: avatarBg(name ?? '?') }}
    >
      {(name ?? '?').charAt(0).toUpperCase()}
    </span>
  )
}

function FixedBar({ used, capacity }: { used: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((used / capacity) * 100)) : 0
  return (
    <span className="flex items-center gap-2">
      <span className="h-1 w-16 overflow-hidden rounded-full bg-slot-track lg:w-24" aria-hidden>
        <span className="block h-full rounded-full bg-moss" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-sm tabular-nums text-ink">
        {used}/{capacity}
      </span>
    </span>
  )
}
