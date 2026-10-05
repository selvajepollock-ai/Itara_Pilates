import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

export type PushPayload = {
  title: string
  body: string
  /** Pantalla que se abre al tocar el aviso (ruta dentro de la app). */
  url?: string
  /** Avisos con el mismo tag se reemplazan entre sí. */
  tag?: string
}

let configured: boolean | null = null

/** Las claves se configuran en variables de entorno. Si faltan, los avisos se omiten sin romper nada. */
function configure() {
  if (configured !== null) return configured
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:hola@itarapilates.com.ar'
  if (!publicKey || !privateKey) {
    configured = false
    return false
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

/** Envía un aviso a todos los dispositivos de esas personas. Nunca lanza error: un aviso fallido no debe romper la acción que lo origina. */
export async function notifyUsers(userIds: string[], payload: PushPayload) {
  try {
    const ids = [...new Set(userIds.filter(Boolean))]
    if (ids.length === 0 || !configure()) return

    const admin = createAdminClient()
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', ids)
    if (!subs || subs.length === 0) return

    const body = JSON.stringify({ ...payload, url: payload.url ?? '/' })
    const expired: string[] = []

    await Promise.allSettled(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 24 })
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode
          // 404 / 410: el dispositivo ya no existe (desinstaló la app o revocó el permiso).
          if (status === 404 || status === 410) expired.push(s.id as string)
        }
      })
    )

    if (expired.length > 0) await admin.from('push_subscriptions').delete().in('id', expired)
  } catch {
    // Silencioso a propósito.
  }
}

/** Avisa a todas las personas con rol administrador. */
export async function notifyAdmins(payload: PushPayload) {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('profiles').select('id').contains('roles', ['admin'])
    await notifyUsers((data ?? []).map((p) => p.id as string), payload)
  } catch {
    // Silencioso a propósito.
  }
}

/** A quién le llega un comunicado, con el mismo criterio con el que lo ve cada persona en su panel. */
export async function resolveAnnouncementRecipients({
  targetType,
  usernames,
  classId,
}: {
  targetType: string
  usernames: string[] | null
  classId: string | null
}): Promise<string[]> {
  try {
    const admin = createAdminClient()
    if (targetType === 'people') {
      const { data } = await admin.from('profiles').select('id').in('username', usernames ?? [])
      return (data ?? []).map((p) => p.id as string)
    }
    if (targetType === 'class' && classId) {
      const [{ data: enrolled }, { data: cls }] = await Promise.all([
        admin.from('enrollments').select('student_id').eq('class_id', classId).eq('status', 'active'),
        admin.from('classes').select('instructor_id').eq('id', classId).maybeSingle(),
      ])
      return [...(enrolled ?? []).map((e) => e.student_id as string), ...(cls?.instructor_id ? [cls.instructor_id as string] : [])]
    }
    const { data } = await admin.from('profiles').select('id').overlaps('roles', ['student', 'instructor'])
    return (data ?? []).map((p) => p.id as string)
  } catch {
    return []
  }
}
