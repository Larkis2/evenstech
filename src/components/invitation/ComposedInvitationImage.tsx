'use client'

import { useEffect, useState } from 'react'

interface ComposedInvitationImageProps {
  invitationCode: string
  eventName: string
  guestName: string
  backgroundUrl: string
}

export default function ComposedInvitationImage({
  invitationCode,
  eventName,
  guestName,
  backgroundUrl,
}: ComposedInvitationImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function compose() {
      try {
        const res = await fetch('/api/compose-invitation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invitationCode }),
        })

        if (!res.ok) throw new Error('Composition failed')

        const data = await res.json()
        setImageUrl(data.imageUrl)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    compose()
  }, [invitationCode])

  if (loading) {
    return (
      <div className="aspect-[9/16] max-w-lg mx-auto bg-gray-100 rounded-2xl flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-[var(--violet)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Génération de votre invitation...</p>
      </div>
    )
  }

  if (error || !imageUrl) {
    // Fallback: show the raw DALL-E background with basic text overlay
    return (
      <div className="relative max-w-lg mx-auto">
        <img
          src={backgroundUrl}
          alt={eventName}
          className="w-full rounded-2xl"
        />
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
          <p className="text-white text-xl font-bold drop-shadow-lg">
            {guestName}
          </p>
          <p className="text-white/60 text-xs mt-1 font-mono">{invitationCode}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <img
        src={imageUrl}
        alt={`Invitation de ${guestName} — ${eventName}`}
        className="w-full rounded-t-2xl"
      />
    </div>
  )
}
