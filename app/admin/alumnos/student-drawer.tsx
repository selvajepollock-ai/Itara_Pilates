'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageCircle, Wallet, X } from 'lucide-react'
import { Avatar } from '@/app/components/avatar'
import { StatusDot } from '@/app/components/status-dot'
import { DropdownMenu } from '@/app/components/dropdown-menu'
import { useSidePanel } from '@/app/components/use-side-panel'
import { RegisterPaymentDialog } from '../inicio/register-payment-dialog'
import { GrantAccessForm } from './[id]/grant-access-form'
import { useStudentMenuItems } from './row-actions'
import { suggestNextDueDate } from '@/lib/billing'
import { formatARS } from '@/lib/currency'
import { whatsappLink } from '@/lib/whatsapp'
import { getStudentDrawerData, type DrawerData } from './drawer-actions'
import { ClasesPanel, NotasPanel, PagosPanel } from './drawer-tab-panels'
import { addDays, dayMonth, shortDate } from './format'
import type { StudentRow } from './types'

const BTN_SECONDARY =
  'inline-flex h-[34px] items-center justify-center gap-1.5 rounded-[10px] border border-edge-strong bg-white px-3 text-[13px] font-medium text-ink transition hover:border-moss hover:text-moss'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-edge-divider p-3.5">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 text-sm font-medium text-ink">{children}</div>
    </div>
  )
}

/**
 * Ficha lateral del alumno. En escritorio es un panel a la derecha que NO oscurece la lista;
 * en celular ocupa toda la pantalla (con foco atrapado).
 */
