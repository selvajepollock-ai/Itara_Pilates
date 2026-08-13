'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
export async function updateMyProfile(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }
  const fullName = String(formData.get('full_name') ?? '').trim()
  const username = String(formData.get('username') ?? '').trim().toLowerCase()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!fullName || !email) return { error: 'Nombre y email son obligatorios.' }
  if (username && /\s/.test(username)) return { error: 'El usuario no puede tener espacios.' }
  if (email !== user.email) {
    const { error: authError } = await supabase.auth.updateUser({ email })
    if (authError) return { error: authError.message }
  }
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, username: username || null, email })
    .eq('id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/admin/perfil')
  return { success: true }
}
export async function updateStudioSettings(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }
  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).maybeSingle()
  if (!profile?.roles?.includes('admin')) return { error: 'No tenés permisos.' }
  const cancellationMinHours = Number(formData.get('cancellation_min_hours') ?? 2)
  const paymentDueDay = Number(formData.get('payment_due_day') ?? 10)
  const paymentReminderDaysBefore = Number(formData.get('payment_reminder_days_before') ?? 3)
  const dropInPrice1 = Number(formData.get('drop_in_price_1') ?? 10000)
  const dropInPrice2 = Number(formData.get('drop_in_price_2') ?? 9000)
  const dropInPrice3 = Number(formData.get('drop_in_price_3') ?? 8000)
  const dropInPrice4Plus = Number(formData.get('drop_in_price_4_plus') ?? 7000)
  const { error } = await supabase
    .from('studio_settings')
    .update({
      cancellation_min_hours: cancellationMinHours,
      payment_due_day: paymentDueDay,
      payment_reminder_days_before: paymentReminderDaysBefore,
      drop_in_price_1: dropInPrice1,
      drop_in_price_2: dropInPrice2,
      drop_in_price_3: dropInPrice3,
      drop_in_price_4_plus: dropInPrice4Plus,
    })
    .eq('id', 1)
  if (error) return { error: error.message }
  revalidatePath('/admin/perfil')
  return { success: true }
}
export async function updateMyPassword(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }
  const password = String(formData.get('password') ?? '')
  if (password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres.' }
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }
  return { success: true }
}
