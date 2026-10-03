'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, X } from 'lucide-react'
import { addDaysISO } from '../horarios/slots'
import { dayTitle } from '../pagos/registro/format'
import { createAnnouncement } from './actions'
import { AnnouncementPreview } from './announcement-preview'
import { PeoplePicker, type Person } from './people-picker'
import { ANNOUNCEMENT_TEMPLATES, MESSAGE_SOFT_LIMIT } from './templates'

export type ClassOption = { id: string; dayOfWeek: number; start: string; typeName: string; studentCount: number }

type Target = 'all' | 'people' | 'class'
type Duration = 'forever' | 'week' | 'month' | 'date'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

const LABEL = 'block text-sm font-semibold text-ink'
const FIELD =
  'mt-1.5 w-full rounded-[12px] border border-edge-strong bg-white px-3.5 text-sm text-ink outline-none transition focus:border-moss'
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

function addMonthISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(Date.UTC(y, m, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(d, lastDay))
  return target.toISOString().slice(0, 10)
}

/** Próxima fecha (hoy incluido) que cae en ese día de la semana. */
function nextDateForDow(today: string, dow: number) {
  const cur = new Date(`${today}T12:00:00Z`).getUTCDay()
  return addDaysISO(today, (dow - cur + 7) % 7)
}

