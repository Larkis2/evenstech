import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { EVENT_TYPE_LABELS } from '@/types'
import type { Event } from '@/types'

export default async function DesignListPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('user_id', user?.id ?? '')
    .single()

  let events: Event[] = []
  if (org) {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('org_id', org.id)
      .order('date', { ascending: true })

    events = (data ?? []) as Event[]
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-title)] mb-6">Design</h1>

      {events.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🎨</div>
          <p className="text-gray-500">Créez d&apos;abord un événement pour accéder au design.</p>
          <Link
            href="/dashboard/events/new"
            className="inline-block mt-4 px-6 py-3 bg-[var(--violet)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Créer un événement
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => {
            const typeInfo = EVENT_TYPE_LABELS[event.type]
            return (
              <Link
                key={event.id}
                href={`/dashboard/design/${event.id}`}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow"
              >
                <span className="text-3xl">{typeInfo.emoji}</span>
                <h3 className="font-semibold text-[var(--text-title)] mt-3 mb-1">{event.name}</h3>
                <p className="text-sm text-gray-500">
                  Mode : {event.design_mode === 'ai' ? '🤖 IA' : event.design_mode === 'import' ? '📤 Import' : '✨ Template'}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
