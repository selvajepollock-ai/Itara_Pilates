export type InboxItem = {
  key: string
  kind: 'signup' | 'recovery' | 'plan' | 'cancellation' | 'birthday'
  text: string
  href: string
  at: string | null
}
