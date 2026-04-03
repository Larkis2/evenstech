'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import DrinkSelector from './DrinkSelector'
import type { GuestbookEntry } from '@/types'

interface GuestbookFormProps {
  invitationId: string
  guestId: string
  guestFirstName: string
  existingEntry: GuestbookEntry | null
  alcoholOptions?: string[]
  softOptions?: string[]
}

export default function GuestbookForm({
  invitationId,
  guestId,
  guestFirstName,
  existingEntry,
  alcoholOptions,
  softOptions,
}: GuestbookFormProps) {
  const supabase = createClient()
  const existingDrinks = existingEntry?.drink_preferences ?? []

  const [message, setMessage] = useState(existingEntry?.message ?? '')
  const [selectedAlcool, setSelectedAlcool] = useState<string[]>(
    existingDrinks.length > 0 ? [existingDrinks[0]] : []
  )
  const [selectedSoft, setSelectedSoft] = useState<string[]>(
    existingDrinks.length > 1 ? [existingDrinks[1]] : []
  )
  const [plusOnes, setPlusOnes] = useState(existingEntry?.plus_ones ?? 0)
  const [submitted, setSubmitted] = useState(!!existingEntry)
  const [loading, setLoading] = useState(false)
  const [cancelled, setCancelled] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('guestbook_entries').insert({
      invitation_id: invitationId,
      message: message || null,
      drink_preferences: [...selectedAlcool, ...selectedSoft],
      plus_ones: plusOnes,
    })

    if (!error) {
      // Update guest status to verified
      await supabase
        .from('guests')
        .update({ status: 'verified' })
        .eq('id', guestId)

      setSubmitted(true)
    }
    setLoading(false)
  }

  async function handleCancel() {
    setLoading(true)
    await supabase
      .from('guests')
      .update({ status: 'cancelled' })
      .eq('id', guestId)

    setCancelled(true)
    setLoading(false)
  }

  if (cancelled) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">😔</div>
        <h3 className="text-lg font-semibold mb-2">Annulation enregistrée</h3>
        <p className="text-gray-500 text-sm">
          Nous sommes désolés de ne pas vous voir. Vous pouvez nous recontacter si vous changez d&apos;avis.
        </p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-lg font-semibold mb-2">
          Merci {guestFirstName} ! Vos préférences ont été enregistrées.
        </h3>
        <p className="text-gray-500 text-sm">
          Nous avons hâte de vous voir. Présentez votre QR code à l&apos;entrée le jour J.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 space-y-6">
      <h3 className="text-lg font-semibold text-[var(--text-title)] text-center">
        Vos préférences pour la soirée
      </h3>

      <DrinkSelector
        selectedAlcool={selectedAlcool}
        selectedSoft={selectedSoft}
        onChangeAlcool={setSelectedAlcool}
        onChangeSoft={setSelectedSoft}
        alcoholOptions={alcoholOptions}
        softOptions={softOptions}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nombre d&apos;accompagnants
        </label>
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPlusOnes(n)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                plusOnes === n
                  ? 'bg-[var(--violet)] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {n === 0 ? 'Seul(e)' : `+${n}`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Laisser un message aux organisateurs (optionnel)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--violet)] resize-none"
          placeholder="Félicitations ! Nous serons présents avec joie..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-[var(--violet)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? 'Envoi...' : 'Envoyer mes préférences'}
      </button>

      <button
        type="button"
        onClick={handleCancel}
        disabled={loading}
        className="w-full py-3 border border-red-200 text-red-500 font-medium rounded-xl hover:bg-red-50 transition-colors text-sm"
      >
        Je ne pourrai pas venir
      </button>
    </form>
  )
}
