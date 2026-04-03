import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { EVENT_TYPE_LABELS, STATUS_COLORS } from '@/types'
import type { Event, Guest, Invitation } from '@/types'
import StatsBar from '@/components/ui/StatsBar'

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (!event) notFound()

  const typedEvent = event as Event

  const { data: guests } = await supabase
    .from('guests')
    .select('*, invitations(*)')
    .eq('event_id', id)
    .order('created_at', { ascending: false })

  const guestList = (guests ?? []) as (Guest & { invitations: Invitation[] })[]
  const typeInfo = EVENT_TYPE_LABELS[typedEvent.type]

  const stats = [
    { label: 'Total invités', value: guestList.length, color: '#1C1612' },
    { label: 'Envoyés', value: guestList.filter((g) => g.status === 'sent').length, color: '#059669' },
    { label: 'Confirmés', value: guestList.filter((g) => g.status === 'verified').length, color: '#2563EB' },
    { label: 'Annulés', value: guestList.filter((g) => g.status === 'cancelled').length, color: '#DC2626' },
  ]

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{typeInfo.emoji}</span>
            <h1 className="text-2xl font-bold text-[var(--text-title)]">{typedEvent.name}</h1>
          </div>
          <p className="text-gray-500">
            {typeInfo.label} — {new Date(typedEvent.date).toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })} à {typedEvent.time} — {typedEvent.location}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/design/${id}`}
            className="px-4 py-2 bg-[var(--violet)] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-colors"
          >
            Design
          </Link>
          <Link
            href="/dashboard/guests"
            className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Invités
          </Link>
        </div>
      </div>

      <StatsBar stats={stats} />

      {typedEvent.ceremonies.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl p-6">
          <h2 className="font-semibold text-[var(--text-title)] mb-4">Cérémonies</h2>
          <div className="space-y-3">
            {typedEvent.ceremonies.map((ceremony, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <p className="font-medium text-sm">{ceremony.name}</p>
                  <p className="text-xs text-gray-500">
                    {ceremony.date && new Date(ceremony.date).toLocaleDateString('fr-FR')}
                    {ceremony.time && ` à ${ceremony.time}`}
                    {ceremony.location && ` — ${ceremony.location}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent guests */}
      <div className="mt-6 bg-white rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[var(--text-title)]">Derniers invités</h2>
          <Link
            href="/dashboard/guests"
            className="text-sm text-[var(--violet)] font-medium hover:underline"
          >
            Voir tous
          </Link>
        </div>

        {guestList.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">
            Aucun invité ajouté pour cet événement.
          </p>
        ) : (
          <div className="space-y-2">
            {guestList.slice(0, 5).map((guest) => {
              const statusInfo = STATUS_COLORS[guest.status]
              return (
                <div key={guest.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
                    >
                      {guest.first_name[0]}{guest.last_name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{guest.first_name} {guest.last_name}</p>
                      <p className="text-xs text-gray-400">{guest.phone}</p>
                    </div>
                  </div>
                  <span
                    className="text-xs font-medium px-3 py-1 rounded-full"
                    style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
                  >
                    {statusInfo.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
