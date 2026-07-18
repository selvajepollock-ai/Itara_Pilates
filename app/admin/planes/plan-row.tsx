'use client'

import { useTransition } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { setPlanActive } from './actions'
import { formatARS } from '@/lib/currency'

type Plan = { id: string; name: string; price: number; active: boolean }

export function PlanRow({ plan }: { plan: Plan }) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(() => {
      setPlanActive(plan.id, !plan.active)
    })
  }

  return (
    <li className="flex items-center justify-between px-5 py-4">
      <div className={plan.active ? '' : 'opacity-40'}>
        <p className="font-display text-lg italic text-ink">
          {plan.name}
          {!plan.active && <span className="ml-2 text-xs not-italic text-ink/40">(inactivo)</span>}
        </p>
        <p className="mt-0.5 text-sm text-ink/60">{formatARS(plan.price)} / mes</p>
      </div>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className="flex items-center gap-1 text-xs font-medium text-clay hover:text-clay/70 disabled:opacity-50"
      >
        {plan.active ? (
          <>
            <EyeOff size={13} strokeWidth={2} /> Desactivar
          </>
        ) : (
          <>
            <Eye size={13} strokeWidth={2} /> Reactivar
          </>
        )}
      </button>
    </li>
  )
}
