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
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!fullName || !email) return { error: 'Nombre y email son obligatorios.' }

  if (email !== user.email) {
    const { error: authError } = await supabase.auth.updateUser({ email })
    if (authError) return { error: authError.message }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, email })
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

  const { error } = await supabase
    .from('studio_settings')
    .update({
      cancellation_min_hours: cancellationMinHours,
      payment_due_day: paymentDueDay,
      payment_reminder_days_before: paymentReminderDaysBefore,
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
