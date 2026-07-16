import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}
