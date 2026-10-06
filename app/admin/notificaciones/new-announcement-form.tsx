'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye } from 'lucide-react'
import { addDaysISO } from '../horarios/slots'
import { dayTitle } from '../pagos/registro/format'
import { dayDate, monthName } from '../../alumno/format'
import { createAnnouncement } from './actions'
import { AnnouncementPreview } from './announcement-preview'
import { FREE_MODEL, ModelGrid } from './model-grid'
import { PeoplePicker, type Person } from './people-picker'
import { PreviewSheet } from './preview-sheet'
import { RECIPIENT_LABEL, RecipientCards } from './recipient-cards'
import { SummaryCard } from './summary-card'
import { ANNOUNCEMENT_MODELS, MESSAGE_SOFT_LIMIT, fillTemplate, hasBrackets, type Recipient } from './templates'

export type ClassOption = { id: string; dayOfWeek: number; start: string; typeName: string; studentCount: number }
export type UpcomingBirthday = { username: string; name: string; label: string }

type Duration = 'forever' | 'week' | 'month' | 'date'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

const FIELD =
  'w-full rounded-[12px] border border-edge-strong bg-white px-3.5 text-[16px] text-ink outline-none transition focus:border-moss lg:text-sm'
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? full

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

function Step({ n, title, aside, children }: { n: number; title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section aria-label={`Paso ${n}: ${title}`} className="surface-card space-y-3.5 p-[22px]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#2B2A26] text-[13px] font-semibold text-white">{n}</span>
          <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
        </div>
        {aside && <span className="hidden text-[13px] text-muted md:inline">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

export function NewAnnouncementForm({
  classOptions,
  people,
  counts,
  today,
  birthdays,
  loaded,
}: {
  classOptions: ClassOption[]
  people: Person[]
  counts: { students: number; instructors: number }
  today: string
  birthdays: UpcomingBirthday[]
  /** Texto de un comunicado anterior ("Usar como modelo"). */
  loaded: { text: string; nonce: number; modelId?: string } | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [target, setTarget] = useState<Recipient>('all')
  const [selectedPeople, setSelectedPeople] = useState<string[]>([])
  const [classDow, setClassDow] = useState('')
  const [classId, setClassId] = useState('')

  const [modelId, setModelId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  /** Último texto armado por un modelo: si el mensaje sigue siendo igual, no lo editó nadie y se puede actualizar solo. */
  const [autoText, setAutoText] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const [duration, setDuration] = useState<Duration>('forever')
  const [customDate, setCustomDate] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  // ── Datos de la clase y de las personas ─────────────────────────────────────────────────
  const classDays = DAY_ORDER.filter((d) => classOptions.some((c) => c.dayOfWeek === d))
  const classesOfDay = classOptions.filter((c) => String(c.dayOfWeek) === classDow).sort((a, b) => a.start.localeCompare(b.start))
  const chosenClass = classOptions.find((c) => c.id === classId) ?? null
  const targetDate = chosenClass ? nextDateForDow(today, chosenClass.dayOfWeek) : ''
  const dayLabel = (dow: number) => {
    const d = nextDateForDow(today, dow)
    return `${DAY_NAMES[dow]} ${Number(d.slice(8, 10))} de ${monthName(d)}`
  }

  const peopleByUser = useMemo(() => new Map(people.map((p) => [p.username, p])), [people])
  const names = selectedPeople.map((u) => firstName(peopleByUser.get(u)?.name ?? u))
  const fillData = { names, day: targetDate ? dayDate(targetDate) : undefined, time: chosenClass?.start }
  const fillKey = `${names.join('|')}#${fillData.day ?? ''}#${fillData.time ?? ''}`

  // Si el dato se elige después del modelo, el texto se actualiza solo… mientras nadie lo haya editado a mano.
  useEffect(() => {
    const model = ANNOUNCEMENT_MODELS.find((m) => m.id === modelId)
    if (!model || message !== autoText) return
    const next = fillTemplate(model.text, fillData)
    if (next !== message) {
      setMessage(next)
      setAutoText(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillKey, modelId])

  // "Usar como modelo" desde el historial: carga el texto en el paso 2.
  useEffect(() => {
    if (!loaded) return
    setModelId(loaded.modelId ?? FREE_MODEL)
    setMessage(loaded.text)
    setAutoText('')
    setNotice(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded?.nonce])

  function pickModel(id: string) {
    const userWrote = message.trim() !== '' && message !== autoText
    if (userWrote && !confirm('¿Reemplazar el mensaje actual?')) return
    if (id === FREE_MODEL) {
      setModelId(FREE_MODEL)
      setMessage('')
      setAutoText('')
      setNotice(null)
      return
    }
    const model = ANNOUNCEMENT_MODELS.find((m) => m.id === id)
    if (!model) return
    const text = fillTemplate(model.text, fillData)
    setModelId(id)
    setMessage(text)
    setAutoText(text)
    if (model.recipient !== target) {
      setTarget(model.recipient)
      setNotice(`Cambiamos el destinatario a "${RECIPIENT_LABEL[model.recipient]}", que es lo habitual para este modelo. Podés cambiarlo en el paso 1.`)
    } else {
      setNotice(null)
    }
  }

  // ── Duración y resumen ──────────────────────────────────────────────────────────────────
  const expiresAt = duration === 'week' ? addDaysISO(today, 7) : duration === 'month' ? addMonthISO(today) : duration === 'date' ? customDate : ''
  const expiresHint =
    duration === 'forever' || !expiresAt
      ? duration === 'date'
        ? 'Elegí hasta qué día se muestra.'
        : 'Queda visible hasta que lo elimines.'
      : `Se muestra hasta el ${lowerFirst(dayTitle(expiresAt))}.`
  const untilSummary = expiresAt ? `Hasta el ${Number(expiresAt.slice(8, 10))} de ${monthName(expiresAt)}` : 'Hasta que lo elimines'

  const toSummary =
    target === 'all'
      ? `Todos · ${counts.students} ${counts.students === 1 ? 'alumno' : 'alumnos'}`
      : target === 'people'
        ? selectedPeople.length === 0
          ? 'Sin elegir'
          : selectedPeople.length <= 2
            ? selectedPeople.map((u) => peopleByUser.get(u)?.name ?? u).join(' y ')
            : `${selectedPeople.length} personas`
        : chosenClass
          ? `${dayLabel(chosenClass.dayOfWeek).split(' de ')[0]} · ${chosenClass.start} (${chosenClass.studentCount} ${chosenClass.studentCount === 1 ? 'alumno' : 'alumnos'})`
          : 'Sin elegir'

  const scope =
    target === 'all'
      ? `Lo van a ver ${counts.students} ${counts.students === 1 ? 'alumno' : 'alumnos'}`
      : target === 'people'
        ? `Lo van a ver ${selectedPeople.length} ${selectedPeople.length === 1 ? 'persona' : 'personas'}`
        : chosenClass
          ? `Lo van a ver los ${chosenClass.studentCount} ${chosenClass.studentCount === 1 ? 'alumno' : 'alumnos'} de esa clase y su instructor`
          : 'Elegí el día y el horario de la clase'

  const pendingBrackets = hasBrackets(message)
  const canPublish =
    message.trim().length > 0 &&
    !pendingBrackets &&
    !isPending &&
    (target === 'all' || (target === 'people' && selectedPeople.length > 0) || (target === 'class' && !!chosenClass)) &&
    !(duration === 'date' && !customDate)

  function reset() {
    setMessage('')
    setAutoText('')
    setModelId(null)
    setNotice(null)
    setTarget('all')
    setSelectedPeople([])
    setClassDow('')
    setClassId('')
    setDuration('forever')
    setCustomDate('')
    setUrgent(false)
    setError(null)
  }

  function discard() {
    if (message.trim() && !confirm('¿Descartar el comunicado? Se borra lo que escribiste.')) return
    reset()
    setSuccess(false)
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!canPublish) return
    setError(null)
    setSuccess(false)
    const fd = new FormData()
    fd.set('message', message)
    fd.set('target_type', target)
    fd.set('expires_at', expiresAt)
    if (urgent) fd.set('urgent', '1')
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
    `inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-sm transition lg:min-h-[34px] ${
      active ? 'border-ink bg-ink font-medium text-white' : 'border-edge-strong bg-white text-ink hover:border-moss'
    }`

  const over = message.length > MESSAGE_SOFT_LIMIT
  const previewName = names.length === 1 ? names[0] : undefined

  const publishButtons = (
    <>
      <button
        type="button"
        onClick={() => handleSubmit()}
        disabled={!canPublish}
        className="inline-flex h-[46px] w-full items-center justify-center rounded-[12px] bg-moss text-sm font-semibold text-white transition hover:bg-moss-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Publicando...' : 'Publicar comunicado'}
      </button>
      <button type="button" onClick={discard} className="h-10 w-full rounded-[12px] text-[13.5px] text-muted hover:text-ink">
        Descartar
      </button>
      {pendingBrackets && <p className="text-center text-[12.5px] text-[#9A4A1E]">Completá los datos entre [corchetes] antes de publicar.</p>}
    </>
  )

  return (
    <div className="grid gap-6 pb-[190px] lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start lg:pb-0">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Paso 1 */}
        <Step n={1} title="¿A quién le escribís?">
          <RecipientCards
            value={target}
            onChange={(t) => {
              setTarget(t)
              setNotice(null)
            }}
            counts={counts}
          />

          {target === 'people' && (
            <div className="space-y-2">
              <PeoplePicker people={people} selected={selectedPeople} onChange={setSelectedPeople} />
              {modelId === 'cumpleanos' && birthdays.length > 0 && (
                <p className="text-[13px] text-ink/70">
                  🎂 Cumplen pronto:{' '}
                  {birthdays.map((b, i) => (
                    <span key={b.username}>
                      {i > 0 && ' · '}
                      <button
                        type="button"
                        onClick={() => !selectedPeople.includes(b.username) && setSelectedPeople([...selectedPeople, b.username])}
                        className="inline-flex min-h-[32px] items-center font-semibold text-ink underline decoration-moss/40 underline-offset-2 hover:text-moss"
                      >
                        {b.name}
                      </button>{' '}
                      ({b.label})
                    </span>
                  ))}
                </p>
              )}
            </div>
          )}

          {target === 'class' && (
            <div className="grid gap-2.5 md:grid-cols-2">
              <label className="block text-xs text-muted">
                Día y fecha
                <select
                  value={classDow}
                  onChange={(e) => {
                    setClassDow(e.target.value)
                    setClassId('')
                  }}
                  className={`${FIELD} mt-1 h-11`}
                >
                  <option value="">Elegí un día…</option>
                  {classDays.map((d) => (
                    <option key={d} value={d}>
                      {dayLabel(d)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-muted">
                Clase
                <select value={classId} disabled={!classDow} onChange={(e) => setClassId(e.target.value)} className={`${FIELD} mt-1 h-11 disabled:opacity-50`}>
                  <option value="">Elegí un horario…</option>
                  {classesOfDay.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.start} · {c.typeName} ({c.studentCount} {c.studentCount === 1 ? 'alumno' : 'alumnos'})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <p className="text-[13px] font-medium text-moss-dark" role="status">
            {scope}
          </p>
        </Step>

        {/* Paso 2 */}
        <Step n={2} title="¿Qué querés decir?" aside="Elegí un modelo o escribí desde cero">
          <ModelGrid selected={modelId} onPick={pickModel} />

          {notice && <p className="rounded-[12px] bg-moss-soft px-3 py-2.5 text-[13px] text-[#2F4A36]">{notice}</p>}

          <div>
            <label htmlFor="ann-message" className="block text-sm font-semibold text-ink">
              Mensaje
            </label>
            <textarea
              id="ann-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ej: El estudio permanece cerrado el lunes 12 de octubre por feriado."
              className={`${FIELD} mt-2 min-h-[110px] resize-y py-3 leading-[1.5] lg:text-[15px]`}
            />
            <div className="mt-1 flex justify-between gap-3 text-xs text-muted">
              <span>{pendingBrackets ? 'Reemplazá lo que está entre [corchetes].' : ''}</span>
              <span className={`tabular-nums ${over ? 'font-semibold text-slot-cancel-ink' : ''}`}>
                {message.length} / {MESSAGE_SOFT_LIMIT}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex h-11 items-center gap-2 text-sm font-medium text-moss hover:text-moss-dark lg:hidden"
          >
            <Eye size={16} /> Ver cómo queda
          </button>
        </Step>

        {/* Paso 3 */}
        <Step n={3} title="¿Cuánto tiempo se muestra?">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible">
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
          <p className="text-[13px] text-muted">{expiresHint}</p>

          <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[14px] bg-edge-head p-3.5">
            <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} className="mt-0.5 h-[18px] w-[18px] accent-[#5B7561]" />
            <span>
              <span className="block text-sm font-semibold text-ink">⭐ Es importante</span>
              <span className="block text-[13px] text-ink/70">Además de la campanita, aparece como ventana emergente cuando entran a la app.</span>
            </span>
          </label>
        </Step>

        {error && <p className="text-sm text-danger">{error}</p>}
        {success && (
          <p className="text-sm font-medium text-moss-dark" role="status">
            Comunicado publicado
          </p>
        )}
      </form>

      {/* Escritorio: vista previa y resumen, pegados a la derecha */}
      <aside className="hidden space-y-3.5 lg:sticky lg:top-4 lg:block">
        <p className="text-[13px] font-semibold text-ink/80">Así lo van a ver</p>
        <AnnouncementPreview message={message} urgent={urgent} name={previewName} />
        <SummaryCard to={toSummary} until={untilSummary} urgent={urgent}>
          {publishButtons}
        </SummaryCard>
      </aside>

      {/* Tablet y celular: barra fija abajo, encima de la navegación */}
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-edge bg-white px-4 py-2.5 lg:hidden">
        {pendingBrackets && <p className="mb-1.5 text-[12.5px] text-[#9A4A1E]">Completá los datos entre [corchetes] antes de publicar.</p>}
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[13px] text-muted">
            Para: <span className="font-medium text-ink">{toSummary}</span>
          </p>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!canPublish}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-[12px] bg-moss px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>

      <PreviewSheet open={previewOpen} onClose={() => setPreviewOpen(false)}>
        <AnnouncementPreview message={message} urgent={urgent} name={previewName} />
        <SummaryCard to={toSummary} until={untilSummary} urgent={urgent} />
      </PreviewSheet>
    </div>
  )
}
