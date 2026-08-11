import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_PATHS = ['/login', '/auth', '/forgot-password', '/registro']

// ⚙️ MODO MANTENIMIENTO — cambiar a false para volver a la normalidad
const MAINTENANCE_MODE = true

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Si está en mantenimiento, redirigir todo a /mantenimiento (salvo la propia página)
  if (MAINTENANCE_MODE && path !== '/mantenimiento' && !path.startsWith('/_next') && !path.startsWith('/icons') && !path.startsWith('/mantenimiento') && !path.match(/\.(gif|png|jpg|ico|svg|webmanifest|js)$/)) {
    return NextResponse.redirect(new URL('/mantenimiento', request.url))
  }

  const { supabaseResponse, user, supabase } = await updateSession(request)

  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p))

  // No autenticado intentando entrar a ruta protegida -> login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Autenticado entrando a "/" o "/login" -> lo mando a SU dashboard según rol
  if (user && (path === '/login' || path === '/')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .single()

    const roles: string[] = profile?.roles ?? ['student']
    const url = request.nextUrl.clone()
    url.pathname = roles.includes('admin')
      ? '/admin'
      : roles.includes('instructor')
        ? '/instructor'
        : '/alumno'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)',
  ],
}
