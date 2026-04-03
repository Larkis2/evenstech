'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StepWizard from '@/components/ui/StepWizard'
import type { EventType, Ceremony, DesignMode } from '@/types'
import { BOISSONS_ALCOOLISEES_DEFAULT, BOISSONS_NON_ALCOOLISEES_DEFAULT } from '@/lib/drinks'

const STEPS = ['Informations', 'Cérémonies', 'Design']

const EVENT_TYPES: { value: EventType; emoji: string; label: string }[] = [
  { value: 'mariage', emoji: '💍', label: 'Mariage' },
  { value: 'anniversaire', emoji: '🎂', label: 'Anniversaire' },
  { value: 'corporate', emoji: '🏢', label: 'Corporate' },
  { value: 'bapteme', emoji: '⛪', label: 'Baptême' },
  { value: 'dot', emoji: '🤝', label: 'Dot' },
  { value: 'autre', emoji: '🎉', label: 'Autre' },
]

const CEREMONY_TEMPLATES = [
  { name: 'Dot (cérémonie traditionnelle)', icon: '🤝' },
  { name: 'Cérémonie civile', icon: '📋' },
  { name: 'Cérémonie religieuse', icon: '⛪' },
  { name: 'Réception', icon: '🎉' },
]

export default function NewEventPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [type, setType] = useState<EventType>('mariage')
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [address, setAddress] = useState('')

  // Step 2
  const [ceremonies, setCeremonies] = useState<Ceremony[]>([])
  const [message, setMessage] = useState('')
  const [boissonsAlcool, setBoissonsAlcool] = useState<string[]>(BOISSONS_ALCOOLISEES_DEFAULT)
  const [boissonsSoft, setBoissonsSoft] = useState<string[]>(BOISSONS_NON_ALCOOLISEES_DEFAULT)
  const [newAlcool, setNewAlcool] = useState('')
  const [newSoft, setNewSoft] = useState('')

  // Step 3
  const [designMode, setDesignMode] = useState<DesignMode>('ai')

  function addCeremony(templateName: string) {
    if (ceremonies.some((c) => c.name === templateName)) return
    setCeremonies([...ceremonies, { name: templateName, date: '', time: '', location: '' }])
  }

  function removeCeremony(index: number) {
    setCeremonies(ceremonies.filter((_, i) => i !== index))
  }

  function updateCeremony(index: number, field: keyof Ceremony, value: string) {
    const updated = [...ceremonies]
    updated[index] = { ...updated[index], [field]: value }
    setCeremonies(updated)
  }

  async function handleCreate() {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Vous devez être connecté')
      setLoading(false)
      return
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!org) {
      setError('Organisation introuvable')
      setLoading(false)
      return
    }

    const { data: event, error: createError } = await supabase
      .from('events')
      .insert({
        org_id: org.id,
        name,
        type,
        date,
        time,
        location,
        address: address || null,
        message: message || null,
        ceremonies,
        design_mode: designMode,
        design_config: { mode: designMode },
        boissons_alcoolisees: boissonsAlcool,
        boissons_non_alcoolisees: boissonsSoft,
      })
      .select()
      .single()

    if (createError) {
      setError(createError.message)
      setLoading(false)
      return
    }

    // Redirect to design editor or event detail
    if (designMode === 'ai' || designMode === 'import' || designMode === 'template') {
      router.push(`/dashboard/design/${event.id}`)
    } else {
      router.push(`/dashboard/events/${event.id}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text-title)] mb-6">Créer un événement</h1>

      <StepWizard steps={STEPS} currentStep={step} />

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">{error}</div>
      )}

      {/* Step 1: Informations */}
      {step === 0 && (
        <div className="bg-white rounded-2xl p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type d&apos;événement
            </label>
            <div className="grid grid-cols-3 gap-2">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-colors ${
                    type === t.value
                      ? 'border-[var(--violet)] bg-[var(--violet-pale)]'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l&apos;événement
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              placeholder="Mariage de Sophie & Patrick"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heure</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              placeholder="Salle Émeraude, Kinshasa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse complète (optionnel)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              placeholder="Avenue du Commerce 123, Gombe"
            />
          </div>

          <button
            onClick={() => setStep(1)}
            disabled={!name || !date || !time || !location}
            className="w-full py-3 bg-[var(--violet)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}

      {/* Step 2: Cérémonies */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Cérémonies (optionnel)
            </label>
            <div className="flex flex-wrap gap-2 mb-4">
              {CEREMONY_TEMPLATES.map((ct) => (
                <button
                  key={ct.name}
                  onClick={() => addCeremony(ct.name)}
                  disabled={ceremonies.some((c) => c.name === ct.name)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{ct.icon}</span>
                  {ct.name}
                </button>
              ))}
            </div>

            {ceremonies.map((ceremony, index) => (
              <div key={index} className="border border-gray-100 rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm">{ceremony.name}</span>
                  <button
                    onClick={() => removeCeremony(index)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    Retirer
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="date"
                    value={ceremony.date}
                    onChange={(e) => updateCeremony(index, 'date', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
                  />
                  <input
                    type="time"
                    value={ceremony.time}
                    onChange={(e) => updateCeremony(index, 'time', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
                  />
                  <input
                    type="text"
                    value={ceremony.location}
                    onChange={(e) => updateCeremony(index, 'location', e.target.value)}
                    placeholder="Lieu"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
                  />
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message personnalisé (optionnel)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--violet)] resize-none"
              placeholder="Un mot spécial pour vos invités..."
            />
          </div>

          {/* Boissons personnalisables */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Boissons proposées aux invités
            </label>

            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Alcoolisées (cliquez pour retirer)</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {boissonsAlcool.map((drink) => (
                  <button
                    key={drink}
                    type="button"
                    onClick={() => setBoissonsAlcool(boissonsAlcool.filter(d => d !== drink))}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--violet-pale)] text-[var(--violet)] hover:bg-red-100 hover:text-red-600 transition-colors"
                  >
                    {drink} &times;
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAlcool}
                  onChange={(e) => setNewAlcool(e.target.value)}
                  placeholder="Ajouter une boisson..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newAlcool.trim()) {
                      e.preventDefault()
                      if (!boissonsAlcool.includes(newAlcool.trim())) {
                        setBoissonsAlcool([...boissonsAlcool, newAlcool.trim()])
                      }
                      setNewAlcool('')
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newAlcool.trim() && !boissonsAlcool.includes(newAlcool.trim())) {
                      setBoissonsAlcool([...boissonsAlcool, newAlcool.trim()])
                    }
                    setNewAlcool('')
                  }}
                  className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">Non alcoolisées (cliquez pour retirer)</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {boissonsSoft.map((drink) => (
                  <button
                    key={drink}
                    type="button"
                    onClick={() => setBoissonsSoft(boissonsSoft.filter(d => d !== drink))}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--violet-pale)] text-[var(--violet)] hover:bg-red-100 hover:text-red-600 transition-colors"
                  >
                    {drink} &times;
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSoft}
                  onChange={(e) => setNewSoft(e.target.value)}
                  placeholder="Ajouter une boisson..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSoft.trim()) {
                      e.preventDefault()
                      if (!boissonsSoft.includes(newSoft.trim())) {
                        setBoissonsSoft([...boissonsSoft, newSoft.trim()])
                      }
                      setNewSoft('')
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newSoft.trim() && !boissonsSoft.includes(newSoft.trim())) {
                      setBoissonsSoft([...boissonsSoft, newSoft.trim()])
                    }
                    setNewSoft('')
                  }}
                  className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Retour
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-[var(--violet)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Design mode choice */}
      {step === 2 && (
        <div className="bg-white rounded-2xl p-6 space-y-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Comment voulez-vous créer votre invitation ?
          </label>

          <div className="space-y-3">
            {[
              {
                mode: 'ai' as DesignMode,
                icon: '🤖',
                title: 'IA — Décrivez votre idée',
                desc: 'Décrivez ce que vous voulez et l\'IA crée le design pour vous.',
              },
              {
                mode: 'import' as DesignMode,
                icon: '📤',
                title: 'Import — Votre propre fichier',
                desc: 'Uploadez un design de Photoshop, Canva, PowerPoint...',
              },
              {
                mode: 'template' as DesignMode,
                icon: '✨',
                title: 'Templates — Modèles animés',
                desc: 'Choisissez parmi nos modèles avec effets visuels.',
              },
            ].map((option) => (
              <button
                key={option.mode}
                onClick={() => setDesignMode(option.mode)}
                className={`w-full text-left flex items-start gap-4 p-5 rounded-xl border-2 transition-colors ${
                  designMode === option.mode
                    ? 'border-[var(--violet)] bg-[var(--violet-pale)]'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <span className="text-3xl">{option.icon}</span>
                <div>
                  <p className="font-semibold text-[var(--text-title)]">{option.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{option.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Retour
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1 py-3 bg-[var(--violet)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer l\'événement'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
