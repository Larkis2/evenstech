'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import DesignEditor from './DesignEditor'

interface ImportDesignProps {
  eventId: string
  eventName?: string
  eventDate?: string
  eventTime?: string
  eventLocation?: string
  onSave: (config: Record<string, unknown>) => void
}

export default function ImportDesign({
  eventId, eventName, eventDate, eventTime, eventLocation, onSave,
}: ImportDesignProps) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(file: File) {
    setUploading(true)
    setError('')

    const ext = file.name.split('.').pop()
    const path = `${eventId}/design.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('design-imports')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('design-imports')
      .getPublicUrl(path)

    setImageUrl(publicUrl)
    setUploading(false)
  }

  // ── STEP 2: Full editor after upload ──
  if (imageUrl) {
    return (
      <DesignEditor
        imageUrl={imageUrl}
        eventName={eventName || ''}
        eventDate={eventDate}
        eventTime={eventTime}
        eventLocation={eventLocation}
        onSave={onSave}
        onBack={() => setImageUrl('')}
      />
    )
  }

  // ── STEP 1: Upload ──
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Uploadez votre design (PNG, JPG, PDF)
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-[var(--violet)] transition-colors"
        >
          <div className="text-4xl mb-3">📤</div>
          <p className="text-sm text-gray-500">
            Cliquez pour uploader votre fichier
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Photoshop, Illustrator, Canva, PowerPoint — exportez en PNG/JPG/PDF
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Taille recommandée : 900 x 1200 pixels
          </p>
          {uploading && <p className="text-sm text-[var(--violet)] mt-3">Upload en cours...</p>}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          className="hidden"
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
      )}
    </div>
  )
}
