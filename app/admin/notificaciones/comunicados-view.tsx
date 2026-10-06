'use client'

import { useState } from 'react'
import { AnnouncementsHistory, type HistoryItem } from './announcements-history'
import { NewAnnouncementForm, type ClassOption, type UpcomingBirthday } from './new-announcement-form'
import type { Person } from './people-picker'

/** Une el formulario con el historial: "Usar como modelo" carga el texto en el paso 2. */
export function ComunicadosView(props: {
  classOptions: ClassOption[]
  people: Person[]
  counts: { students: number; instructors: number }
  today: string
  birthdays: UpcomingBirthday[]
  items: HistoryItem[]
}) {
  const [loaded, setLoaded] = useState<{ text: string; nonce: number } | null>(null)
  const { items, ...formProps } = props
  return (
    <>
      <NewAnnouncementForm {...formProps} loaded={loaded} />
      <AnnouncementsHistory
        items={items}
        onUseAsModel={(text) => {
          setLoaded({ text, nonce: Date.now() })
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />
    </>
  )
}
