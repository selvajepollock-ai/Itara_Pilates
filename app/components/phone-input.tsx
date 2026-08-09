'use client'

import { useState } from 'react'

const COUNTRIES = [
  { code: '+54', name: 'Argentina' },
  { code: '+598', name: 'Uruguay' },
  { code: '+595', name: 'Paraguay' },
  { code: '+56', name: 'Chile' },
  { code: '+591', name: 'Bolivia' },
  { code: '+55', name: 'Brasil' },
  { code: '+57', name: 'Colombia' },
  { code: '+51', name: 'Perú' },
  { code: '+34', name: 'España' },
]

// Intenta separar un teléfono guardado ("+54 9 11 1234-5678") en código de país + resto.
function splitPhone(value: string) {
  const match = COUNTRIES.find((c) => value.startsWith(c.code))
  if (match) {
    return { countryCode: match.code, rest: value.slice(match.code.length).trim() }
  }
  return { countryCode: '+54', rest: value }
}

export function PhoneInput({ name, defaultValue = '' }: { name: string; defaultValue?: string }) {
  const initial = splitPhone(defaultValue)
  const [countryCode, setCountryCode] = useState(initial.countryCode)
  const [rest, setRest] = useState(initial.rest)

  const combined = rest ? `${countryCode} ${rest}` : ''

  return (
    <div>
      <div className="flex gap-1.5">
        <select
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          title={COUNTRIES.find((c) => c.code === countryCode)?.name}
          className="w-[70px] shrink-0 rounded-lg border border-sand bg-linen/40 px-1.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code} title={c.name}>
              {c.code}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={rest}
          onChange={(e) => setRest(e.target.value)}
          placeholder="9 11 1234-5678"
          className="min-w-0 flex-1 rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
        />
      </div>
      <input type="hidden" name={name} value={combined} />
      <p className="mt-1 text-xs text-ink/40">Código de país + número.</p>
    </div>
  )
}
