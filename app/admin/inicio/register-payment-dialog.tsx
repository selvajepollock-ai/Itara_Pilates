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
}: {
  students: Student[]
  className: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
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
            onClick={() => setOpen(false)}
          />
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:rounded-2xl">
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-[10px] text-muted hover:bg-moss-soft"
            >
              <X size={18} />
            </button>
            <QuickPayment students={students} />
          </div>
        </div>
      )}
    </>
  )
}