export function NewAnnouncementForm({
  classOptions,
  people,
  counts,
  today,
}: {
  classOptions: ClassOption[]
  people: Person[]
  counts: { students: number; instructors: number }
  today: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [message, setMessage] = useState('')
  const [target, setTarget] = useState<Target>('all')
  const [selectedPeople, setSelectedPeople] = useState<string[]>([])
  const [classDow, setClassDow] = useState('')
  const [classId, setClassId] = useState('')
  const [duration, setDuration] = useState<Duration>('forever')
  const [customDate, setCustomDate] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  const classDays = DAY_ORDER.filter((d) => classOptions.some((c) => c.dayOfWeek === d))
  const classesOfDay = classOptions
    .filter((c) => String(c.dayOfWeek) === classDow)
    .sort((a, b) => a.start.localeCompare(b.start))
  const chosenClass = classOptions.find((c) => c.id === classId) ?? null
  const targetDate = chosenClass ? nextDateForDow(today, chosenClass.dayOfWeek) : ''

  const expiresAt =
    duration === 'week' ? addDaysISO(today, 7) : duration === 'month' ? addMonthISO(today) : duration === 'date' ? customDate : ''

  const expiresHint =
    duration === 'forever' || !expiresAt
      ? duration === 'date'
        ? 'Elegí hasta qué día se muestra.'
        : 'Queda visible hasta que lo elimines.'
      : `Se muestra hasta el ${lowerFirst(dayTitle(expiresAt))}.`

  const scope =
    target === 'all'
      ? `Lo van a ver ${counts.students} ${counts.students === 1 ? 'alumno' : 'alumnos'} y ${counts.instructors} ${counts.instructors === 1 ? 'instructor' : 'instructores'}`
      : target === 'people'
        ? `Lo van a ver ${selectedPeople.length} ${selectedPeople.length === 1 ? 'persona' : 'personas'}`
        : chosenClass
          ? `Lo van a ver los ${chosenClass.studentCount} ${chosenClass.studentCount === 1 ? 'alumno' : 'alumnos'} de esa clase y su instructor`
          : 'Elegí el día y el horario de la clase'

  const canPublish =
    message.trim().length > 0 &&
    !isPending &&
    (target === 'all' || (target === 'people' && selectedPeople.length > 0) || (target === 'class' && !!chosenClass)) &&
    !(duration === 'date' && !customDate)

  function applyTemplate(text: string) {
    if (message.trim() && !confirm('¿Reemplazar el mensaje actual?')) return
    setMessage(text)
  }

  function reset() {
    setMessage('')
    setTarget('all')
    setSelectedPeople([])
    setClassDow('')
    setClassId('')
    setDuration('forever')
    setCustomDate('')
    setError(null)
  }

  function discard() {
    if (message.trim() && !confirm('¿Descartar el comunicado? Se borra lo que escribiste.')) return
    reset()
    setSuccess(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canPublish) return
    setError(null)
    setSuccess(false)
    const fd = new FormData()
    fd.set('message', message)
    fd.set('target_type', target)
    fd.set('expires_at', expiresAt)
    if (target === 'people') fd.set('target_usernames', selectedPeople.join(','))
    if (target === 'class') {
      fd.set('target_class_id', classId)
      fd.set('target_date', targetDate)
    }
    startTransition(async () => {
      const result = await createAnnouncement(fd)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSuccess(true)
      reset()
      router.refresh()
    })
  }

  const chip = (active: boolean) =>
    `inline-flex min-h-[34px] shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-sm transition ${
      active ? 'border-ink bg-ink font-medium text-white' : 'border-edge-strong bg-white text-ink hover:border-moss'
    }`

  const over = message.length > MESSAGE_SOFT_LIMIT

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
      <form onSubmit={handleSubmit} className="surface-card p-[22px]">
        <h2 className="font-display text-[22px] font-normal italic leading-tight text-ink">Nuevo comunicado</h2>

        {/* 1. Modelos */}
        <div className="mt-5">
          <p className="text-sm text-muted">Empezar desde un modelo</p>
          <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
            {ANNOUNCEMENT_TEMPLATES.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => applyTemplate(t.text)}
                className="inline-flex h-[34px] shrink-0 items-center whitespace-nowrap rounded-full border border-edge-strong bg-white px-3.5 text-sm text-ink transition hover:border-moss hover:text-moss"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Mensaje */}
        <div className="mt-5">
          <label htmlFor="ann-message" className={LABEL}>
            Mensaje
          </label>
          <textarea
            id="ann-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ej: El estudio permanece cerrado el lunes 12 de octubre por feriado."
            className={`${FIELD} min-h-[110px] resize-y py-3 text-[15px] leading-[1.5]`}
          />
          <p className={`mt-1 text-right text-xs tabular-nums ${over ? 'font-semibold text-slot-cancel-ink' : 'text-muted'}`}>
            {message.length} / {MESSAGE_SOFT_LIMIT}
          </p>
        </div>

        {/* 3. Para quién */}
        <div className="mt-5">
          <p className={LABEL}>Para quién</p>
          <div role="tablist" aria-label="Destinatarios" className="mt-1.5 inline-flex gap-1 rounded-[12px] bg-edge-row p-1">
            {(
              [
                ['all', 'Todos'],
                ['people', 'Personas puntuales'],
                ['class', 'Una clase'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={target === key}
                onClick={() => setTarget(key)}
                className={`min-h-[40px] rounded-[9px] px-3.5 text-sm transition ${
                  target === key ? 'bg-white font-semibold text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {target === 'people' && (
            <div className="mt-3">
              <PeoplePicker people={people} selected={selectedPeople} onChange={setSelectedPeople} />
            </div>
          )}

          {target === 'class' && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ann-day" className="block text-sm text-muted">
                  Día
                </label>
                <select
                  id="ann-day"
                  value={classDow}
                  onChange={(e) => {
                    setClassDow(e.target.value)
                    setClassId('')
                  }}
                  className={`${FIELD} h-11`}
                >
                  <option value="">Elegí un día…</option>
                  {classDays.map((d) => (
                    <option key={d} value={d}>
                      {DAY_NAMES[d]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ann-class" className="block text-sm text-muted">
                  Horario
                </label>
                <select
                  id="ann-class"
                  value={classId}
                  disabled={!classDow}
                  onChange={(e) => setClassId(e.target.value)}
                  className={`${FIELD} h-11 disabled:opacity-50`}
                >
                  <option value="">Elegí un horario…</option>
                  {classesOfDay.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.start} · {c.typeName} ({c.studentCount} {c.studentCount === 1 ? 'alumno' : 'alumnos'})
                    </option>
                  ))}
                </select>
              </div>
              {chosenClass && (
                <p className="text-xs text-muted sm:col-span-2">
                  Se muestra para la clase del {lowerFirst(dayTitle(targetDate))}.
                </p>
              )}
            </div>
          )}

          <p className="mt-3 text-[13px] font-medium text-moss-dark" role="status">
            {scope}
          </p>
        </div>

        {/* 4. Cuánto tiempo se muestra */}
        <div className="mt-5">
          <p className={LABEL}>Cuánto tiempo se muestra</p>
          <div className="-mx-1 mt-1.5 flex gap-2 overflow-x-auto px-1 pb-1">
            {(
              [
                ['forever', 'Hasta que lo elimine'],
                ['week', '1 semana'],
                ['month', '1 mes'],
                ['date', 'Hasta una fecha'],
              ] as const
            ).map(([key, label]) => (
              <button key={key} type="button" aria-pressed={duration === key} onClick={() => setDuration(key)} className={chip(duration === key)}>
                {label}
              </button>
            ))}
          </div>
          {duration === 'date' && (
            <input
              type="date"
              lang="es-AR"
              aria-label="Mostrar hasta"
              min={today}
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className={`${FIELD} h-11 max-w-[220px]`}
            />
          )}
          <p className="mt-2 text-[13px] text-muted">{expiresHint}</p>
        </div>

        {/* 5. Acciones */}
        <div className="mt-6 border-t border-edge-divider pt-4">
          {error && <p className="mb-3 text-sm text-danger">{error}</p>}
          {success && (
            <p className="mb-3 text-sm font-medium text-moss-dark" role="status">
              Comunicado publicado
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex h-11 items-center gap-2 text-sm font-medium text-moss hover:text-moss-dark lg:hidden"
            >
              <Eye size={16} /> Ver cómo queda
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={discard} className="btn-secondary">
                Descartar
              </button>
              <button type="submit" disabled={!canPublish} className="btn-primary hidden disabled:opacity-50 lg:inline-flex">
                {isPending ? 'Publicando...' : 'Publicar comunicado'}
              </button>
            </div>
          </div>
        </div>

        {/* Celular: "Publicar" fijo, sobre la barra de navegación, cuando hay texto. */}
        {message.trim() && (
          <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 border-t border-edge bg-white px-4 py-3 lg:hidden">
            <button type="submit" disabled={!canPublish} className="btn-primary w-full justify-center disabled:opacity-50">
              {isPending ? 'Publicando...' : 'Publicar comunicado'}
            </button>
          </div>
        )}
      </form>

      {/* Vista previa (escritorio) */}
      <aside className="hidden lg:sticky lg:top-6 lg:block">
        <p className="mb-3 text-[13px] font-semibold text-ink">Así lo van a ver</p>
        <AnnouncementPreview message={message} />
      </aside>

      {/* Vista previa (celular): hoja inferior */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Así lo van a ver">
          <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-ink/30" onClick={() => setPreviewOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink">Así lo van a ver</p>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setPreviewOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-[10px] text-muted hover:bg-moss-soft"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-2">
              <AnnouncementPreview message={message} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
