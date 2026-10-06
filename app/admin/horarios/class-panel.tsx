'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Ban, Pencil, RotateCcw, X } from 'lucide-react'
import { DropdownMenu, type MenuItem } from '@/app/components/dropdown-menu'
import { useSidePanel } from '@/app/components/use-side-panel'
import { cancelClassOccurrence, uncancelClassOccurrence } from '@/app/actions/recovery'
import { cellInfo, dayLong, dayMonthLabel } from './slots'
import { NameButton } from './name-button'
import { SlotChip } from './slot-chip'
import type { ClassItem, OccurrenceData } from './types'

function Indicator({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[12px] border border-edge-divider p-3 text-center">
      <p className="text-xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}

/**
 * Detalle de una clase en una fecha. Panel a la derecha en escritorio (no oscurece la grilla)
 * y pantalla completa en celular.
 */
export function ClassPanel({
  item,
  date,
  today,
  occ,
  weekQuery,
  isMobile,
  onClose,
  onOpenStudent,
}: {
  item: ClassItem
  date: string
  today: string
  occ: OccurrenceData
  /** "?week=…" para que "Ver detalle completo" vuelva a la misma semana. */
  weekQuery: string
  isMobile: boolean
  onClose: () => void
  onOpenStudent: (studentId: string) => void
}) {
  const router = useRouter()
  const panelRef = useRef<HTMLElement>(null)
  const swipeY = useRef<number | null>(null)
  useSidePanel(panelRef, { isMobile, onClose, resetKey: `${item.id}|${date}` })

  const info = cellInfo(item, date, occ)
  const avisaronIds = new Set(info.avisaron)
  const coming = item.fixed.filter((f) => !avisaronIds.has(f.enrollmentId))
  const away = item.fixed.filter((f) => avisaronIds.has(f.enrollmentId))
  const [y, m, d] = date.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  const title = `${dayLong(dow)} ${dayMonthLabel(date)} · ${item.start}`

  async function handleCancel() {
    if (
      !confirm(
        `¿Cancelar la clase del ${dayLong(dow).toLowerCase()} ${dayMonthLabel(date)} a las ${item.start}? Los alumnos con lugar fijo no tendrán clase esa fecha.`
      )
    )
      return
    const res = await cancelClassOccurrence({ classId: item.id, sessionDate: date })
    if (res && 'error' in res && res.error) alert(res.error)
    router.refresh()
  }

  async function handleUncancel() {
    if (!confirm('¿Reactivar esta clase? Se saca la marca de cancelada de esa fecha.')) return
    const res = await uncancelClassOccurrence({ classId: item.id, sessionDate: date })
    if (res && 'error' in res && res.error) alert(res.error)
    router.refresh()
  }

  const menu: MenuItem[] = [
    { key: 'detail', label: 'Ver detalle completo', href: `/admin/horarios/${item.id}${weekQuery}` },
    { key: 'edit', label: 'Editar clase', icon: <Pencil size={15} />, href: `/admin/horarios/${item.id}/editar` },
    info.cancelledWhole
      ? { key: 'uncancel', label: 'Reactivar clase', icon: <RotateCcw size={15} />, onSelect: handleUncancel, separatorBefore: true }
      : { key: 'cancel', label: 'Cancelar clase', icon: <Ban size={15} />, onSelect: handleCancel, danger: true, separatorBefore: true },
  ]

  return (
    <>
    {/* Tablet y celular: hoja inferior; escritorio: panel a la derecha. */}
    <button type="button" aria-label="Cerrar detalle" tabIndex={-1} onClick={onClose} className="fixed inset-0 z-40 cursor-default bg-ink/30 lg:hidden" />
    <aside
      ref={panelRef}
      tabIndex={-1}
      aria-label={`Detalle de la clase: ${title}`}
      {...(isMobile ? { role: 'dialog', 'aria-modal': true } : {})}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[88vh] w-full flex-col overflow-y-auto rounded-t-[22px] bg-white outline-none md:max-h-[80vh] md:max-w-[640px] lg:inset-y-0 lg:bottom-auto lg:left-auto lg:right-0 lg:mx-0 lg:max-h-none lg:w-[420px] lg:max-w-none lg:rounded-none lg:border-l lg:border-edge lg:shadow-[-12px_0_32px_rgba(43,42,38,0.08)]"
    >
      <div
        className="flex cursor-grab justify-center pt-2 lg:hidden"
        onTouchStart={(e) => (swipeY.current = e.touches[0].clientY)}
        onTouchEnd={(e) => {
          if (swipeY.current !== null && e.changedTouches[0].clientY - swipeY.current > 60) onClose()
          swipeY.current = null
        }}
      >
        <span className="h-1.5 w-12 rounded-full bg-edge-strong" aria-hidden />
      </div>
      <div className="flex items-start gap-3 px-5 pb-4 pt-3 lg:pt-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">{item.typeName}</p>
          <h2 className="mt-0.5 font-display text-2xl font-normal italic leading-tight text-ink">{title}</h2>
          {item.instructorName && <p className="mt-1 text-sm text-muted">con {item.instructorName}</p>}
        </div>
        <button
          type="button"
          aria-label="Cerrar detalle"
          onClick={onClose}
          className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-muted transition hover:bg-moss-soft hover:text-ink"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 space-y-5 px-5 pb-5">
        {info.cancelledWhole ? (
          <div className="rounded-[14px] border border-slot-cancel bg-slot-cancel/50 p-4">
            <p className="text-sm font-semibold text-slot-cancel-ink">
              Clase cancelada · {item.fixed.length}{' '}
              {item.fixed.length === 1 ? 'alumno con lugar fijo no tiene' : 'alumnos con lugar fijo no tienen'} clase
              esta fecha
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            <Indicator label="vienen" value={coming.length} />
            <Indicator label="avisaron" value={away.length} />
            <Indicator label="recuperan" value={info.recovering.length} />
          </div>
        )}

        {info.freed > 0 && (
          <div className="rounded-[14px] border border-slot-freed-edge bg-slot-freed-soft p-4">
            <p className="text-sm font-semibold text-slot-freed-ink">
              {info.freed === 1 ? '1 lugar para recuperar' : `${info.freed} lugares para recuperar`}
            </p>
            <p className="mt-1 text-[13px] text-slot-freed-ink">
              Se liberó por una cancelación. Sirve para que alguien recupere en esta fecha; no es un lugar fijo.
            </p>
            {/* TODO: botón "Anotar recuperación". Hoy se anota desde la ficha del alumno (necesita su crédito
                de recuperación); no hay un flujo que arranque desde la clase. */}
          </div>
        )}

        <section>
          <h3 className="text-sm font-semibold text-ink">
            {info.cancelledWhole ? `Alumnos con lugar fijo (${item.fixed.length})` : `Vienen (${coming.length})`}
          </h3>
          {(info.cancelledWhole ? item.fixed : coming).length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nadie con lugar fijo.</p>
          ) : (
            <ul className="mt-2 grid grid-cols-2 gap-x-2 md:grid-cols-3 lg:grid-cols-2 gap-y-0.5 text-sm">
              {(info.cancelledWhole ? item.fixed : coming).map((f) => (
                <li key={f.enrollmentId} className="min-w-0">
                  <NameButton label={f.name} fullName={f.name} onClick={() => onOpenStudent(f.studentId)} className="w-full" />
                </li>
              ))}
            </ul>
          )}
        </section>

        {!info.cancelledWhole && away.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-ink">Avisaron que no vienen</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {away.map((f) => (
                <li key={f.enrollmentId}>
                  <NameButton
                    label={f.name}
                    fullName={f.name}
                    onClick={() => onOpenStudent(f.studentId)}
                    className="text-muted line-through"
                  />
                  {/* TODO: chip "Puede recuperar": falta leer recovery_credits en Horarios. */}
                </li>
              ))}
            </ul>
          </section>
        )}

        {!info.cancelledWhole && (
          <section>
            <h3 className="text-sm font-semibold text-ink">Vienen a recuperar</h3>
            {info.recovering.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nadie anotado para recuperar en esta clase.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {info.recovering.map((r) => (
                  <li key={r.studentId} className="flex items-center gap-2">
                    <NameButton label={r.name} fullName={r.name} onClick={() => onOpenStudent(r.studentId)} />
                    <SlotChip tone="recover">Recupera</SlotChip>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <div className="sticky bottom-0 flex items-center gap-2 border-t border-edge bg-white px-5 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        {date === today && !info.cancelledWhole && (
          <Link
            href="/instructor/pasar-lista"
            className="inline-flex h-[50px] flex-1 items-center justify-center rounded-[10px] bg-moss px-4 lg:h-[38px] text-sm font-semibold text-white transition hover:bg-moss-dark"
          >
            Pasar lista
          </Link>
        )}
        {/* TODO: "Ver asistencia" para clases ya pasadas (falta una vista de solo lectura por fecha). */}
        <div className="ml-auto">
          <DropdownMenu label="Más acciones de la clase" items={menu} buttonClassName="h-11 w-11 lg:h-[38px] lg:w-[38px]" openUp />
        </div>
      </div>
    </aside>
    </>
  )
}
