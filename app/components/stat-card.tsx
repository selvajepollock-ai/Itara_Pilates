import Link from 'next/link'

/** Tarjeta de indicador clickeable. Los números van en sans con cifras tabulares. */
export function StatCard({
  label,
  value,
  hint,
  href,
  tone = 'default',
  children,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  href: string
  tone?: 'default' | 'danger'
  children?: React.ReactNode
}) {
  return (
    <Link href={href} className="surface-card-link block min-h-[44px] p-5">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`mt-2 text-[32px] font-semibold leading-none tracking-tight tabular-nums ${
          tone === 'danger' ? 'text-danger' : 'text-ink'
        }`}
      >
        {value}
      </p>
      {children && <div className="mt-3">{children}</div>}
      {hint && <p className="mt-2 text-[13px] leading-snug text-muted">{hint}</p>}
    </Link>
  )
}
