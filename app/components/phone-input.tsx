'use client'

import { useState } from 'react'

const COUNTRIES = [
  { code: '+54', label: '🇦🇷 Argentina' },
  { code: '+598', label: '🇺🇾 Uruguay' },
  { code: '+595', label: '🇵🇾 Paraguay' },
  { code: '+56', label: '🇨🇱 Chile' },
  { code: '+591', label: '🇧🇴 Bolivia' },
  { code: '+55', label: '🇧🇷 Brasil' },
  { code: '+57', label: '🇨🇴 Colombia' },
  { code: '+51', label: '🇵🇪 Perú' },
  { code: '+34', label: '🇪🇸 España' },
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
      <div className="flex gap-2">
        <select
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className="rounded-lg border border-sand bg-linen/40 px-2 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label} {c.code}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={rest}
          onChange={(e) => setRest(e.target.value)}
          placeholder="9 11 1234-5678"
          className="flex-1 rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
        />
      </div>
      <input type="hidden" name={name} value={combined} />
      <p className="mt-1 text-xs text-ink/40">
        Elegí el país y escribí el resto del número — queda listo para WhatsApp más adelante.
      </p>
    </div>
  )
}
