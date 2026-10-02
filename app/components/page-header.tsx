/** Encabezado de pantalla: fecha chica arriba, título serif y acciones a la derecha. */
export function PageHeader({
  eyebrow,
  title,
  titleAddon,
  actions,
}: {
  eyebrow?: string
  title: string
  /** Texto chico y gris al lado del título (ej: "142 activos"). */
  titleAddon?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-sm text-muted first-letter:uppercase">{eyebrow}</p>}
        <h1 className="mt-1 flex flex-wrap items-baseline gap-x-3 font-display text-[38px] font-normal italic leading-tight text-ink">
          {title}
          {titleAddon && <span className="font-sans text-base font-normal not-italic text-muted">{titleAddon}</span>}
        </h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  )
}
