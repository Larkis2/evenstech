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

type Mode = 'select' | 'sending' | 'done'

export default function WhatsAppSend({ events, onClose }: WhatsAppSendProps) {
  const supabase = createClient()
  const [eventId, setEventId] = useState(events[0]?.id ?? '')
  const [guests, setGuests] = useState<GuestRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<Mode>('select')
  const [queue, setQueue] = useState<GuestRow[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sentCount, setSentCount] = useState(0)
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
    const pending = new Set(list.filter((g) => g.status === 'pending').map((g) => g.id))
    setSelected(pending)
    setLoading(false)
  }, [eventId, supabase])

  useEffect(() => {
    loadGuests()
    setSentCount(0)
    setMode('select')
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

  // Start the sending flow — build the queue
  function startSending() {
    const toSend = guests.filter((g) => selected.has(g.id) && g.invitations[0]?.code)
    if (toSend.length === 0) return
    setQueue(toSend)
    setCurrentIndex(0)
    setSentCount(0)
    setMode('sending')
  }

  // Open WhatsApp for the current guest
  function openCurrentWhatsApp() {
    const guest = queue[currentIndex]
    if (!guest) return
    const code = guest.invitations[0].code
    const fullName = `${guest.first_name} ${guest.last_name}`
    const message = buildWhatsAppMessage(fullName, code, eventName)
    const url = getWhatsAppUrl(guest.phone, message)
    window.open(url, '_blank')
  }

  // Mark current as sent and go to next
  async function markSentAndNext() {
    const guest = queue[currentIndex]
    if (!guest) return

    const code = guest.invitations[0].code

    // Mark as sent in DB
    await Promise.all([
      supabase.from('guests').update({ status: 'sent' }).eq('id', guest.id),
      supabase.from('invitations').update({ sent_at: new Date().toISOString() }).eq('code', code),
    ])

    const newSent = sentCount + 1
    setSentCount(newSent)

    if (currentIndex + 1 < queue.length) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setMode('done')
    }
  }

  // Skip current guest without marking sent
  function skipGuest() {
    if (currentIndex + 1 < queue.length) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setMode('done')
    }
  }

  const selectedCount = guests.filter((g) => selected.has(g.id) && g.invitations[0]?.code).length
  const currentGuest = queue[currentIndex]

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

        {/* ═══ DONE ═══ */}
        {mode === 'done' && (
          <div className="space-y-4">
            <div className="bg-green-50 text-green-700 p-6 rounded-xl text-center">
              <div className="text-4xl mb-2">&#10003;</div>
              <p className="font-semibold text-lg">
                {sentCount} invitation{sentCount > 1 ? 's' : ''} envoyée{sentCount > 1 ? 's' : ''} !
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-[var(--violet)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              Fermer
            </button>
          </div>
        )}

        {/* ═══ SENDING — One by one ═══ */}
        {mode === 'sending' && currentGuest && (
          <div className="space-y-4">
            {/* Progress */}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Invité {currentIndex + 1} sur {queue.length}</span>
              <span className="text-green-600 font-medium">{sentCount} envoyé{sentCount > 1 ? 's' : ''}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-[#25D366] rounded-full transition-all duration-300"
                style={{ width: `${queue.length > 0 ? ((currentIndex) / queue.length) * 100 : 0}%` }}
              />
            </div>

            {/* Current guest card */}
            <div className="bg-gray-50 rounded-xl p-5 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3"
                style={{ backgroundColor: '#25D366' + '20', color: '#25D366' }}
              >
                {currentGuest.first_name[0]}{currentGuest.last_name[0]}
              </div>
              <p className="text-lg font-semibold text-[var(--text-title)]">
                {currentGuest.first_name} {currentGuest.last_name}
              </p>
              <p className="text-sm text-gray-400 font-mono mt-1">{currentGuest.phone}</p>
            </div>

            {/* Message preview */}
            <div className="bg-[#DCF8C6] rounded-xl p-4 text-sm">
              <p className="whitespace-pre-line text-gray-800 text-xs">
                {buildWhatsAppMessage(
                  `${currentGuest.first_name} ${currentGuest.last_name}`,
                  currentGuest.invitations[0].code,
                  eventName
                )}
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              <p className="font-medium mb-1">Comment envoyer :</p>
              <ol className="list-decimal list-inside space-y-0.5 text-xs">
                <li>Cliquez <strong>&quot;Ouvrir WhatsApp&quot;</strong> ci-dessous</li>
                <li>WhatsApp s&apos;ouvre avec le message pr&ecirc;t</li>
                <li>Cliquez <strong>Envoyer</strong> dans WhatsApp</li>
                <li>Revenez ici et cliquez <strong>&quot;Envoy&eacute; — Suivant&quot;</strong></li>
              </ol>
            </div>

            {/* Action buttons */}
            <button
              onClick={openCurrentWhatsApp}
              className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-lg flex items-center justify-center gap-2"
              style={{ backgroundColor: '#25D366' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Ouvrir WhatsApp
            </button>

            <div className="flex gap-3">
              <button
                onClick={skipGuest}
                className="flex-1 py-3 border border-gray-200 text-gray-500 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Passer
              </button>
              <button
                onClick={markSentAndNext}
                className="flex-1 py-3 bg-[var(--violet)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                {currentIndex + 1 < queue.length ? 'Envoyé — Suivant' : 'Envoyé — Terminer'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ SELECT ═══ */}
        {mode === 'select' && (
          <div className="space-y-4">
            {/* Event selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Événement</label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>

            {/* How it works */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700">
              <p className="font-medium">Comment ça marche :</p>
              <p className="text-xs mt-1">
                Pour chaque invité, WhatsApp s&apos;ouvrira avec un message personnalisé prêt à envoyer.
                Vous cliquez &quot;Envoyer&quot; dans WhatsApp, puis passez au suivant.
              </p>
            </div>

            {/* Guest list */}
            {loading ? (
              <p className="text-center text-gray-400 py-4">Chargement...</p>
            ) : guests.length === 0 ? (
              <p className="text-center text-gray-400 py-4">Aucun invité pour cet événement.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <button
                    onClick={selectAll}
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
                          disabled={!hasCode}
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

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={startSending}
                disabled={selectedCount === 0}
                className="flex-1 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#25D366' }}
              >
                Envoyer à {selectedCount} invité{selectedCount > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
