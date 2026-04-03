'use client'

import { useState } from 'react'
import AddGuestModal from './AddGuestModal'
import ImportExcel from './ImportExcel'
import WhatsAppSend from './WhatsAppSend'

interface GuestActionsProps {
  events: { id: string; name: string }[]
}

export default function GuestActions({ events }: GuestActionsProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setShowWhatsApp(true)}
          className="px-4 py-2 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#25D366' }}
        >
          WhatsApp
        </button>
        <button
          onClick={() => setShowImport(true)}
          className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
        >
          Import Excel
        </button>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-[var(--violet)] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-colors"
        >
          + Ajouter
        </button>
      </div>

      {showAdd && (
        <AddGuestModal events={events} onClose={() => setShowAdd(false)} />
      )}
      {showImport && (
        <ImportExcel events={events} onClose={() => setShowImport(false)} />
      )}
      {showWhatsApp && (
        <WhatsAppSend events={events} onClose={() => setShowWhatsApp(false)} />
      )}
    </>
  )
}
