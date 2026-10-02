export type NameState = 'normal' | 'match' | 'dim' | 'hover' | 'selected'

const STATES: Record<NameState, string> = {
  normal: 'text-ink hover:bg-slot-free hover:text-slot-free-ink hover:underline',
  match: 'bg-slot-hit font-bold text-ink',
  dim: 'text-slot-dim',
  hover: 'bg-slot-free text-slot-free-ink underline',
  selected: 'bg-moss font-medium text-white',
}

/** Nombre de alumno clickeable (abre su ficha). `title` lleva el nombre completo. */
export function NameButton({
  label,
  fullName,
  state = 'normal',
  onClick,
  onHover,
  className = '',
}: {
  label: string
  fullName: string
  state?: NameState
  onClick: () => void
  onHover?: (over: boolean) => void
  className?: string
}) {
  return (
    <button
      type="button"
      title={fullName}
      aria-label={`Ver ficha de ${fullName}`}
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      className={`min-w-0 truncate rounded-[6px] px-1.5 py-0.5 text-left transition ${STATES[state]} ${className}`}
    >
      {label}
    </button>
  )
}
