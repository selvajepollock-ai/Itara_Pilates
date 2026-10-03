'use client'

import { createContext, useContext, useState } from 'react'
import { Eye, EyeOff, ChevronDown } from 'lucide-react'

const PrivacyContext = createContext(true)
const SetHiddenContext = createContext<(v: boolean) => void>(() => {})

export function MoneyPrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(true)
  return (
    <PrivacyContext.Provider value={hidden}>
      <SetHiddenContext.Provider value={setHidden}>{children}</SetHiddenContext.Provider>
    </PrivacyContext.Provider>
  )
}

export function useMoneyHidden() {
  return useContext(PrivacyContext)
}

/** Botón para tapar/destapar los montos — se ubica donde convenga en el layout. */
export function PrivacyToggleButton() {
  const hidden = useMoneyHidden()
  const setHidden = useContext(SetHiddenContext)
  return (
    <button
      type="button"
      onClick={() => setHidden(!hidden)}
      aria-pressed={hidden}
      className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-edge-strong bg-white px-3.5 text-sm font-medium text-ink transition hover:border-moss hover:text-moss"
    >
      {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
      {hidden ? 'Mostrar montos' : 'Ocultar montos'}
    </button>
  )
}

/**
 * Tapa un monto en línea con guiones fijos (como el saldo de un banco) en vez de
 * blurear el texto real: blureado se seguía notando la cantidad de dígitos/forma.
 */
export function Private({ children, mask = '• • • • • •' }: { children: React.ReactNode; mask?: string }) {
  const hidden = useMoneyHidden()
  if (!hidden) return <>{children}</>
  return (
    <span className="text-ink/30">
      <span aria-hidden>{mask}</span>
      <span className="sr-only">monto oculto</span>
    </span>
  )
}

/**
 * Sección financiera completa (números grandes + gráfico): en vez de blurear las
 * barras (que igual revelan la forma/magnitud), queda plegada hasta que se destapa.
 */
export function FinancialSection({ children, label = 'Resumen financiero' }: { children: React.ReactNode; label?: string }) {
  const hidden = useMoneyHidden()
  const setHidden = useContext(SetHiddenContext)

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        className="flex w-full items-center justify-between rounded-2xl border border-dashed border-sand bg-linen/40 px-5 py-4 text-left transition hover:border-moss/50"
      >
        <span className="flex items-center gap-2 text-sm text-ink/50">
          <EyeOff size={15} />
          {label} oculto — tocá para mostrar
        </span>
        <ChevronDown size={16} className="text-ink/30" />
      </button>
    )
  }

  return <>{children}</>
}
