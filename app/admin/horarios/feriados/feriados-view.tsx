'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { DropdownMenu } from '@/app/components/dropdown-menu'
import { useSidePanel } from '@/app/components/use-side-panel'
import { cancelDayOccurrences, uncancelClassOccurrence } from '@/app/actions/recovery'
import { createHoliday, deleteHoliday } from '../actions'

export type DayEntry = {
  kind: 'feriado' | 'cierre'
  date: string
  label: string | null
  /** Solo feriados: id para eliminar. */
  holidayId?: string
  /** Solo cierres: clases de ese día, para reactivarlas al eliminar. */
  classIds?: string[]
}

type Impact = { classes: number; students: number }

const WEEKDAY = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MONTH = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const dowOf = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay()
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const dayLabel = (iso: string, withYear: boolean) =>
  `${cap(WEEKDAY[dowOf(iso)])} ${Number(iso.slice(8, 10))} de ${MONTH[Number(iso.slice(5, 7)) - 1]}${withYear ? ` de ${iso.slice(0, 4)}` : ''}`
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86_400_000)

const TYPES = {
  feriado: {
    emoji: '🗓️',
    bg: '#FDF0D5',
    title: 'Feriado',
    chip: 'Sin recuperación',
    chipClass: 'bg-[#F1EDE6] text-[#5E584F]',
    desc: 'Feriado nacional o día no laborable. El calendario aparece cerrado y las clases de ese día no se recuperan.',
    placeholder: 'Ej: Día de la Independencia',
  },
  cierre: {
    emoji: '⚠️',
    bg: '#FDE6E1',
    title: 'Cierre del estudio',
    chip: 'Con recuperación',
    chipClass: 'bg-[#E1EBE2] text-[#2F4A36]',
    desc: 'Corte de luz, falta un profesor o fuerza mayor. Se cancelan las clases y cada alumno anotado recibe su recuperación.',
    placeholder: 'Ej: Corte de luz',
  },
} as const

