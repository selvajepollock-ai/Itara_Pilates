import Link from 'next/link'

/** Fila de "Requiere tu atención": ícono, título, subtítulo y un botón. */
export function AttentionItem({
  icon,
  title,
  subtitle,
  href,
  actionLabel = 'Ver',
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  href: string
  actionLabel?: string
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning-ink"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
      </div>
      <Link
        href={href}
        className="inline-flex h-[34px] shrink-0 items-center rounded-[10px] border border-edge-strong bg-white px-3 text-[13px] font-medium text-ink transition hover:border-moss hover:text-moss"
      >
        {actionLabel}
      </Link>
    </li>
  )
}
