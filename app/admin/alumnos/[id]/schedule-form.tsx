'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { enrollStudent, removeEnrollment } from '../../horarios/actions'
import { DAY_NAMES, formatTime } from '@/lib/day-names'

type ClassOption = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  capacity: number
  room: string
  typeName: string
  enrolled: number
  enrollmentId: string | null
}

function TimeGrid({
  options,
  pending,
  onToggle,
}: {
  options: ClassOption[]
  pending: Record<string, boolean>
  onToggle: (option: ClassOption, willBeChecked: boolean) => void
}) {
  const days = Array.from(new Set(options.map((o) => o.dayOfWeek))).sort((a, b) => {
    const order = [1, 2, 3, 4, 5, 6, 0]
    return order.indexOf(a) - order.indexOf(b)
  })
  const hours = Array.from(new Set(options.map((o) => o.startTime))).sort()

  function cellFor(day: number, hour: string) {
    return options.find((o) => o.dayOfWeek === day && o.startTime === hour) ?? null
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[480px] gap-1"
        style={{ gridTemplateColumns: `52px repeat(${days.length}, 1fr)` }}
      >
        <div />
        {days.map((day) => (
          <div
            key={day}
            className="pb-1 text-center text-[10px] font-medium uppercase tracking-wide text-ink/40"
          >
            {DAY_NAMES[day].slice(0, 3)}
          </div>
        ))}

        {hours.map((hour) => (
          <Fragment key={hour}>
            <div key={`h-${hour}`} className="flex items-center text-[11px] text-ink/40">
              {formatTime(hour)}
            </div>
            {days.map((day) => {
              const opt = cellFor(day, hour)
              if (!opt) return <div key={`${day}-${hour}`} />

              const originalChecked = Boolean(opt.enrollmentId)
              const isChecked = opt.id in pending ? pending[opt.id] : originalChecked
              const isDirty = opt.id in pending && pending[opt.id] !== originalChecked
              const isFull = opt.enrolled >= opt.capacity && !originalChecked

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onToggle(opt, !isChecked)}
                  title={
                    isFull
                      ? `Completo (${opt.enrolled}/${opt.capacity}) — se puede anotar igual`
                      : `${opt.enrolled}/${opt.capacity} ocupado`
                  }
                  className={`h-8 rounded-md border text-[11px] transition ${
                    isChecked
                      ? 'bg-moss text-white border-moss'
                      : isFull
                        ? 'border-clay/40 bg-clay/10 text-clay hover:border-clay'
                        : 'border-sand bg-linen/40 text-ink/50 hover:border-moss hover:text-ink'
                  } ${isDirty ? 'ring-2 ring-offset-1 ring-clay/50' : ''}`}
                >
                  {isChecked ? '✓' : isFull ? '!' : ''}
                </button>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

export function StudentScheduleForm({
  studentId,
  classOptions,
}: {
  studentId: string
  classOptions: ClassOption[]
}) {
  const router = useRouter()
  const [showFuerza, setShowFuerza] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // pending[optionId] = true (debería quedar tildado) | false (debería quedar destildado)
  const [pending, setPending] = useState<Record<string, boolean>>({})

  const reformer = classOptions.filter((o) => !o.typeName.toLowerCase().includes('fuerza'))
  const fuerza = classOptions.filter((o) => o.typeName.toLowerCase().includes('fuerza'))
  const fuerzaAssignedCount = fuerza.filter((o) =>
    o.id in pending ? pending[o.id] : Boolean(o.enrollmentId)
  ).length

  const changedCount = useMemo(() => {
    return classOptions.filter((o) => {
      const original = Boolean(o.enrollmentId)
      return o.id in pending && pending[o.id] !== original
    }).length
  }, [pending, classOptions])

  function handleToggle(option: ClassOption, willBeChecked: boolean) {
    const originalChecked = Boolean(option.enrollmentId)
    const isFull = option.enrolled >= option.capacity && !originalChecked

    if (willBeChecked && isFull) {
      const ok = confirm(
        `Esta clase ya está completa (${option.enrolled}/${option.capacity}). ¿Marcarla igual, por encima del cupo?`
      )
      if (!ok) return
    }

    setPending((prev) => {
      const next = { ...prev }
      if (willBeChecked === originalChecked) {
        delete next[option.id] // volvió al estado original, ya no es un cambio pendiente
      } else {
        next[option.id] = willBeChecked
      }
      return next
    })
  }

  function handleUndo() {
    setPending({})
    setError(null)
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      for (const option of classOptions) {
        if (!(option.id in pending)) continue
        const willBeChecked = pending[option.id]
        const originalChecked = Boolean(option.enrollmentId)
        if (willBeChecked === originalChecked) continue

        if (willBeChecked) {
          const formData = new FormData()
          formData.set('student_id', studentId)
          const res = await enrollStudent(option.id, formData)
          if (res?.error) {
            setError(`${option.typeName} ${option.startTime}: ${res.error}`)
            return
          }
        } else if (option.enrollmentId) {
          const res = await removeEnrollment(option.enrollmentId, option.id)
          if (res?.error) {
            setError(`${option.typeName} ${option.startTime}: ${res.error}`)
            return
          }
        }
      }
      setPending({})
      router.refresh()
    })
  }

  if (classOptions.length === 0) {
    return (
      <p className="mt-3 rounded-2xl border border-dashed border-sand bg-white/50 px-5 py-8 text-center text-sm text-ink/40">
        Todavía no hay clases cargadas en Horarios.
      </p>
    )
  }

  return (
    <div className="mt-3 space-y-5 rounded-2xl border border-sand bg-white p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-moss">Pilates Reformer</p>
        <p className="mt-1 text-[11px] text-ink/40">
          Tildá/destildá lo que necesites y después guardá — nada se aplica hasta que apretés "Guardar cambios".
        </p>
        <div className="mt-2">
          <TimeGrid options={reformer} pending={pending} onToggle={handleToggle} />
        </div>
      </div>

      {fuerza.length > 0 && (
        <div className="border-t border-sand pt-4">
          <button
            type="button"
            onClick={() => setShowFuerza((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-ink/50">
              + Agregar clases de Fuerza (opcional)
              {fuerzaAssignedCount > 0 && (
                <span className="ml-2 rounded-full bg-clay/10 px-2 py-0.5 text-clay">
                  {fuerzaAssignedCount} asignada{fuerzaAssignedCount > 1 ? 's' : ''}
                </span>
              )}
            </span>
            <ChevronDown
              size={16}
              className={`text-ink/40 transition ${showFuerza ? 'rotate-180' : ''}`}
            />
          </button>
          {showFuerza && (
            <div className="mt-3">
              <TimeGrid options={fuerza} pending={pending} onToggle={handleToggle} />
            </div>
          )}
        </div>
      )}

      {changedCount > 0 && (
        <div className="flex items-center gap-3 border-t border-sand pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-white hover:bg-moss-dark disabled:opacity-50"
          >
            {isPending ? 'Guardando...' : `Guardar cambios (${changedCount})`}
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={isPending}
            className="rounded-full border border-sand px-5 py-2.5 text-sm font-medium text-ink/60 hover:border-clay hover:text-clay disabled:opacity-50"
          >
            Deshacer
          </button>
        </div>
      )}
      {error && <p className="text-sm text-clay">{error}</p>}
    </div>
  )
}
