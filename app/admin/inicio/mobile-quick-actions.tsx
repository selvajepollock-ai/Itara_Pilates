'use client'

import Link from 'next/link'
import { CalendarDays, ClipboardCheck, Wallet } from 'lucide-react'
import { RegisterPaymentDialog } from './register-payment-dialog'
import { deriveClasses, useNowMinutes, type TodayClass } from './today-status'
import type { QuickPayment } from '../quick-payment'

type Students = Parameters<typeof QuickPayment>[0]['students']

const BTN =
  'inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[12px] px-4 text-sm font-semibold'

/** Dos botones rápidos del celular: registrar pago y pasar lista (de la clase en curso). */
export function MobileQuickActions({ classes, students }: { classes: TodayClass[]; students: Students }) {
  const now = useNowMinutes()
  const current = deriveClasses(classes, now).find((c) => c.state === 'en_curso')

  return (
    <div className="flex gap-3 md:hidden">
      <RegisterPaymentDialog students={students} className={`${BTN} bg-moss text-white`}>
        <Wallet size={16} />
        Registrar pago
      </RegisterPaymentDialog>

      {current ? (
        <Link
          href="/instructor/pasar-lista"
          className={`${BTN} border border-edge-strong bg-white text-ink`}
        >
          <ClipboardCheck size={16} />
          Pasar lista {current.start}
        </Link>
      ) : (
        <Link href="/admin/horarios" className={`${BTN} border border-edge-strong bg-white text-ink`}>
          <CalendarDays size={16} />
          Ver horarios
        </Link>
      )}
    </div>
  )
}
