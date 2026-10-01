'use client'

import { createContext, useContext, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const PrivacyContext = createContext(true)

/** Envuelve la pantalla de Pagos: los montos arrancan tapados hasta que se destapen a mano. */
const SetHiddenContext = createContext<(v: boolean) => void>(() => {})

export function MoneyPrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(true)
  return (
    <PrivacyContext.Provider value={hidden}>
      <SetHiddenContext.Provider value={setHidden}>{children}</SetHiddenContext.Provider>
    </PrivacyContext.Provider>
  )
}

/** Botón para tapar/destapar los montos — se ubica donde convenga en el layout. */
export function PrivacyToggleButton() {
  const hidden = useMoneyHidden()
  const setHidden = useContext(SetHiddenContext)
  return (
    <button
      type="button"
      onClick={() => setHidden(!hidden)}
      className="flex items-center gap-1.5 rounded-full border border-sand px-3.5 py-1.5 text-xs font-medium text-ink/60 transition hover:border-moss hover:text-moss"
    >
      {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
      {hidden ? 'Montos ocultos' : 'Montos visibles'}
    </button>
  )
}

export function useMoneyHidden() {
  return useContext(PrivacyContext)
}

/** Tapa un texto/monto en línea mientras el modo privado esté activo. */
export function Private({ children }: { children: React.ReactNode }) {
  const hidden = useMoneyHidden()
  return (
    <span className={hidden ? 'select-none blur-sm' : undefined} aria-hidden={hidden}>
      {children}
    </span>
  )
}

/** Igual que Private, pero para bloques (ej: un gráfico), usando un div en vez de span. */
export function PrivateBlock({ children }: { children: React.ReactNode }) {
  const hidden = useMoneyHidden()
  return (
    <div className={hidden ? 'select-none blur-sm' : undefined} aria-hidden={hidden}>
      {children}
    </div>
  )
}
