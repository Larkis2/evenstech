import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Event, Guest, Invitation, DesignConfig } from '@/types'
import InvitationCard from '@/components/invitation/InvitationCard'
import GuestbookForm from '@/components/invitation/GuestbookForm'

interface Props {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const supabase = await createClient()

  const { data: invitation } = await supabase
    .from('invitations')
    .select('*, guest:guests(*, event:events(*))')
    .eq('code', code)
    .single()

  if (!invitation) return { title: 'Invitation introuvable' }

  const guest = (invitation as unknown as { guest: Guest & { event: Event } }).guest
  const event = guest.event

  return {
    title: `${event.name} — Invitation de ${guest.first_name} ${guest.last_name}`,
    description: `Vous êtes invité(e) à ${event.name} le ${new Date(event.date).toLocaleDateString('fr-FR')} à ${event.location}`,
    openGraph: {
      title: event.name,
      description: `Invitation personnalisée pour ${guest.first_name} ${guest.last_name}`,
    },
  }
}

export default async function InvitationPage({ params }: Props) {
  const { code } = await params
  const supabase = await createClient()

  const { data: invitation } = await supabase
    .from('invitations')
    .select('*, guest:guests(*, event:events(*))')
    .eq('code', code)
    .single()

  if (!invitation) notFound()

  const typed = invitation as unknown as Invitation & {
    guest: Guest & { event: Event }
  }
  const guest = typed.guest
  const event = guest.event

  // Event-specific drink lists (fall back to defaults if empty)
  const eventData = event as Event & {
    boissons_alcoolisees?: string[]
    boissons_non_alcoolisees?: string[]
  }
  const alcoholOptions = eventData.boissons_alcoolisees && eventData.boissons_alcoolisees.length > 0
    ? eventData.boissons_alcoolisees
    : undefined
  const softOptions = eventData.boissons_non_alcoolisees && eventData.boissons_non_alcoolisees.length > 0
    ? eventData.boissons_non_alcoolisees
    : undefined

  // Check for existing guestbook entry
  const { data: existingEntry } = await supabase
    .from('guestbook_entries')
    .select('*')
    .eq('invitation_id', typed.id)
    .single()

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <InvitationCard
        event={event}
        guest={guest}
        invitation={typed}
        designConfig={event.design_config as DesignConfig}
      />

      <div className="max-w-lg mx-auto px-4 py-8">
        <GuestbookForm
          invitationId={typed.id}
          guestId={guest.id}
          guestFirstName={guest.first_name}
          existingEntry={existingEntry}
          alcoholOptions={alcoholOptions}
          softOptions={softOptions}
        />
      </div>
    </div>
  )
}
