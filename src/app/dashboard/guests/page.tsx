import { createClient } from '@/lib/supabase/server'
import { STATUS_COLORS } from '@/types'
import type { Guest, Invitation, Event } from '@/types'
import StatsBar from '@/components/ui/StatsBar'
import GuestActions from '@/components/guests/GuestActions'
import ExportReportPDF from '@/components/guests/ExportReportPDF'

export default async function GuestsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('user_id', user?.id ?? '')
    .single()

  // Get all events for this org
  const { data: events } = await supabase
    .from('events')
    .select('id, name')
    .eq('org_id', org?.id ?? '')

  const eventIds = (events ?? []).map((e: Pick<Event, 'id' | 'name'>) => e.id)

  // Get all guests with invitations
  let guestList: (Guest & { invitations: Invitation[] })[] = []
  if (eventIds.length > 0) {
    const { data: guests } = await supabase
      .from('guests')
      .select('*, invitations(*)')
      .in('event_id', eventIds)
      .order('created_at', { ascending: false })

    guestList = (guests ?? []) as (Guest & { invitations: Invitation[] })[]
  }

  const stats = [
    { label: 'Total', value: guestList.length, color: '#1C1612' },
    { label: 'Envoyés', value: guestList.filter((g) => g.status === 'sent').length, color: '#059669' },
    { label: 'Confirmés', value: guestList.filter((g) => g.status === 'verified').length, color: '#2563EB' },
    { label: 'Annulés', value: guestList.filter((g) => g.status === 'cancelled').length, color: '#DC2626' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-title)]">Mes invités</h1>
        <div className="flex items-center gap-3">
          <ExportReportPDF events={events ?? []} />
          <GuestActions events={events ?? []} />
        </div>
      </div>

      <StatsBar stats={stats} />

      <div className="mt-6 bg-white rounded-2xl overflow-hidden">
        {guestList.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-gray-500">Aucun invité pour l&apos;instant.</p>
            <p className="text-gray-400 text-sm mt-1">
              Ajoutez des invités manuellement ou importez un fichier Excel.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Invité</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden md:table-cell">WhatsApp</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden md:table-cell">Table</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Statut</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Code</th>
                </tr>
              </thead>
              <tbody>
                {guestList.map((guest) => {
                  const statusInfo = STATUS_COLORS[guest.status]
                  const invitation = guest.invitations?.[0]
                  return (
                    <tr key={guest.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
                          >
                            {guest.first_name[0]}{guest.last_name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{guest.first_name} {guest.last_name}</p>
                            {guest.group_name && (
                              <p className="text-xs text-gray-400">{guest.group_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                        {guest.phone}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                        {guest.table_seat || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-medium px-3 py-1 rounded-full"
                          style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                        {invitation?.code ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
