'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Event, DesignMode } from '@/types'
import AIDesignChat from '@/components/design/AIDesignChat'
import ImportDesign from '@/components/design/ImportDesign'
import TemplateGallery from '@/components/design/TemplateGallery'

const TABS: { mode: DesignMode; label: string; icon: string }[] = [
  { mode: 'ai', label: 'IA', icon: '🤖' },
  { mode: 'import', label: 'Import', icon: '📤' },
  { mode: 'template', label: 'Templates', icon: '✨' },
]

export default function DesignEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [activeMode, setActiveMode] = useState<DesignMode>('ai')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()

      if (data) {
        const typed = data as Event
        setEvent(typed)
        setActiveMode(typed.design_mode)
      }
      setLoading(false)
    }
    load()
  }, [id, supabase])

  const [saved, setSaved] = useState(false)

  async function saveDesign(config: Record<string, unknown>) {
    await supabase
      .from('events')
      .update({
        design_mode: activeMode,
        design_config: { mode: activeMode, ...config },
      })
      .eq('id', id)

    setSaved(true)
    // Redirect to guests page after 1.5s
    setTimeout(() => {
      router.push(`/dashboard/guests?event_id=${id}`)
    }, 1500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Chargement...</div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Événement introuvable.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--dark)]">Design</h1>
          <p className="text-gray-500 text-sm mt-1">{event.name}</p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.mode}
            onClick={() => setActiveMode(tab.mode)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeMode === tab.mode
                ? 'bg-[var(--violet)] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Success toast */}
      {saved && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-center font-medium">
          Design sauvegardé &#10003; Redirection vers vos invités...
        </div>
      )}

      {/* Design mode content */}
      <div className="bg-white rounded-2xl p-6">
        {activeMode === 'ai' && (
          <AIDesignChat eventId={id} eventType={event.type} eventName={event.name} eventDate={event.date} eventTime={event.time} eventLocation={event.location} onSave={saveDesign} />
        )}
        {activeMode === 'import' && (
          <ImportDesign eventId={id} eventName={event.name} eventDate={event.date} eventTime={event.time} eventLocation={event.location} onSave={saveDesign} />
        )}
        {activeMode === 'template' && (
          <TemplateGallery eventId={id} eventName={event.name} eventDate={event.date} eventTime={event.time} eventLocation={event.location} onSave={saveDesign} />
        )}
      </div>
    </div>
  )
}
