'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { QuickPayment } from '../quick-payment'

type Student = Parameters<typeof QuickPayment>[0]['students'][number]

/** Botón que abre el flujo de "Registrar un pago" ya existente (QuickPayment) en un modal. */
export function RegisterPaymentDialog({
  students,
  className,
  children,
  initialStudentId,
  onClosed,
}: {
  students: Student[]
  className: string
  children: React.ReactNode
  /** Abre el formulario con este alumno ya elegido. */
  initialStudentId?: string
  /** Se llama al cerrar el modal (ej: para refrescar los datos de la pantalla). */
  onClosed?: () => void
}) {
  const [open, setOpen] = useState(false)

  function close() {
    setOpen(false)
    onClosed?.()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={className}>
        {children}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Registrar un pago"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
        >
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-ink/30"
            onClick={close}
          />
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:rounded-2xl">
            <button
              type="button"
              aria-label="Cerrar"
              onClick={close}
              className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-[10px] text-muted hover:bg-moss-soft"
            >
              <X size={18} />
            </button>
            <QuickPayment students={students} initialStudentId={initialStudentId} />
          </div>
        </div>
      )}
    </>
  )
}
