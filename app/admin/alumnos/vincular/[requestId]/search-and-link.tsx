'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, UserCheck } from 'lucide-react'
import { searchStudentsByName, linkSignupToStudent } from '../actions'

type Result = {
  id: string
  full_name: string
  nickname: string | null
  email: string
  phone: string | null
}

export function SearchAndLink({
  requestId,
  defaultFullName,
  defaultEmail,
  defaultPhone,
  defaultUsername,
}: {
  requestId: string
  defaultFullName: string
  defaultEmail: string
  defaultPhone: string
  defaultUsername: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState(defaultFullName)
  const [results, setResults] = useState<Result[]>([])
  const [searched, setSearched] = useState(false)
  const [isSearching, startSearching] = useTransition()
  const [isLinking, startLinking] = useTransition()
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleSearch() {
    setError(null)
    startSearching(async () => {
      const result = await searchStudentsByName(query)
      if (result.error) {
        setError(result.error)
        return
      }
      setResults(result.results)
      setSearched(true)
    })
  }

  function handleLink(studentId: string) {
    setError(null)
    setLinkingId(studentId)
    const formData = new FormData()
    formData.set('full_name', defaultFullName)
    formData.set('email', defaultEmail)
    formData.set('phone', defaultPhone)
    formData.set('username', defaultUsername)

    startLinking(async () => {
      const result = await linkSignupToStudent(requestId, studentId, formData)
      if (result?.error) {
        setError(result.error)
        setLinkingId(null)
        return
      }
      router.push('/admin/alumnos')
    })
  }

  return (
    <div className="mt-6">
      <div className="rounded-2xl border border-sand bg-white p-6">
        <p className="text-sm font-medium text-ink">¿Ya está cargado en el sistema?</p>
        <p className="mt-0.5 text-xs text-ink/50">
          Buscá por nombre y apellido para ver si ya tiene una ficha con horario asignado.
        </p>
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Nombre y apellido..."
              className="w-full rounded-full border border-sand bg-linen/40 py-2.5 pl-10 pr-4 text-sm text-ink outline-none focus:border-moss focus:bg-white"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-white hover:bg-moss-dark disabled:opacity-50"
          >
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-clay">{error}</p>}

        {searched && (
          <ul className="mt-4 space-y-2">
            {results.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-sand bg-linen/30 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {r.full_name}
                    {r.nickname && <span className="ml-1.5 text-xs text-ink/40">"{r.nickname}"</span>}
                  </p>
                  <p className="text-xs text-ink/50">
                    {r.email}
                    {r.phone ? ` · ${r.phone}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleLink(r.id)}
                  disabled={isLinking}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-clay px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  <UserCheck size={13} strokeWidth={2} />
                  {isLinking && linkingId === r.id ? 'Vinculando...' : 'Vincular'}
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="rounded-xl bg-linen/50 px-4 py-6 text-center text-sm text-ink/40">
                No se encontraron coincidencias.
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="mt-4 text-center">
        <a
          href={`/admin/alumnos/nuevo?requestId=${requestId}&first_name=${encodeURIComponent(
            defaultFullName.split(' ')[0] ?? ''
          )}&last_name=${encodeURIComponent(
            defaultFullName.split(' ').slice(1).join(' ')
          )}&email=${encodeURIComponent(defaultEmail)}&phone=${encodeURIComponent(
            defaultPhone
          )}&username=${encodeURIComponent(defaultUsername)}`}
          className="text-sm text-ink/50 underline hover:text-ink"
        >
          Ninguno de estos, crear alumno nuevo
        </a>
      </div>
    </div>
  )
}