export function StudentDrawer({
  student,
  dueDay,
  isMobile,
  onClose,
  extra,
  fullHref,
}: {
  student: StudentRow
  dueDay: number
  isMobile: boolean
  onClose: () => void
  /** Bloque extra arriba del resumen (ej: "Sus horarios fijos" en Horarios). */
  extra?: React.ReactNode
  /** A dónde lleva "Ver ficha completa". Por defecto, la ficha del alumno. */
  fullHref?: string
}) {
  const router = useRouter()
  const panelRef = useRef<HTMLElement>(null)
  const menuItems = useStudentMenuItems(student, onClose)
  const wa = whatsappLink(student.phone)

  useSidePanel(panelRef, { isMobile, onClose, resetKey: student.id })

  // Pestañas: Resumen viene con la lista; Pagos, Clases y Notas se leen al abrirlas (y se releen si cambian los datos).
  const [tab, setTab] = useState<'resumen' | 'pagos' | 'clases' | 'notas'>('resumen')
  const [data, setData] = useState<DrawerData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  useEffect(() => {
    setTab('resumen')
    setData(null)
  }, [student.id])
  useEffect(() => {
    if (tab === 'resumen') return
    let active = true
    setLoadError(null)
    getStudentDrawerData(student.id).then((res) => {
      if (!active) return
      if (res.error || !res.data) setLoadError(res.error ?? 'No se pudieron cargar los datos.')
      else setData(res.data)
    })
    return () => {
      active = false
    }
  }, [tab, student])

  const isOverdue = student.status === 'vencido' && !student.comp
  const dueDate = student.endDate ? addDays(student.endDate, 1) : null
  // El recargo corre desde el día siguiente al último día de gracia del mes que sigue al pagado.
  const surchargeFrom = (() => {
    if (!student.endDate) return null
    const [y, m] = student.endDate.split('-').map(Number)
    const last = new Date(Date.UTC(y, m, dueDay)).toISOString().slice(0, 10)
    return addDays(last, 1)
  })()

  const quickStudent = {
    id: student.id,
    full_name: student.fullName,
    subscriptionId: student.subscriptionId,
    planName: student.planName,
    planPrice: student.planPrice,
    endDate: student.endDate,
    suggestedNextDate: suggestNextDueDate(
      student.endDate ? new Date(`${student.endDate}T00:00:00`) : new Date(),
      dueDay
    ),
  }

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      aria-label={`Ficha de ${student.fullName}`}
      {...(isMobile ? { role: 'dialog', 'aria-modal': true } : {})}
      className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-white outline-none lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[420px] lg:border-l lg:border-edge lg:shadow-[-12px_0_32px_rgba(43,42,38,0.08)]"
    >
      <div className="flex items-start gap-3.5 px-5 pb-4 pt-5">
        <Avatar name={student.fullName} size={52} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-normal italic leading-tight text-ink">{student.fullName}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusDot status={student.status} surcharge={student.hasSurcharge} />
            {!student.active && <span className="text-[13px] text-muted">De baja</span>}
          </div>
        </div>
        <button
          type="button"
          aria-label="Cerrar ficha"
          onClick={onClose}
          className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-muted transition hover:bg-moss-soft hover:text-ink"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 pb-4">
        {student.subscriptionId && !student.comp ? (
          <RegisterPaymentDialog
            students={[quickStudent]}
            initialStudentId={student.id}
            onClosed={() => router.refresh()}
            className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-[10px] bg-moss px-3.5 text-[13px] font-semibold text-white transition hover:bg-moss-dark"
          >
            <Wallet size={14} />
            Registrar pago
          </RegisterPaymentDialog>
        ) : null}
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className={BTN_SECONDARY}>
            <MessageCircle size={14} />
            WhatsApp
          </a>
        )}
        <DropdownMenu label={`Más acciones para ${student.fullName}`} items={menuItems} />
      </div>

      <div role="tablist" aria-label="Secciones de la ficha" className="flex gap-1 border-b border-edge px-5">
        {(
          [
            ['resumen', 'Resumen'],
            ['pagos', 'Pagos'],
            ['clases', 'Clases'],
            ['notas', 'Notas'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px min-h-[44px] border-b-2 px-3 py-2.5 text-sm transition ${
              tab === key ? 'border-moss font-semibold text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab !== 'resumen' && (
        <div className="px-5 py-5">
          {loadError ? (
            <p className="text-sm text-danger">{loadError}</p>
          ) : !data ? (
            <p className="text-sm text-muted">Cargando…</p>
          ) : tab === 'pagos' ? (
            <PagosPanel data={data} studentName={student.fullName} />
          ) : tab === 'clases' ? (
            <ClasesPanel data={data} />
          ) : (
            <NotasPanel data={data} fullHref={`/admin/alumnos/${student.id}`} />
          )}
        </div>
      )}

      {tab === 'resumen' && (
      <div className="space-y-5 px-5 py-5">
        {extra}
        {isOverdue && (
          <div className="rounded-[14px] border border-alert-edge bg-alert-soft p-4">
            <p className="text-xs text-state-due-ink">
              {student.hasSurcharge ? 'Cuota con recargo' : 'Cuota pendiente'}
            </p>
            <p className="mt-1 text-[28px] font-semibold leading-none tabular-nums text-ink">
              {formatARS(student.hasSurcharge && student.surchargeAmount ? student.surchargeAmount : student.planPrice)}
            </p>
            <p className="mt-2 text-[13px] text-state-due-ink">
              {dueDate ? `Venció el ${dayMonth(dueDate)}` : 'Vencida'}
              {student.hasSurcharge
                ? ' · incluye recargo del 10%'
                : surchargeFrom
                  ? ` · recargo del 10% desde el ${dayMonth(surchargeFrom)}`
                  : ''}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Plan">{student.planName ?? '—'}</Field>
          <Field label="Cuota mensual">
            {student.comp ? 'Bonificado' : student.planName ? <span className="tabular-nums">{formatARS(student.planPrice)}</span> : '—'}
          </Field>
          <Field label="Profesor">
            {student.instructorName ?? <span className="font-semibold text-state-none-ink">Sin asignar</span>}
          </Field>
          <Field label="Último pago">
            <span className="tabular-nums">{shortDate(student.lastPaymentAt) ?? '—'}</span>
          </Field>
        </div>

        <section>
          <h3 className="text-sm font-semibold text-ink">Acceso a la app</h3>
          <div className="mt-2 rounded-[12px] border border-edge-divider p-3.5">
            {student.hasAccess ? (
              <>
                <p className="text-sm text-ink">Con acceso</p>
                <p className="text-[13px] text-muted">{student.email}</p>
                <Link
                  href={`/admin/alumnos/${student.id}`}
                  className="mt-2 inline-block text-[13px] font-medium text-moss hover:text-moss-dark"
                >
                  Restablecer contraseña →
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-ink">Sin acceso</p>
                <p className="text-[13px] text-muted">Cargá su email real para enviarle la invitación.</p>
                <GrantAccessForm studentId={student.id} defaultEmail={student.displayEmail ?? ''} />
              </>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-ink">Contacto</h3>
          <dl className="mt-2 divide-y divide-edge-divider rounded-[12px] border border-edge-divider">
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
              <dt className="text-muted">Teléfono</dt>
              <dd className="tabular-nums text-ink">{student.phone || '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
              <dt className="text-muted">Email</dt>
              <dd className="min-w-0 truncate text-ink">{student.displayEmail || '—'}</dd>
            </div>
          </dl>
        </section>

        <Link
          href={fullHref ?? `/admin/alumnos/${student.id}`}
          className="inline-block text-[13px] font-medium text-moss hover:text-moss-dark"
        >
          Ver ficha completa →
        </Link>
      </div>
      )}
    </aside>
  )
}
