import type { Event, Guest, Invitation, DesignConfig } from '@/types'
import QRCodeDisplay from './QRCodeDisplay'
import CeremoniesTimeline from './CeremoniesTimeline'
import ComposedInvitationImage from './ComposedInvitationImage'

interface InvitationCardProps {
  event: Event
  guest: Guest
  invitation: Invitation
  designConfig: DesignConfig
}

export default function InvitationCard({
  event,
  guest,
  invitation,
  designConfig,
}: InvitationCardProps) {
  const headerColor = designConfig.headerColor ?? '#1C1612'
  const accentColor = designConfig.accentColor ?? '#B8963E'
  const bodyColor = designConfig.bodyColor ?? '#FAF6EF'
  const namesFont = designConfig.namesFont ?? 'Playfair Display'

  // AI mode — composed image (DALL-E background + text/QR overlay)
  if (designConfig.mode === 'ai' && designConfig.imageUrl) {
    return (
      <div className="max-w-lg mx-auto">
        <ComposedInvitationImage
          invitationCode={invitation.code}
          eventName={event.name}
          guestName={`${guest.first_name} ${guest.last_name}`}
          backgroundUrl={designConfig.imageUrl}
        />

        {/* Ceremonies below the composed image */}
        {event.ceremonies.length > 0 && (
          <div className="bg-white px-8 py-6 rounded-b-2xl">
            <CeremoniesTimeline
              ceremonies={event.ceremonies}
              accentColor={accentColor}
            />
          </div>
        )}
      </div>
    )
  }

  // Import mode — image with overlaid text
  if (designConfig.mode === 'import' && designConfig.imageUrl) {
    return (
      <div className="relative max-w-lg mx-auto">
        <img
          src={designConfig.imageUrl}
          alt={event.name}
          className="w-full rounded-2xl"
        />
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
          <p className="text-white text-lg font-bold drop-shadow-lg">
            {guest.first_name} {guest.last_name}
          </p>
          <div className="mt-3 bg-white p-2 rounded-xl">
            <QRCodeDisplay code={invitation.code} size={120} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div
        className="rounded-t-2xl p-8 text-center"
        style={{ backgroundColor: headerColor }}
      >
        <p className="text-sm uppercase tracking-widest opacity-60" style={{ color: bodyColor }}>
          Vous êtes cordialement invité(e) à
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold mt-4 mb-2"
          style={{ color: accentColor, fontFamily: namesFont }}
        >
          {event.name}
        </h1>
        <p className="text-sm opacity-60" style={{ color: bodyColor }}>
          {new Date(event.date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          {' à '}{event.time}
        </p>
        <p className="text-sm mt-1 opacity-40" style={{ color: bodyColor }}>
          {event.location}
        </p>
      </div>

      {/* Guest name + QR */}
      <div className="p-8 text-center" style={{ backgroundColor: bodyColor }}>
        <p className="text-sm text-gray-500 mb-2">Invitation pour</p>
        <p
          className="text-2xl font-bold mb-1"
          style={{ color: headerColor, fontFamily: namesFont }}
        >
          {guest.first_name} {guest.last_name}
        </p>
        {guest.table_seat && (
          <p className="text-sm mb-6" style={{ color: accentColor }}>
            {guest.table_seat}
          </p>
        )}

        <div className="flex justify-center mb-6">
          <QRCodeDisplay code={invitation.code} size={160} />
        </div>

        <p className="text-xs text-gray-400 font-mono">{invitation.code}</p>

        {event.message && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 italic">{event.message}</p>
          </div>
        )}
      </div>

      {/* Ceremonies timeline */}
      {event.ceremonies.length > 0 && (
        <div className="px-8 pb-8" style={{ backgroundColor: bodyColor }}>
          <CeremoniesTimeline
            ceremonies={event.ceremonies}
            accentColor={accentColor}
          />
        </div>
      )}

      {/* Footer */}
      <div
        className="rounded-b-2xl p-4 text-center"
        style={{ backgroundColor: headerColor }}
      >
        <p className="text-xs opacity-40" style={{ color: bodyColor }}>
          Invitation non transférable — invit.app
        </p>
      </div>
    </div>
  )
}
