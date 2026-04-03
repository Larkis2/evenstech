'use client'

import { useState } from 'react'
import { generateDesignProposals, refineDesign } from '@/lib/ai-design'
import type { AIDesignProposal } from '@/lib/ai-design'
import DesignEditor from './DesignEditor'

interface AIDesignChatProps {
  eventId: string
  eventType?: string
  eventName?: string
  eventDate?: string
  eventTime?: string
  eventLocation?: string
  onSave: (config: Record<string, unknown>) => void
}

export default function AIDesignChat({ eventId, eventType, eventName, eventDate, eventTime, eventLocation, onSave }: AIDesignChatProps) {
  const [description, setDescription] = useState('')
  const [proposals, setProposals] = useState<AIDesignProposal[]>([])
  const [selected, setSelected] = useState<AIDesignProposal | null>(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)

  async function handleGenerate() {
    if (!description.trim()) return
    setLoading(true)
    setError('')
    try {
      const results = await generateDesignProposals(description, eventType)
      setProposals(results)
      setSelected(null)
      setEditMode(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération. Réessayez.')
    }
    setLoading(false)
  }

  async function handleRefine() {
    if (!selected || !feedback.trim()) return
    setLoading(true)
    setError('')
    try {
      const refined = await refineDesign(selected, feedback)
      setSelected(refined)
      setFeedback('')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajustement. Réessayez.")
    }
    setLoading(false)
  }

  function handleOpenEditor() {
    if (!selected || !selected.imageUrl) return
    setEditMode(true)
  }

  // === DESIGN EDITOR MODE ===
  if (editMode && selected?.imageUrl) {
    return (
      <DesignEditor
        imageUrl={selected.imageUrl}
        eventName={eventName || ''}
        eventDate={eventDate}
        eventTime={eventTime}
        eventLocation={eventLocation}
        dallePrompt={selected.dallePrompt}
        label={selected.label}
        onSave={onSave}
        onBack={() => setEditMode(false)}
      />
    )
  }

  // === GENERATION / SELECTION MODE ===
  return (
    <div className="space-y-6">
      {/* Input description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Décrivez votre invitation idéale
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Ex: Mariage africain chic, fond rose et or, typographie élégante, fleurs tropicales, motifs wax subtils"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--violet)] resize-none"
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !description.trim()}
          className="mt-3 w-full py-3 bg-[var(--violet)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading && !selected ? 'Génération en cours (15-30s)...' : 'Générer 3 propositions'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Loading indicator */}
      {loading && !selected && proposals.length === 0 && (
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-4 border-[var(--violet)] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-gray-500 text-sm">L&apos;IA crée vos 3 designs...</p>
          <p className="text-gray-400 text-xs mt-1">Cela peut prendre 15 à 30 secondes</p>
        </div>
      )}

      {/* Proposals — image cards */}
      {proposals.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            {selected ? 'Design sélectionné' : 'Choisissez une proposition'}
          </h3>
          <div className={`grid gap-4 ${selected ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-1 md:grid-cols-3'}`}>
            {(selected ? [selected] : proposals).map((proposal, index) => (
              <button
                key={index}
                onClick={() => !selected && proposal.imageUrl && setSelected(proposal)}
                className={`text-left rounded-xl overflow-hidden border-2 transition-colors ${
                  selected === proposal
                    ? 'border-[var(--violet)] ring-2 ring-[var(--violet-pale)]'
                    : proposal.imageUrl
                      ? 'border-gray-100 hover:border-[var(--violet)]'
                      : 'border-red-200 opacity-60'
                }`}
              >
                {proposal.imageUrl ? (
                  <img
                    src={proposal.imageUrl}
                    alt={proposal.label}
                    className="w-full aspect-[9/16] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[9/16] bg-gray-100 flex items-center justify-center">
                    <p className="text-gray-400 text-sm px-4 text-center">
                      Erreur de génération
                    </p>
                  </div>
                )}
                <div className="p-3 bg-white">
                  <p className="text-sm font-medium text-[var(--text-title)]">{proposal.label}</p>
                </div>
              </button>
            ))}
          </div>

          {selected && !loading && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => { setSelected(null) }}
                className="text-sm text-gray-500 hover:underline"
              >
                Voir les 3 propositions
              </button>
            </div>
          )}
        </div>
      )}

      {/* Refinement + proceed to editor */}
      {selected && (
        <div className="border-t border-gray-100 pt-6 space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Demandez un ajustement
          </label>
          <div className="flex gap-2">
            <input
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Ex: Rends le fond plus clair, ajoute plus de doré..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
            />
            <button
              onClick={handleRefine}
              disabled={loading || !feedback.trim()}
              className="px-5 py-3 bg-gray-800 text-white font-medium rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : 'Ajuster'}
            </button>
          </div>

          <button
            onClick={handleOpenEditor}
            disabled={!selected.imageUrl}
            className="w-full py-3 bg-[var(--violet)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Personnaliser les textes &rarr;
          </button>
        </div>
      )}
    </div>
  )
}
