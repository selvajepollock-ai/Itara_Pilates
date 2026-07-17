import type { Metadata } from 'next'
import { Fraunces, Work_Sans } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
})

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Estudio Pilates',
  description: 'Gestión de clases, alumnos e instructores',
  manifest: '/manifest.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${fraunces.variable} ${workSans.variable}`}>
      <body className="min-h-screen bg-linen font-sans text-ink antialiased">{children}</body>
    </html>
  )
}