function ConfirmDialog({ title, children, confirmLabel, danger, onCancel, onConfirm, busy }: {
  title: string
  children: React.ReactNode
  confirmLabel: string
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void
  busy?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useSidePanel(ref, { isMobile: true, onClose: onCancel, resetKey: title })
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 cursor-default bg-ink/30" onClick={onCancel} />
      <div
        ref={ref}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 rounded-t-[22px] bg-white p-5 pb-[calc(20px+env(safe-area-inset-bottom))] outline-none md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[20px]"
      >
        <h2 className="font-display text-2xl italic text-ink">{title}</h2>
        <div className="mt-3 text-sm text-ink/80">{children}</div>
        <div className="mt-5 flex justify-end gap-2.5">
          <button type="button" onClick={onCancel} className="h-12 rounded-[12px] border border-edge-strong px-5 text-sm text-ink md:h-11">
            Volver
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`h-12 rounded-[12px] px-5 text-sm font-semibold text-white disabled:opacity-60 md:h-11 ${danger ? 'bg-[#9A3420]' : 'bg-moss'}`}
          >
            {busy ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function FeriadosView({
  today,
  entries,
  impactByDow,
}: {
  today: string
  entries: DayEntry[]
  /** Clases activas y alumnos anotados por día de la semana (0–6). */
  impactByDow: Record<number, Impact>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [kind, setKind] = useState<'feriado' | 'cierre'>('feriado')
  const [date, setDate] = useState('')
  const [label, setLabel] = useState('')
  const [announce, setAnnounce] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const [tab, setTab] = useState<'proximos' | 'pasados'>('proximos')
  const [toDelete, setToDelete] = useState<DayEntry | null>(null)

  const impact = date ? impactByDow[dowOf(date)] ?? { classes: 0, students: 0 } : null
  const t = TYPES[kind]

  function afterSave() {
    const params = new URLSearchParams({ modelo: kind === 'cierre' ? 'cierre' : 'feriado', fecha: date })
    if (label.trim()) params.set('motivo', label.trim())
    const go = announce
    setDate('')
    setLabel('')
    setConfirmClose(false)
    if (go) router.push(`/admin/notificaciones?${params.toString()}`)
    else router.refresh()
  }

  function save() {
    setError(null)
    startTransition(async () => {
      if (kind === 'feriado') {
        const fd = new FormData()
        fd.set('date', date)
        fd.set('label', label)
        const res = await createHoliday(fd)
        if (res?.error) return setError(res.error)
      } else {
        const res = await cancelDayOccurrences({ sessionDate: date, reason: label.trim() || undefined })
        if (res?.error) {
          setConfirmClose(false)
          return setError(res.error)
        }
      }
      afterSave()
    })
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date) return
    if (kind === 'cierre') setConfirmClose(true)
    else save()
  }

  function remove(entry: DayEntry) {
    startTransition(async () => {
      if (entry.kind === 'feriado' && entry.holidayId) await deleteHoliday(entry.holidayId)
      else for (const id of entry.classIds ?? []) await uncancelClassOccurrence({ classId: id, sessionDate: entry.date })
      setToDelete(null)
      router.refresh()
    })
  }

  const upcoming = entries.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))
  const past = entries.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date))
  const shown = tab === 'proximos' ? upcoming : past

  const field =
    'mt-1.5 w-full rounded-[12px] border border-edge-strong bg-white px-3.5 text-[16px] text-ink outline-none focus:border-moss md:text-sm'

  return (
    <div className="pb-[170px] lg:pb-0">
      <p className="text-sm text-muted">Días en que el estudio no abre. Elegí el tipo: cambia si las alumnas pueden recuperar.</p>

      <form id="feriado-form" onSubmit={onSubmit} className="surface-card mt-5 space-y-5 p-5">
        <div role="radiogroup" aria-label="Tipo de día" className="grid gap-3 md:grid-cols-2">
          {(['feriado', 'cierre'] as const).map((k) => {
            const ty = TYPES[k]
            const active = kind === k
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setKind(k)}
                className={`flex gap-3 rounded-[14px] border-2 p-3.5 text-left transition ${active ? 'border-moss bg-[#F4F8F4]' : 'border-edge-strong bg-white hover:border-moss/50'}`}
              >
                <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-[22px]" style={{ background: ty.bg }}>
                  {ty.emoji}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-ink">{ty.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ty.chipClass}`}>{ty.chip}</span>
                  </span>
                  <span className="mt-1 block text-[13px] text-ink/70">{ty.desc}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <label className="block text-sm font-medium text-ink">
            Fecha
            <input type="date" lang="es-AR" required value={date} onChange={(e) => setDate(e.target.value)} className={`${field} h-12 md:h-11`} />
            {date && <span className="mt-1 block text-xs font-normal text-muted">{cap(WEEKDAY[dowOf(date)])} {dmy(date)}</span>}
          </label>
          <label className="block text-sm font-medium text-ink">
            Motivo (opcional)
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t.placeholder} className={`${field} h-12 md:h-11`} />
            <span className="mt-1 block text-xs font-normal text-muted">Lo ven las alumnas en el calendario</span>
          </label>
        </div>

        {impact && (
          <div
            role="status"
            className={`rounded-[14px] border p-3.5 text-sm ${kind === 'cierre' ? 'border-[#F1CFC6] bg-[#FBEFEC] text-[#7A2A18]' : 'border-[#DCE7DC] bg-[#F4F8F4] text-[#2F4A36]'}`}
          >
            {impact.classes === 0 ? (
              'Ese día no hay clases programadas.'
            ) : kind === 'feriado' ? (
              <>
                ℹ️ Ese día hay <b>{impact.classes} {impact.classes === 1 ? 'clase' : 'clases'} con {impact.students} {impact.students === 1 ? 'alumno anotado' : 'alumnos anotados'}</b>. El calendario va a aparecer cerrado. No se generan recuperaciones.
              </>
            ) : (
              <>
                ⚠️ <b>Se cancelan {impact.classes} {impact.classes === 1 ? 'clase' : 'clases'} · {impact.students} {impact.students === 1 ? 'alumno recibe' : 'alumnos reciben'} recuperación.</b> Van a poder elegir otra clase con lugar de esa misma semana. El estudio aprueba cada pedido.
              </>
            )}
          </div>
        )}

        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[14px] bg-edge-head p-3.5">
          <input type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} className="mt-0.5 h-[18px] w-[18px] accent-[#5B7561]" />
          <span>
            <span className="block text-sm font-semibold text-ink">📣 Avisar a las alumnas con un comunicado</span>
            <span className="block text-[13px] text-ink/70">Te llevamos a Comunicados con el modelo ya armado. No se publica nada solo: lo revisás vos.</span>
          </span>
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="hidden justify-end lg:flex">
          <button
            type="submit"
            disabled={isPending || !date}
            className={`h-11 rounded-[12px] px-6 text-sm font-semibold text-white disabled:opacity-50 ${kind === 'cierre' ? 'bg-[#9A3420]' : 'bg-moss'}`}
          >
            {kind === 'cierre' ? 'Cerrar el estudio ese día' : 'Agregar feriado'}
          </button>
        </div>
      </form>

      {/* Celular y tablet: botón fijo abajo, arriba de la navegación */}
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-edge bg-white px-4 py-2.5 lg:hidden">
        <button
          type="submit"
          form="feriado-form"
          disabled={isPending || !date}
          className={`mx-auto block h-[50px] w-full max-w-3xl rounded-[12px] text-sm font-semibold text-white disabled:opacity-50 ${kind === 'cierre' ? 'bg-[#9A3420]' : 'bg-moss'}`}
        >
          {kind === 'cierre' ? 'Cerrar el estudio ese día' : 'Agregar feriado'}
        </button>
      </div>

      {/* Días cargados */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[22px] font-normal italic text-ink">Días cargados</h2>
          <div role="tablist" aria-label="Filtro de días" className="inline-flex gap-1 rounded-[12px] bg-edge-row p-1">
            {(['proximos', 'pasados'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`min-h-[40px] rounded-[9px] px-3.5 text-sm ${tab === k ? 'bg-white font-semibold text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                {k === 'proximos' ? 'Próximos' : 'Pasados'}
              </button>
            ))}
          </div>
        </div>

        <div className="surface-card mt-3">
          {shown.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">No hay días cargados en esta vista.</p>
          ) : (
            <ul>
              {shown.map((e) => {
                const ty = TYPES[e.kind]
                const diff = daysBetween(today, e.date)
                const when = diff < 0 ? 'ya pasó' : diff === 0 ? 'hoy' : diff === 1 ? 'mañana' : `en ${diff} días`
                const withYear = e.date.slice(0, 4) !== today.slice(0, 4)
                return (
                  <li key={`${e.kind}-${e.date}`} className={`flex items-center gap-3 border-t border-edge-row px-5 py-3.5 first:border-t-0 ${tab === 'pasados' ? 'opacity-65' : ''}`}>
                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg" style={{ background: ty.bg }}>
                      {ty.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-[18px] italic text-ink">{dayLabel(e.date, withYear)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ty.chipClass}`}>
                          {e.kind === 'feriado' ? 'Feriado · sin recuperación' : 'Cierre · con recuperación'}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[13px] text-muted">
                        {e.label || 'Sin motivo'} · {when}
                      </p>
                    </div>
                    <DropdownMenu
                      label={`Más acciones del ${dayLabel(e.date, false)}`}
                      buttonClassName="h-11 w-11"
                      items={[{ key: 'del', label: 'Eliminar', icon: <Trash2 size={15} />, danger: true, onSelect: () => setToDelete(e) }]}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {confirmClose && date && impact && (
        <ConfirmDialog
          title={`⚠️ ¿Cerrar el estudio el ${WEEKDAY[dowOf(date)]} ${Number(date.slice(8, 10))}?`}
          confirmLabel="Sí, cerrar y dar recuperaciones"
          danger
          busy={isPending}
          onCancel={() => setConfirmClose(false)}
          onConfirm={save}
        >
          Se cancelan <b>{impact.classes} {impact.classes === 1 ? 'clase' : 'clases'}</b> y <b>{impact.students} {impact.students === 1 ? 'alumno' : 'alumnos'}</b> reciben una recuperación para usar esa semana.
        </ConfirmDialog>
      )}

      {toDelete && (
        <ConfirmDialog
          title={`¿Eliminar el ${toDelete.kind === 'feriado' ? 'feriado' : 'cierre'}?`}
          confirmLabel="Eliminar"
          danger
          busy={isPending}
          onCancel={() => setToDelete(null)}
          onConfirm={() => remove(toDelete)}
        >
          {toDelete.kind === 'feriado'
            ? 'El calendario vuelve a mostrar las clases de ese día.'
            : 'Las clases de ese día se reactivan en el calendario. Las alumnas que ya recibieron una recuperación la conservan.'}
        </ConfirmDialog>
      )}
    </div>
  )
}
