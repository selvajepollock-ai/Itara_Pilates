'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cancelRecovery, undoSessionCancellation } from '@/app/actions/recovery'
import { AvoidDialog } from './avoid-dialog'
import { dayShortName } from './format'
import type { AvoidInfo, ClassRowData, ClassState, ClassWeek } from './types'

type Chip = { label: string; cls: string }

const CHIPS: Partial<Record<ClassState, Chip>> = {
  'avisaste-credito': { label: 'Avisaste', cls: 'bg-slot-freed text-slot-freed-ink' },
  'avisaste-pedido': { label: 'Avisaste', cls: 'bg-slot-freed text-slot-freed-ink' },
  'avisaste-usada': { label: 'Avisaste', cls: 'bg-slot-freed text-slot-freed-ink' },
  'avisaste-vencida': { label: 'Avisaste', cls: 'bg-slot-freed text-slot-freed-ink' },
  tarde: { label: 'Avisaste tarde', cls: 'bg-slot-full text-slot-full-ink' },
  studio: { label: 'Cancelada por el estudio', cls: 'bg-slot-cancel text-slot-cancel-ink' },
  recovery: { label: 'Recuperación', cls: 'bg-info-soft text-info-ink' },
  suelta: { label: 'Clase suelta', cls: 'bg-edge-row text-ink' },
}

const STRUCK: ClassState[] = ['avisaste-credito', 'avisaste-pedido', 'avisaste-usada', 'avisaste-vencida', 'tarde', 'studio']

const BTN_SECONDARY =
  'inline-flex h-[42px] items-center justify-center rounded-[12px] border border-edge-strong bg-white px-4 text-sm font-medium text-ink transition hover:border-moss max-sm:w-full'
const BTN_DARK =
  'inline-flex h-[42px] items-center justify-center rounded-[12px] bg-[#2B2A26] px-4 text-sm font-semibold text-white transition hover:bg-black max-sm:w-full'

function Row({
  row,
  onAvoid,
  onUndo,
  onCancelRecovery,
}: {
  row: ClassRowData
  onAvoid: (info: AvoidInfo) => void
  onUndo: (u: NonNullable<ClassRowData['undo']>) => void
  onCancelRecovery: (r: NonNullable<ClassRowData['recoveryCancel']>) => void
}) {
  const chip = CHIPS[row.state]
  const struck = STRUCK.includes(row.state)
  const dim = row.past && row.state === 'past'
  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-edge-row px-4 py-3.5 first:border-t-0 ${
        row.isToday ? 'bg-moss-soft' : ''
      } ${dim ? 'opacity-75' : ''}`}
    >
      <div className="w-[58px] shrink-0 text-center">
        <p className={`text-xs ${row.isToday ? 'font-semibold text-state-ok-ink' : 'text-muted'}`}>
          {row.isToday ? 'Hoy' : dayShortName(row.dow)}
        </p>
        <p className="text-[22px] font-semibold leading-none tabular-nums text-ink">{row.date.slice(8, 10).replace(/^0/, '')}</p>
      </div>

      <div className="min-w-0 flex-1 basis-[180px]">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-[15px] font-semibold ${struck ? 'text-[#8A8378] line-through' : 'text-ink'}`}>
            {row.typeName} · <span className="tabular-nums">{row.start}</span>
          </p>
          {chip && <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${chip.cls}`}>{chip.label}</span>}
        </div>
        <p
          className={`mt-0.5 text-[13px] ${
            row.state === 'avisaste-credito' || (row.state === 'studio' && row.chooseCreditId) ? 'text-state-ok-ink' : 'text-muted'
          }`}
        >
          {row.note}
        </p>
      </div>

      {(row.avoid || row.undo || row.chooseCreditId || row.recoveryCancel) && (
        <div className="flex shrink-0 items-center gap-2.5 max-sm:w-full max-sm:flex-col">
          {row.undo && (
            <button
              type="button"
              onClick={() => onUndo(row.undo!)}
              className="inline-flex h-[42px] items-center justify-center px-2 text-sm font-medium text-state-ok-ink hover:underline max-sm:w-full"
            >
              Al final voy
            </button>
          )}
          {row.chooseCreditId && (
            <Link href={`/alumno/recuperar/${row.chooseCreditId}`} className={BTN_DARK}>
              Elegir clase
            </Link>
          )}
          {row.avoid && (
            <button type="button" onClick={() => onAvoid(row.avoid!)} className={BTN_SECONDARY}>
              Avisar que no voy
            </button>
          )}
          {row.recoveryCancel && (
            <button type="button" onClick={() => onCancelRecovery(row.recoveryCancel!)} className={BTN_SECONDARY}>
              Cancelar recuperación
            </button>
          )}
        </div>
      )}
    </li>
  )
}

/** "Tus clases": las dos próximas semanas, con el estado de cada clase y sus acciones. */
export function ClassesSection({
  weeks,
  studentId,
  minHoursText,
}: {
  weeks: ClassWeek[]
  studentId: string
  minHoursText: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [avoid, setAvoid] = useState<AvoidInfo | null>(null)

  function undo(u: NonNullable<ClassRowData['undo']>) {
    if (!confirm('¿Al final vas a ir a esta clase? Se deshace el aviso y se descarta la recuperación.')) return
    startTransition(async () => {
      const res = await undoSessionCancellation({ studentId, ...u })
      if (res && 'error' in res && res.error) alert(res.error)
      router.refresh()
    })
  }

  function cancelRec(r: NonNullable<ClassRowData['recoveryCancel']>) {
    const msg = r.onTime
      ? `¿Cancelar tu recuperación ${r.whenLabel} a las ${r.start}? Tu recuperación vuelve a estar disponible para elegir otro horario esta semana.`
      : `Faltan menos de ${minHoursText}: si cancelás tu recuperación ${r.whenLabel} a las ${r.start}, la perdés y no vuelve a estar disponible. ¿Querés cancelarla igual?`
    if (!confirm(msg)) return
    startTransition(async () => {
      const res = await cancelRecovery({ studentId, creditId: r.creditId })
      if (res && 'error' in res && res.error) alert(res.error)
      router.refresh()
    })
  }

  return (
    <section>
      <h2 className="font-display text-[22px] font-normal italic leading-tight text-ink">Tus clases</h2>
      {weeks.map((w) => (
        <div key={w.title} className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            {w.title} · {w.range}
          </h3>
          {w.rows.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-dashed border-edge-strong px-4 py-8 text-center text-sm text-muted">
              Sin clases asignadas.
            </p>
          ) : (
            <ul className="mt-2 overflow-hidden rounded-2xl border border-edge bg-white">
              {w.rows.map((r) => (
                <Row key={r.key} row={r} onAvoid={setAvoid} onUndo={undo} onCancelRecovery={cancelRec} />
              ))}
            </ul>
          )}
        </div>
      ))}

      {avoid && <AvoidDialog info={avoid} studentId={studentId} minHoursText={minHoursText} onClose={() => setAvoid(null)} />}
    </section>
  )
}
