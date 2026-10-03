'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Undo2 } from 'lucide-react'
import { DropdownMenu } from '@/app/components/dropdown-menu'
import { setExtraChargePaid } from '../actions'

/** "⋯" de una clase suelta cobrada: reutiliza la acción existente para volverla a pendiente. */
export function ExtraChargeActions({ chargeId, label }: { chargeId: string; label: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  function markPending() {
    if (!confirm('¿Volver a marcar como pendiente?')) return
    startTransition(async () => {
      const res = await setExtraChargePaid(chargeId, false)
      if (res && 'error' in res && res.error) alert(res.error)
      router.refresh()
    })
  }

  return (
    <DropdownMenu
      label={label}
      items={[{ key: 'pending', label: 'Marcar pendiente', icon: <Undo2 size={15} />, onSelect: markPending }]}
    />
  )
}
