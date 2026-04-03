'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import QRScanner from '@/components/scanner/QRScanner'

type ScanResult = 'valid' | 'already' | 'invalid' | null

interface ScanInfo {
  result: ScanResult
  guestName?: string
  tableSeat?: string
  code?: string
  scannedAt?: string // ISO timestamp for "already scanned"
}

export default function ScanPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<{ id: string; name: string }[]>([])
  const [selectedEvent, setSelectedEvent] = useState('')
  const [scanInfo, setScanInfo] = useState<ScanInfo>({ result: null })
  const [manualCode, setManualCode] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [stats, setStats] = useState({ verified: 0, total: 0 })
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    async function loadEvents() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!org) return

      const { data } = await supabase
        .from('events')
        .select('id, name')
        .eq('org_id', org.id)

      setEvents(data ?? [])
      if (data?.[0]) setSelectedEvent(data[0].id)
    }
    loadEvents()
  }, [supabase])

  const loadStats = useCallback(async () => {
    if (!selectedEvent) return
    const { data: guests } = await supabase
      .from('guests')
      .select('status')
      .eq('event_id', selectedEvent)

    const list = guests ?? []
    setStats({
      verified: list.filter((g) => g.status === 'verified').length,
      total: list.length,
    })
  }, [selectedEvent, supabase])

  // Load stats when event changes
  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Realtime subscription for live counter updates
  useEffect(() => {
    if (!selectedEvent) return

    const channel = supabase
      .channel(`scan-guests-${selectedEvent}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'guests', filter: `event_id=eq.${selectedEvent}` },
        () => { loadStats() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedEvent, supabase, loadStats])

  async function verifyCode(code: string) {
    if (!code.trim()) return
    setScanInfo({ result: null })

    const { data: invitation } = await supabase
      .from('invitations')
      .select('*, guest:guests(*)')
      .eq('code', code.trim().toUpperCase())
      .single()

    if (!invitation) {
      setScanInfo({ result: 'invalid', code })
      return
    }

    const guest = (invitation as Record<string, unknown>).guest as {
      first_name: string; last_name: string; table_seat: string; event_id: string
    } | undefined

    if (!guest) {
      setScanInfo({ result: 'invalid', code })
      return
    }

    // Check if it's for the selected event
    if (guest.event_id !== selectedEvent) {
      setScanInfo({ result: 'invalid', code })
      return
    }

    if (invitation.verified_at) {
      setScanInfo({
        result: 'already',
        guestName: `${guest.first_name} ${guest.last_name}`,
        tableSeat: guest.table_seat,
        code,
        scannedAt: invitation.verified_at as string,
      })
      return
    }

    setScanInfo({
      result: 'valid',
      guestName: `${guest.first_name} ${guest.last_name}`,
      tableSeat: guest.table_seat,
      code,
    })
  }

  async function confirmEntry() {
    if (scanInfo.result !== 'valid' || !scanInfo.code || processing) return
    setProcessing(true)

    // Get guest_id first
    const { data: inv } = await supabase
      .from('invitations')
      .select('guest_id')
      .eq('code', scanInfo.code)
      .single()

    if (!inv) {
      setProcessing(false)
      return
    }

    // Update invitation and guest in parallel
    await Promise.all([
      supabase
        .from('invitations')
        .update({ verified_at: new Date().toISOString(), verified_by: 'scanner' })
        .eq('code', scanInfo.code),
      supabase
        .from('guests')
        .update({ status: 'verified' })
        .eq('id', inv.guest_id),
    ])

    setScanInfo({ result: null })
    setProcessing(false)
    loadStats()
  }

  function formatScanTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  const resultConfig = {
    valid: { bg: '#D1FAE5', border: '#059669', icon: '✅', label: 'Invité valide' },
    already: { bg: '#DBEAFE', border: '#2563EB', icon: '⚠️', label: 'Déjà scanné' },
    invalid: { bg: '#FEE2E2', border: '#DC2626', icon: '❌', label: 'Code invalide' },
  }

  const progressPct = stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text-title)] mb-6">Contrôle entrée</h1>

      {/* Event selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-600 mb-2">Événement</label>
        <select
          value={selectedEvent}
          onChange={(e) => { setSelectedEvent(e.target.value); setScanInfo({ result: null }) }}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
        >
          {events.length === 0 && <option value="">Aucun événement</option>}
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>
      </div>

      {/* Live counter */}
      <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100 text-center">
        <div className="flex items-baseline justify-center gap-2 mb-3">
          <span className="text-5xl font-bold text-green-600">{stats.verified}</span>
          <span className="text-2xl text-gray-400">/</span>
          <span className="text-3xl font-semibold text-gray-500">{stats.total}</span>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          {stats.verified === 0 ? 'Aucune entrée pour le moment' : `entrée${stats.verified > 1 ? 's' : ''} confirmée${stats.verified > 1 ? 's' : ''}`}
        </p>
        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">{progressPct}% des invités</p>
      </div>

      {/* Scanner toggle */}
      {showScanner ? (
        <div className="mb-6">
          <QRScanner
            onScan={(code) => {
              verifyCode(code)
              setShowScanner(false)
            }}
            onClose={() => setShowScanner(false)}
          />
        </div>
      ) : (
        <button
          onClick={() => { setShowScanner(true); setScanInfo({ result: null }) }}
          disabled={!selectedEvent}
          className="w-full py-4 bg-[var(--violet)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-lg mb-4 disabled:opacity-50"
        >
          📷 Ouvrir le scanner
        </button>
      )}

      {/* Manual code fallback */}
      <div className="flex gap-2 mb-6">
        <input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value.toUpperCase())}
          placeholder="INV-2026-XXXX"
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--violet)] font-mono"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              verifyCode(manualCode)
              setManualCode('')
            }
          }}
        />
        <button
          onClick={() => { verifyCode(manualCode); setManualCode('') }}
          disabled={!manualCode.trim()}
          className="px-6 py-3 bg-gray-800 text-white font-medium rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          Vérifier
        </button>
      </div>

      {/* Scan result */}
      {scanInfo.result && (
        <div
          className="rounded-2xl p-6 text-center border-2 animate-in fade-in"
          style={{
            backgroundColor: resultConfig[scanInfo.result].bg,
            borderColor: resultConfig[scanInfo.result].border,
          }}
        >
          <div className="text-5xl mb-3">{resultConfig[scanInfo.result].icon}</div>
          <p className="text-lg font-bold mb-1">{resultConfig[scanInfo.result].label}</p>

          {scanInfo.guestName && (
            <p className="text-xl font-semibold mt-2">{scanInfo.guestName}</p>
          )}
          {scanInfo.tableSeat && (
            <p className="text-sm text-gray-600 mt-1">Table : {scanInfo.tableSeat}</p>
          )}
          {scanInfo.result === 'already' && scanInfo.scannedAt && (
            <p className="text-sm text-blue-600 mt-2">
              Scanné à {formatScanTime(scanInfo.scannedAt)}
            </p>
          )}
          {scanInfo.code && (
            <p className="text-xs text-gray-400 mt-2 font-mono">{scanInfo.code}</p>
          )}

          {scanInfo.result === 'valid' && (
            <button
              onClick={confirmEntry}
              disabled={processing}
              className="mt-4 px-8 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {processing ? 'Confirmation...' : 'Confirmer l\'entrée'}
            </button>
          )}

          {/* Reset button for new scan */}
          <button
            onClick={() => setScanInfo({ result: null })}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700 underline block mx-auto"
          >
            Nouveau scan
          </button>
        </div>
      )}
    </div>
  )
}
