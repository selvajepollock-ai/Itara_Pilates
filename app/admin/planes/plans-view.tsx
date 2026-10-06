'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, Eye, EyeOff, Pencil, Plus } from 'lucide-react'
import { DropdownMenu, type MenuItem } from '@/app/components/dropdown-menu'
import { PageHeader } from '@/app/components/page-header'
import { formatARS } from '@/lib/currency'
import { setPlanActive } from './actions'
import { PlanDialog } from './plan-dialog'
import { CATEGORY_LABEL, pricePerClass, sortPlans, type PlanItem } from './plan-math'

const GRID = 'grid-cols-[minmax(0,1.6fr)_90px_130px_110px_minmax(0,1.3fr)_130px_44px]'

export type DropInPrices = { p1: number; p2: number; p3: number; p4: number }

export function PlansView({ plans, dropIn }: { plans: PlanItem[]; dropIn: DropInPrices }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [dialog, setDialog] = useState<{ plan: PlanItem | null } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = sortPlans(plans.filter((p) => p.active))
  const inactive = sortPlans(plans.filter((p) => !p.active))
  const multiCategory = new Set(active.map((p) => p.category)).size > 1
  const maxStudents = Math.max(...active.map((p) => p.students), 1)
  const totalStudents = active.reduce((s, p) => s + p.students, 0)
  const totalIncome = active.reduce((s, p) => s + p.price * p.paying, 0)

  function notify(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  function toggle(plan: PlanItem) {
    if (plan.active) {
      if (
        !confirm(
          `¿Desactivar "${plan.name}"? Los alumnos que ya tienen este plan lo conservan. No se va a poder asignar a nuevos alumnos.`
        )
      )
        return
    }
    setError(null)
    startTransition(async () => {
      const res = await setPlanActive(plan.id, !plan.active)
      if (res && 'error' in res && res.error) setError(res.error)
      router.refresh()
      notify(plan.active ? 'Plan desactivado' : 'Plan reactivado')
    })
  }

  const menuFor = (plan: PlanItem): MenuItem[] => [
    { key: 'edit', label: 'Editar', icon: <Pencil size={15} />, onSelect: () => setDialog({ plan }) },
    plan.active
      ? { key: 'off', label: 'Desactivar', icon: <EyeOff size={15} />, onSelect: () => toggle(plan) }
      : { key: 'on', label: 'Reactivar', icon: <Eye size={15} />, onSelect: () => toggle(plan) },
  ]

  const perClassLabel = (p: PlanItem) => {
    const v = pricePerClass(p.price, p.classesPerWeek)
    return v === null ? '—' : formatARS(Math.round(v))
  }

  const rows = (list: PlanItem[], dim: boolean) =>
    list.map((p) => (
      <div
        key={p.id}
        className={`grid ${GRID} min-h-[60px] items-center gap-3 border-t border-edge-row px-5 ${dim ? 'opacity-60' : ''}`}
      >
        <div className="min-w-0">
          <p className="truncate font-display text-lg italic text-ink">{p.name}</p>
          {multiCategory && (
            <span className="mt-0.5 inline-block rounded-full bg-edge-row px-2 py-0.5 text-[11px] font-semibold text-ink">
              {CATEGORY_LABEL[p.category] ?? p.category}
            </span>
          )}
        </div>
        <p className="text-sm tabular-nums text-ink">{p.classesPerWeek ?? '—'}</p>
        <p className="text-sm font-semibold tabular-nums text-ink">{formatARS(p.price)} / mes</p>
        <p className="text-sm tabular-nums text-muted">{perClassLabel(p)}</p>
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-edge-divider" aria-hidden>
            <div className="h-full rounded-full bg-moss" style={{ width: `${(p.students / maxStudents) * 100}%` }} />
          </div>
          <Link
            href={`/admin/alumnos?plan=${p.id}`}
            aria-label={`Ver los ${p.students} alumnos del plan ${p.name}`}
            className="w-8 text-right text-sm font-semibold tabular-nums text-moss hover:text-moss-dark hover:underline"
          >
            {p.students}
          </Link>
        </div>
        <p className="text-sm tabular-nums text-ink">{p.paying > 0 ? formatARS(p.price * p.paying) : '—'}</p>
        <DropdownMenu label={`Más acciones del plan ${p.name}`} items={menuFor(p)} />
      </div>
    ))

  const head = (
    <div className={`grid ${GRID} items-center gap-3 rounded-t-[16px] bg-edge-head px-5 py-3 text-xs font-semibold text-muted`}>
      <span>Plan</span>
      <span>Clases / semana</span>
      <span>Precio mensual</span>
      <span>Por clase</span>
      <span>Alumnos</span>
      <span>Ingreso estimado</span>
      <span />
    </div>
  )

  const cards = (list: PlanItem[], dim: boolean) =>
    list.map((p) => (
      <div key={p.id} className={`surface-card flex items-start justify-between gap-3 p-4 ${dim ? 'opacity-60' : ''}`}>
        <div className="min-w-0">
          <p className="font-display text-lg italic text-ink">{p.name}</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{formatARS(p.price)} / mes</p>
          <p className="mt-1 text-[13px] text-muted">
            {perClassLabel(p) !== '—' ? `${perClassLabel(p)} por clase · ` : ''}
            <Link href={`/admin/alumnos?plan=${p.id}`} className="font-medium text-moss">
              {p.students} {p.students === 1 ? 'alumno' : 'alumnos'}
            </Link>
          </p>
        </div>
        <DropdownMenu label={`Más acciones del plan ${p.name}`} items={menuFor(p)} />
      </div>
    ))

  return (
    <div>
      <div>
        <PageHeader
          title="Planes"
          actions={
            <button type="button" onClick={() => setDialog({ plan: null })} className="btn-primary hidden lg:inline-flex">
              <Plus size={16} strokeWidth={2.5} />
              Nuevo plan
            </button>
          }
        />
        <p className="mt-2 text-sm text-muted">Las mensualidades que ofrece el estudio.</p>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {/* Escritorio */}
      <div className="mt-6 hidden lg:block">
        <div className="surface-card">
          {head}
          {active.length === 0 ? (
            <p className="border-t border-edge-row px-5 py-10 text-center text-sm text-muted">Todavía no hay planes cargados.</p>
          ) : (
            rows(active, false)
          )}
          {active.length > 0 && (
            <div className={`grid ${GRID} items-center gap-3 rounded-b-[16px] border-t border-edge-strong bg-edge-head px-5 py-3 text-sm font-semibold text-ink`}>
              <span>Total</span>
              <span />
              <span />
              <span />
              <span className="tabular-nums">{totalStudents} alumnos</span>
              <span className="tabular-nums">{totalIncome > 0 ? formatARS(totalIncome) : '—'}</span>
              <span />
            </div>
          )}
        </div>
        <p className="mt-3 text-[13px] text-muted">
          &quot;Por clase&quot; toma 4 semanas por mes. &quot;Ingreso estimado&quot; es precio × alumnos activos en el plan, sin
          bonificados ni recargos.
        </p>
      </div>

      {/* Celular */}
      <div className="mt-6 space-y-3 lg:hidden">
        {active.length === 0 ? (
          <p className="surface-card px-4 py-10 text-center text-sm text-muted">Todavía no hay planes cargados.</p>
        ) : (
          cards(active, false)
        )}
        {active.length > 0 && (
          <div className="surface-card p-4">
            <p className="text-sm font-semibold text-ink">
              Total: {totalStudents} alumnos · {totalIncome > 0 ? formatARS(totalIncome) : '—'}
            </p>
            <p className="mt-1 text-[13px] text-muted">Ingreso estimado: precio × alumnos activos, sin bonificados ni recargos.</p>
          </div>
        )}
      </div>

      {/* Clases sueltas: no son un plan mensual, tienen su propia escala de precios por compra */}
      <section className="surface-card mt-8 p-5">
        <h2 className="font-display text-[22px] font-normal italic leading-tight text-ink">Clases sueltas (sin plan)</h2>
        <p className="mt-1 text-[13px] text-muted">
          Se compran por tanda y se pagan todas juntas. Cuantas más clases en la misma compra, más barata sale cada una.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ['1 clase', dropIn.p1],
              ['2 clases', dropIn.p2],
              ['3 clases', dropIn.p3],
              ['4 o más', dropIn.p4],
            ] as const
          ).map(([label, price]) => (
            <div key={label} className="rounded-[12px] border border-edge-divider p-3.5">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-ink">{formatARS(price)} c/u</dd>
            </div>
          ))}
        </dl>
        <Link href="/admin/perfil" className="mt-3 inline-block text-[13px] font-medium text-moss hover:text-moss-dark">
          Cambiar los precios en Ajustes del estudio →
        </Link>
      </section>

      {/* Desactivados */}
      <section className="mt-8">
        <button
          type="button"
          aria-expanded={showInactive}
          onClick={() => setShowInactive((v) => !v)}
          className="flex min-h-[44px] items-center gap-2 text-sm text-muted hover:text-ink"
        >
          <ChevronDown size={16} className={`transition ${showInactive ? 'rotate-180' : ''}`} aria-hidden />
          <span>
            <span className="font-semibold text-ink">Desactivados</span> · no se pueden asignar a alumnos nuevos
          </span>
        </button>
        {showInactive &&
          (inactive.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No hay planes desactivados.</p>
          ) : (
            <>
              <div className="surface-card mt-2 hidden lg:block">
                {head}
                {rows(inactive, true)}
              </div>
              <div className="mt-2 space-y-3 lg:hidden">{cards(inactive, true)}</div>
            </>
          ))}
      </section>

      {/* Celular: botón flotante */}
      <button
        type="button"
        aria-label="Nuevo plan"
        onClick={() => setDialog({ plan: null })}
        className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-moss text-white shadow-lg lg:hidden"
      >
        <Plus size={24} />
      </button>

      {dialog && (
        <PlanDialog
          plan={dialog.plan}
          onClose={() => setDialog(null)}
          onSaved={(m) => {
            setDialog(null)
            router.refresh()
            notify(m)
          }}
        />
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
