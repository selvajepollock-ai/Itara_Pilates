'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, EyeOff, Plus } from 'lucide-react'
import { DropdownMenu } from '@/app/components/dropdown-menu'
import { useSidePanel } from '@/app/components/use-side-panel'
import { createClassType, setClassTypeActive, updateClassType } from '../horarios/actions'

export type ClassTypeData = {
  id: string
  name: string
  description: string | null
  active: boolean
  /** Clases por semana y profesores distintos (datos ya cargados). */
  classCount: number
  instructorCount: number
}

/** Modal en escritorio y hoja inferior en celular, con foco atrapado y cierre con Escape. */
function TypeModal({ type, onClose }: { type: ClassTypeData | null; onClose: () => void }) {
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  useSidePanel(panelRef, { isMobile: true, onClose, resetKey: type?.id ?? 'new' })

  function submit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const res = type ? await updateClassType(type.id, formData) : await createClassType(formData)
      if (res?.error) {
        setError(res.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  const field =
    'mt-1.5 w-full rounded-[12px] border border-edge-strong bg-white px-3.5 text-[16px] text-ink outline-none focus:border-moss md:text-sm'
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={type ? 'Editar tipo de clase' : 'Nuevo tipo de clase'}>
      <button type="button" aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 cursor-default bg-ink/30" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-[22px] bg-white p-5 pb-[calc(20px+env(safe-area-inset-bottom))] outline-none md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[20px]"
      >
        <h2 className="font-display text-2xl italic text-ink">{type ? 'Editar tipo' : 'Nuevo tipo de clase'}</h2>
        <form action={submit} className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-ink">
            Nombre
            <input name="name" required defaultValue={type?.name ?? ''} placeholder="Ej: Barre" className={`${field} h-12 md:h-11`} />
          </label>
          <label className="block text-sm font-medium text-ink">
            Descripción
            <textarea name="description" defaultValue={type?.description ?? ''} rows={3} className={`${field} py-3`} />
            <span className="mt-1 block text-xs font-normal text-muted">Opcional · la ven las alumnas</span>
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2.5">
            <button type="button" onClick={onClose} className="h-12 rounded-[12px] border border-edge-strong px-5 text-sm text-ink md:h-11">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="h-12 rounded-[12px] bg-moss px-5 text-sm font-semibold text-white disabled:opacity-60 md:h-11">
              {isPending ? 'Guardando...' : type ? 'Guardar' : 'Crear tipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function TiposView({ types }: { types: ClassTypeData[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [modal, setModal] = useState<{ type: ClassTypeData | null } | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const active = types.filter((t) => t.active)
  const inactive = types.filter((t) => !t.active)

  function toggle(t: ClassTypeData) {
    const msg = t.active
      ? `¿Desactivar "${t.name}"? Deja de aparecer al crear clases nuevas. Las clases que ya existen no se modifican.`
      : `¿Reactivar "${t.name}"?`
    if (!confirm(msg)) return
    startTransition(async () => {
      await setClassTypeActive(t.id, !t.active)
      router.refresh()
    })
  }

  const usage = (t: ClassTypeData) =>
    `${t.classCount} ${t.classCount === 1 ? 'clase' : 'clases'} por semana · ${t.instructorCount} ${t.instructorCount === 1 ? 'profesor' : 'profesores'}`

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-sm text-muted">Las disciplinas que ofrece el estudio. Se eligen al crear una clase.</p>
        <button type="button" onClick={() => setModal({ type: null })} className="btn-primary hidden min-h-[44px] shrink-0 md:inline-flex">
          <Plus size={16} strokeWidth={2.5} /> Nuevo tipo
        </button>
        <button
          type="button"
          aria-label="Nuevo tipo"
          onClick={() => setModal({ type: null })}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-moss text-white md:hidden"
        >
          <Plus size={20} />
        </button>
      </div>

      <ul className="mt-5 space-y-3">
        {active.map((t) => (
          <li key={t.id} className="surface-card flex items-center gap-4 rounded-[18px] p-5">
            <span
              aria-hidden
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[16px] bg-moss-soft font-display text-[26px] italic text-moss-dark"
            >
              {t.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-display text-[22px] italic text-ink">{t.name}</span>
                <span className="rounded-full bg-slot-free px-2 py-0.5 text-[11px] font-semibold text-slot-free-ink">Activo</span>
              </p>
              {t.description && <p className="mt-0.5 text-sm text-ink/70">{t.description}</p>}
              <p className="mt-1 text-[13px] text-muted">{usage(t)}</p>
            </div>
            <button type="button" onClick={() => setModal({ type: t })} className="btn-secondary hidden md:inline-flex">
              Editar
            </button>
            <DropdownMenu
              label={`Más acciones de ${t.name}`}
              buttonClassName="h-11 w-11"
              items={[
                { key: 'edit', label: 'Editar', onSelect: () => setModal({ type: t }), className: 'md:hidden' },
                { key: 'off', label: 'Desactivar', icon: <EyeOff size={15} />, danger: true, onSelect: () => toggle(t) },
              ]}
            />
          </li>
        ))}
        {active.length === 0 && <li className="surface-card px-5 py-10 text-center text-sm text-muted">Todavía no hay tipos de clase.</li>}
      </ul>

      {inactive.length > 0 && (
        <section className="mt-6">
          <button
            type="button"
            aria-expanded={showInactive}
            onClick={() => setShowInactive((v) => !v)}
            className="flex min-h-[44px] items-center gap-2 text-sm font-medium text-ink"
          >
            <ChevronDown size={16} className={`transition ${showInactive ? '' : '-rotate-90'}`} />
            Inactivos ({inactive.length})
            <span className="font-normal text-muted">· no aparecen al crear clases</span>
          </button>
          {showInactive && (
            <ul className="mt-2 space-y-3">
              {inactive.map((t) => (
                <li key={t.id} className="surface-card flex items-center gap-4 rounded-[18px] p-5 opacity-70">
                  <span aria-hidden className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[16px] bg-edge-row font-display text-[26px] italic text-muted">
                    {t.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[22px] italic text-ink">{t.name}</span>
                      <span className="rounded-full bg-slot-full px-2 py-0.5 text-[11px] font-semibold text-slot-full-ink">Inactivo</span>
                    </p>
                    {t.description && <p className="mt-0.5 text-sm text-ink/70">{t.description}</p>}
                  </div>
                  <button type="button" onClick={() => toggle(t)} className="btn-secondary min-h-[44px]">
                    Reactivar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {modal && <TypeModal type={modal.type} onClose={() => setModal(null)} />}
    </div>
  )
}
