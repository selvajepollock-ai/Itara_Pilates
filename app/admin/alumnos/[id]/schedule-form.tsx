'use client'

import { Fragment, useState, useTransition } from 'react'
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
  studentId,
  accent,
}: {
  options: ClassOption[]
  studentId: string
  accent: 'moss' | 'clay'
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const days = Array.from(new Set(options.map((o) => o.dayOfWeek))).sort((a, b) => {
    const order = [1, 2, 3, 4, 5, 6, 0]
    return order.indexOf(a) - order.indexOf(b)
  })
  const hours = Array.from(new Set(options.map((o) => o.startTime))).sort()

  function cellFor(day: number, hour: string) {
    return options.find((o) => o.dayOfWeek === day && o.startTime === hour) ?? null
  }

  function handleToggle(option: ClassOption) {
    const checked = !option.enrollmentId
    setPendingId(option.id)
    startTransition(async () => {
      if (checked) {
        const formData = new FormData()
        formData.set('student_id', studentId)
        await enrollStudent(option.id, formData)
      } else if (option.enrollmentId) {
        await removeEnrollment(option.enrollmentId, option.id)
      }
      router.refresh()
      setPendingId(null)
    })
  }

  const activeClasses =
    accent === 'moss'
      ? 'bg-moss text-white border-moss'
      : 'bg-clay text-white border-clay'

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
              const isChecked = Boolean(opt.enrollmentId)
              const isFull = opt.enrolled >= opt.capacity && !isChecked
              const isLoading = isPending && pendingId === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isFull || isLoading}
                  onClick={() => handleToggle(opt)}
                  title={`${opt.enrolled}/${opt.capacity} ocupado`}
                  className={`h-8 rounded-md border text-[11px] transition ${
                    isChecked
                      ? activeClasses
                      : isFull
                        ? 'cursor-not-allowed border-sand bg-sand/40 text-ink/25'
                        : 'border-sand bg-linen/40 text-ink/50 hover:border-moss hover:text-ink'
                  } ${isLoading ? 'opacity-50' : ''}`}
                >
                  {isChecked ? '✓' : ''}
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
  const [showFuerza, setShowFuerza] = useState(false)

  const reformer = classOptions.filter((o) => !o.typeName.toLowerCase().includes('fuerza'))
  const fuerza = classOptions.filter((o) => o.typeName.toLowerCase().includes('fuerza'))
  const fuerzaAssignedCount = fuerza.filter((o) => o.enrollmentId).length

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
        <div className="mt-2">
          <TimeGrid options={reformer} studentId={studentId} accent="moss" />
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
              <TimeGrid options={fuerza} studentId={studentId} accent="clay" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
