'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateTableReport } from '@/lib/generate-report'

interface ExportReportPDFProps {
  events: { id: string; name: string }[]
}

export default function ExportReportPDF({ events }: ExportReportPDFProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? '')

  async function handleExport() {
    if (!selectedEventId) return
    setLoading(true)

    try {
      const event = events.find(e => e.id === selectedEventId)
      if (!event) return

      // Fetch guests with guestbook entries
      const { data: guests } = await supabase
        .from('guests')
        .select('*, invitations(id)')
        .eq('event_id', selectedEventId)
        .order('table_seat', { ascending: true })

      if (!guests || guests.length === 0) {
        alert('Aucun invité trouvé pour cet événement.')
        return
      }

      // Fetch guestbook entries for all invitations
      const invitationIds = guests
        .flatMap((g: { invitations?: { id: string }[] }) => g.invitations?.map(inv => inv.id) ?? [])

      let guestbookMap = new Map<string, { message?: string; drink_preferences: string[]; plus_ones: number }>()
      if (invitationIds.length > 0) {
        const { data: entries } = await supabase
          .from('guestbook_entries')
          .select('*')
          .in('invitation_id', invitationIds)

        for (const entry of entries ?? []) {
          guestbookMap.set(entry.invitation_id, entry)
        }
      }

      // Map guests with their guestbook entries
      const guestsWithEntries = guests.map((guest) => {
        const invitations = (guest as { invitations?: { id: string }[] }).invitations
        const invId = invitations?.[0]?.id
        return {
          id: guest.id as string,
          event_id: guest.event_id as string,
          first_name: guest.first_name as string,
          last_name: guest.last_name as string,
          phone: guest.phone as string,
          email: guest.email as string | undefined,
          table_seat: guest.table_seat as string | undefined,
          group_name: guest.group_name as string | undefined,
          status: guest.status as 'pending' | 'sent' | 'verified' | 'cancelled',
          created_at: guest.created_at as string,
          guestbook: invId ? guestbookMap.get(invId) ?? null : null,
        }
      })

      const doc = generateTableReport(event.name, guestsWithEntries)
      doc.save(`rapport-${event.name.toLowerCase().replace(/\s+/g, '-')}.pdf`)
    } catch (err) {
      console.error('Export error:', err)
      alert('Erreur lors de l\'export.')
    } finally {
      setLoading(false)
    }
  }

  if (events.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      {events.length > 1 && (
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      )}
      <button
        onClick={handleExport}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-[var(--violet)] border-t-transparent rounded-full animate-spin" />
        ) : (
          <span>📄</span>
        )}
        Rapport PDF
      </button>
    </div>
  )
}
