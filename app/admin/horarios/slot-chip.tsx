import { RotateCcw } from 'lucide-react'

export type SlotTone = 'free' | 'freed' | 'recover' | 'full' | 'cancel'

const TONES: Record<SlotTone, string> = {
  free: 'bg-slot-free text-slot-free-ink',
  freed: 'bg-slot-freed text-slot-freed-ink',
  recover: 'bg-info-soft text-info-ink',
  full: 'bg-slot-full text-slot-full-ink',
  cancel: 'bg-slot-cancel text-slot-cancel-ink',
}

/** Etiqueta de lugares (11 px semibold). Siempre lleva texto: el color no es el único indicador. */
export function SlotChip({ tone, children, title }: { tone: SlotTone; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONES[tone]}`}
    >
      {tone === 'recover' && <RotateCcw size={10} strokeWidth={3} aria-hidden />}
      {children}
    </span>
  )
}

/** Barra de ocupación de 4 px. */
export function OccupancyBar({ value, max, full }: { value: number; max: number; full: boolean }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-slot-track" aria-hidden>
      <div className={`h-full rounded-full ${full ? 'bg-slot-free-ink' : 'bg-moss'}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Chips de una clase en una fecha: libres, +recuperar, ↻ recuperan, o "Completa". */
export function CellChips({ fixedFree, freed, recovering, long = false }: { fixedFree: number; freed: number; recovering: number; long?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      {fixedFree > 0 && <SlotChip tone="free">{fixedFree === 1 ? '1 libre' : `${fixedFree} libres`}</SlotChip>}
      {freed > 0 && (
        <SlotChip tone="freed" title="Liberado por una cancelación: solo sirve para recuperar en esta fecha">
          {long ? `+${freed} para recuperar` : (<><span className="lg:hidden">+{freed} recup.</span><span className="hidden lg:inline">+{freed} recuperar</span></>)}
        </SlotChip>
      )}
      {recovering > 0 && (
        <SlotChip tone="recover" title="Alumnos que vienen a recuperar en esta fecha">
          {long ? (recovering === 1 ? '1 recupera' : `${recovering} recuperan`) : recovering}
        </SlotChip>
      )}
      {fixedFree === 0 && freed === 0 && <SlotChip tone="full">Completa</SlotChip>}
    </div>
  )
}
