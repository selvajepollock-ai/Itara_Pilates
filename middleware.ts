import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_PATHS = ['/login']

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const path = request.nextUrl.pathname

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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/).*)'],
}
