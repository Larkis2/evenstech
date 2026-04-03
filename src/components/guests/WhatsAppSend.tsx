'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildWhatsAppMessage, getWhatsAppUrl } from '@/lib/whatsapp'

interface WhatsAppSendProps {
  events: { id: string; name: string }[]
  onClose: () => void
}

interface GuestRow {
  id: string
  first_name: string
  last_name: string
  phone: string
  status: string
  event_id: string
  invitations: { code: string }[]
}

export default function WhatsAppSend({ events, onClose }: WhatsAppSendProps) {
  const supabase = createClient()
  const [eventId, setEventId] = useState(events[0]?.id ?? '')
  const [guests, setGuests] = useState<GuestRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [currentGuest, setCurrentGuest] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const eventName = events.find((e) => e.id === eventId)?.name ?? ''

  const loadGuests = useCallback(async () => {
    if (!eventId) return
    setLoading(true)
    const { data } = await supabase
      .from('guests')
      .select('id, first_name, last_name, phone, status, event_id, invitations(code)')
      .eq('event_id', eventId)
      .order('last_name')

    const list = (data ?? []) as GuestRow[]
    setGuests(list)
    // Pre-select guests that haven't been sent to yet
    const pending = new Set(list.filter((g) => g.status === 'pending').map((g) => g.id))
    setSelected(pending)
    setLoading(false)
  }, [eventId, supabase])

  useEffect(() => {
    loadGuests()
    setSentCount(0)
    setDone(false)
  }, [loadGuests])

  function toggleGuest(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === guests.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(guests.map((g) => g.id)))
    }
  }

  async function handleSend() {
    const toSend = guests.filter((g) => selected.has(g.id) && g.invitations[0]?.code)
    if (toSend.length === 0) return

    setSending(true)
    setSentCount(0)

    for (let i = 0; i < toSend.length; i++) {
      const guest = toSend[i]
      const code = guest.invitations[0].code
      const fullName = `${guest.first_name} ${guest.last_name}`

      setCurrentGuest(fullName)

      const message = buildWhatsAppMessage(fullName, code, eventName)
      const url = getWhatsAppUrl(guest.phone, message)

      // Open WhatsApp link
      window.open(url, '_blank')

      // Mark as sent in DB
      await supabase
        .from('guests')
        .update({ status: 'sent' })
        .eq('id', guest.id)

      await supabase
        .from('invitations')
        .update({ sent_at: new Date().toISOString() })
        .eq('code', code)

      setSentCount(i + 1)

      // Wait between each to avoid browser blocking popups
      if (i < toSend.length - 1) {
        await new Promise((r) => setTimeout(r, 1500))
      }
    }

    setSending(false)
    setDone(true)
    setCurrentGuest('')
  }

  const selectedCount = guests.filter((g) => selected.has(g.id) && g.invitations[0]?.code).length

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: 'En attente', color: '#7C3AED' },
    sent: { label: 'Envoyé', color: '#EC4899' },
    verified: { label: 'Confirmé', color: '#059669' },
    cancelled: { label: 'Annulé', color: '#DC2626' },
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-title)]">
            <span className="mr-2">💬</span>Envoyer sur WhatsApp
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {/* Done state */}
        {done ? (
          <div className="space-y-4">
            <div className="bg-green-50 text-green-700 p-6 rounded-xl text-center">
              <div className="text-4xl mb-2">&#10003;</div>
              <p className="font-semibold text-lg">
                {sentCount} invitation{sentCount > 1 ? 's' : ''} envoyée{sentCount > 1 ? 's' : ''} !
              </p>
              <p className="text-sm text-green-600 mt-1">
                Chaque invité a reçu un lien personnalisé.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-[var(--violet)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              Fermer
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Event selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Événement</label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                disabled={sending}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>

            {/* Message preview */}
            <div className="bg-[#DCF8C6] rounded-xl p-4 text-sm">
              <p className="font-medium text-gray-700 text-xs mb-2">Aperçu du message :</p>
              <p className="whitespace-pre-line text-gray-800">
                {buildWhatsAppMessage('[Prénom]', 'INV-2026-XXXX', eventName || '[Événement]')}
              </p>
            </div>

            {/* Guest list with checkboxes */}
            {loading ? (
              <p className="text-center text-gray-400 py-4">Chargement...</p>
            ) : guests.length === 0 ? (
              <p className="text-center text-gray-400 py-4">Aucun invité pour cet événement.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <button
                    onClick={selectAll}
                    disabled={sending}
                    className="text-sm text-[var(--violet)] hover:underline"
                  >
                    {selected.size === guests.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                  <span className="text-sm text-gray-500">
                    {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  {guests.map((guest) => {
                    const hasCode = !!guest.invitations[0]?.code
                    const status = statusLabels[guest.status] || statusLabels.pending
                    return (
                      <label
                        key={guest.id}
                        className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                          !hasCode ? 'opacity-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(guest.id)}
                          onChange={() => toggleGuest(guest.id)}
                          disabled={!hasCode || sending}
                          className="accent-[var(--violet)] w-4 h-4"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {guest.first_name} {guest.last_name}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">{guest.phone}</p>
                        </div>
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: status.color + '15', color: status.color }}
                        >
                          {status.label}
                        </span>
                        {!hasCode && (
                          <span className="text-xs text-red-400">Pas de code</span>
                        )}
                      </label>
                    )
                  })}
                </div>
              </>
            )}

            {/* Sending progress */}
            {sending && (
              <div className="bg-[#25D366]/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium text-[#25D366]">
                    Envoi en cours... {sentCount}/{selectedCount}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {currentGuest}
                </p>
                <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className="h-full bg-[#25D366] rounded-full transition-all duration-300"
                    style={{ width: `${selectedCount > 0 ? (sentCount / selectedCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={sending}
                className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={sending || selectedCount === 0}
                className="flex-1 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#25D366' }}
              >
                {sending
                  ? 'Envoi...'
                  : `Envoyer à ${selectedCount} invité${selectedCount > 1 ? 's' : ''}`
                }
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Chaque invitation s&apos;ouvrira dans un onglet WhatsApp. Autorisez les pop-ups si nécessaire.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
