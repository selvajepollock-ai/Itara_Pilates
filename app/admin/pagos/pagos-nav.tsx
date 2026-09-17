'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/pagos', label: 'Resumen', exact: true },
  { href: '/admin/pagos/cuotas', label: 'Cuotas', exact: false },
  { href: '/admin/pagos/sueltas', label: 'Clases sueltas', exact: false },
]

export function PagosNav() {
  const pathname = usePathname()

  return (
    <div className="mt-6 flex gap-1 overflow-x-auto border-b border-sand">
      {TABS.map(({ href, label, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition ${
              isActive
                ? 'border-moss font-medium text-ink'
                : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
