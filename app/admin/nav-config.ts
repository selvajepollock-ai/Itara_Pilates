import {
  LayoutDashboard,
  Users,
  UserCog,
  CalendarDays,
  CreditCard,
  Wallet,
  BarChart3,
  Megaphone,
  Settings2,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
  /** Qué contador mostrar como badge (los valores los trae el layout). */
  badge?: 'signups' | 'overdue'
}

export type NavGroup = { label: string; items: NavItem[] }

// Solo cambian etiquetas y agrupación visual; las rutas son las de siempre.
// "Avisos" ya no está en el menú: se llega desde la campana.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operación',
    items: [
      { href: '/admin', label: 'Inicio', icon: LayoutDashboard, exact: true },
      { href: '/admin/horarios', label: 'Horarios', icon: CalendarDays },
      { href: '/admin/alumnos', label: 'Alumnos', icon: Users, badge: 'signups' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { href: '/admin/pagos', label: 'Pagos', icon: Wallet, badge: 'overdue' },
      { href: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
    ],
  },
  {
    label: 'Comunicación',
    items: [{ href: '/admin/notificaciones', label: 'Comunicados', icon: Megaphone }],
  },
  {
    label: 'Configuración',
    items: [
      { href: '/admin/planes', label: 'Planes', icon: CreditCard },
      { href: '/admin/instructores', label: 'Equipo', icon: UserCog },
      { href: '/admin/perfil', label: 'Ajustes del estudio', icon: Settings2 },
    ],
  },
]

export function isNavActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href)
}
