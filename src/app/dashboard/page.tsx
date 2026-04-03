import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { EVENT_TYPE_LABELS } from '@/types'
import type { Event, Guest } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('user_id', user?.id ?? '')
    .single()

  let events: (Event & { guests: Pick<Guest, 'status'>[] })[] = []
  if (org) {
    const { data } = await supabase
      .from('events')
      .select('*, guests(status)')
      .eq('org_id', org.id)
      .order('date', { ascending: true })

    events = (data ?? []) as (Event & { guests: Pick<Guest, 'status'>[] })[]
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'ami(e)'

  // Compute stats across all events
  const allGuests = events.flatMap((e) => e.guests ?? [])
  const totalEvents = events.length
  const totalGuests = allGuests.length
  const totalConfirmed = allGuests.filter((g) => g.status === 'verified').length
  const totalSent = allGuests.filter((g) => g.status === 'sent').length

  const stats = [
    { label: 'Événements', value: totalEvents, color: '#7C3AED' },
    { label: 'Invités total', value: totalGuests, color: '#C49A3C' },
    { label: 'Confirmés', value: totalConfirmed, color: '#059669' },
    { label: 'Envoyés', value: totalSent, color: '#BE185D' },
  ]

  return (
    <div>
      {/* Hero block with CTA */}
      <div className="rounded-2xl p-8 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ backgroundColor: 'var(--hero-bg)' }}>
        <div>
          <h1 className="text-2xl font-bold text-white">
            Bonjour {firstName} !
          </h1>
          <p className="text-white/70 mt-1">
            {events.length === 0
              ? 'Créez votre premier événement pour commencer.'
              : `Vous avez ${events.length} événement${events.length > 1 ? 's' : ''}.`}
          </p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="shrink-0 px-6 py-3 bg-white text-[var(--text-title)] font-semibold rounded-xl hover:bg-gray-50 transition-colors"
        >
          + Créer un nouvel événement
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-5 border border-[var(--border-warm)]"
          >
            <p className="text-3xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Events grid — always 3 columns on desktop */}
      {events.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-xl font-semibold text-[var(--text-title)] mb-2">
            Aucun événement pour l&apos;instant
          </h2>
          <p className="text-gray-500 mb-8">
            Créez votre premier événement et commencez à envoyer des invitations.
          </p>
          <Link
            href="/dashboard/events/new"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--violet)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-lg"
          >
            Créer mon événement
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {events.map((event) => {
            const total = event.guests?.length ?? 0
            const sent = event.guests?.filter((g) => g.status !== 'pending').length ?? 0
            const typeInfo = EVENT_TYPE_LABELS[event.type]
            const progress = total > 0 ? Math.round((sent / total) * 100) : 0

            return (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}`}
                className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-warm)] hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{typeInfo.emoji}</span>
                  <span className="text-xs text-[var(--gold-dark)]">
                    {new Date(event.date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <h3 className="font-semibold text-[var(--text-title)] mb-1">{event.name}</h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">{typeInfo.label} — {event.location}</p>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{sent}/{total} envoyés</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-white/50 rounded-full h-2">
                    <div
                      className="bg-[var(--violet)] h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </Link>
            )
          })}

          {/* Create new event card */}
          <Link
            href="/dashboard/events/new"
            className="flex items-center justify-center bg-[var(--violet-pale)] rounded-2xl p-6 border-2 border-dashed border-[var(--violet-border)] hover:bg-[var(--violet)] hover:text-white hover:border-[var(--violet)] transition-colors min-h-[200px] group"
          >
            <div className="text-center">
              <div className="text-4xl text-[var(--violet)] group-hover:text-white mb-2">+</div>
              <span className="text-sm font-medium text-[var(--violet)] group-hover:text-white">
                Nouvel événement
              </span>
            </div>
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/dashboard/guests"
          className="flex items-center gap-4 bg-white rounded-2xl p-5 border border-[var(--border-warm)] hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-xl bg-[var(--violet-pale)] flex items-center justify-center text-2xl">
            👥
          </div>
          <div>
            <p className="font-semibold text-[var(--text-title)]">Ajouter des invités</p>
            <p className="text-sm text-gray-500">Manuellement ou par import Excel</p>
          </div>
        </Link>
        <Link
          href="/dashboard/guests"
          className="flex items-center gap-4 bg-white rounded-2xl p-5 border border-[var(--border-warm)] hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl">
            💬
          </div>
          <div>
            <p className="font-semibold text-[var(--text-title)]">Envoyer sur WhatsApp</p>
            <p className="text-sm text-gray-500">Invitations personnalisées par invité</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
