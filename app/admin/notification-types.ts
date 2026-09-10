export type InboxItem = {
  key: string
  kind: 'signup' | 'recovery' | 'plan' | 'cancellation'
  text: string
  href: string
  at: string | null
}
