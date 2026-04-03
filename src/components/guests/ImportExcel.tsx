'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { importGuestsFromExcel } from '@/lib/import-guests'

interface ImportExcelProps {
  events: { id: string; name: string }[]
  onClose: () => void
}

interface ParsedGuest {
  firstName: string
  lastName: string
  phone: string
  tableSeat: string
  group: string
}

const TEMPLATE_COLUMNS = ['Prénom', 'Nom', 'Téléphone WhatsApp', 'Table / Siège', 'Groupe']

function downloadTemplate() {
  const wb = XLSX.utils.book_new()
  const wsData = [
    TEMPLATE_COLUMNS,
    ['Jean', 'Lumumba', '+243812345678', 'Table Orchidée', 'Famille marié'],
    ['Sophie', 'Mutombo', '+243898765432', 'Table Rose', 'Amis mariée'],
    ['Alain', 'Mukendi', '+243811112222', 'Table VIP', 'Collègues'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 20 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Invités')
  XLSX.writeFile(wb, 'modele-invites.xlsx')
}

function parseFile(file: File): Promise<{ guests: ParsedGuest[]; errors: string[] }> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer
        const workbook = XLSX.read(buffer)
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet)

        const errors: string[] = []
        const guests: ParsedGuest[] = []

        rows.forEach((row, index) => {
          const firstName = (row['Prénom'] || row['Prenom'] || row['prenom'] || '').trim()
          const lastName = (row['Nom'] || row['nom'] || '').trim()
          const phone = (row['Téléphone WhatsApp'] || row['Telephone'] || row['phone'] || '').trim()
          const tableSeat = (row['Table / Siège'] || row['Table'] || '').trim()
          const group = (row['Groupe'] || row['groupe'] || '').trim()

          if (!firstName || !lastName || !phone) {
            errors.push(`Ligne ${index + 2}: données manquantes (prénom, nom ou téléphone)`)
            return
          }

          guests.push({ firstName, lastName, phone, tableSeat, group })
        })

        resolve({ guests, errors })
      } catch {
        resolve({ guests: [], errors: ['Impossible de lire le fichier. Vérifiez le format.'] })
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

export default function ImportExcel({ events, onClose }: ImportExcelProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [eventId, setEventId] = useState(events[0]?.id ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{ guests: ParsedGuest[]; errors: string[] } | null>(null)
  const [result, setResult] = useState<{ count: number; errors: string[] } | null>(null)

  async function handleFileSelect(selectedFile: File) {
    setFile(selectedFile)
    setResult(null)
    const parsed = await parseFile(selectedFile)
    setPreview(parsed)
  }

  async function handleImport() {
    if (!file || !eventId) return
    setLoading(true)

    const res = await importGuestsFromExcel(file, eventId)
    setResult(res)
    setLoading(false)

    if (res.count > 0) {
      router.refresh()
    }
  }

  function resetPreview() {
    setFile(null)
    setPreview(null)
    setResult(null)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-title)]">Importer depuis Excel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {/* ── Step 3: Result ── */}
        {result ? (
          <div className="space-y-4">
            <div className="bg-green-50 text-green-700 p-4 rounded-xl text-center">
              <div className="text-3xl mb-2">&#10003;</div>
              <p className="font-semibold text-lg">
                {result.count} invité{result.count > 1 ? 's' : ''} importé{result.count > 1 ? 's' : ''} avec succès !
              </p>
              <p className="text-sm text-green-600 mt-1">
                Un code INV-XXXX-XXXX a été généré pour chaque invité.
              </p>
            </div>
            {result.errors.length > 0 && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm space-y-1">
                {result.errors.map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full py-3 bg-[var(--violet)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              Fermer
            </button>
          </div>
        ) : preview ? (
          /* ── Step 2: Preview ── */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-[var(--text-title)]">{preview.guests.length}</span> invité{preview.guests.length > 1 ? 's' : ''} détecté{preview.guests.length > 1 ? 's' : ''}
                {file && <span className="text-gray-400 ml-2">({file.name})</span>}
              </p>
              <button onClick={resetPreview} className="text-sm text-[var(--violet)] hover:underline">
                Changer de fichier
              </button>
            </div>

            {preview.errors.length > 0 && (
              <div className="bg-amber-50 text-amber-700 p-3 rounded-xl text-sm space-y-1">
                <p className="font-medium">Lignes ignorées :</p>
                {preview.errors.map((err, i) => (
                  <p key={i} className="text-xs">{err}</p>
                ))}
              </div>
            )}

            {/* Preview table */}
            {preview.guests.length > 0 && (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">#</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Prénom</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Nom</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Téléphone</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Table</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Groupe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.guests.map((g, i) => (
                        <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                          <td className="px-3 py-2">{g.firstName}</td>
                          <td className="px-3 py-2">{g.lastName}</td>
                          <td className="px-3 py-2 font-mono text-xs">{g.phone}</td>
                          <td className="px-3 py-2 text-gray-500">{g.tableSeat || '—'}</td>
                          <td className="px-3 py-2 text-gray-500">{g.group || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Event selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Événement</label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleImport}
                disabled={loading || preview.guests.length === 0}
                className="flex-1 py-3 bg-[var(--violet)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Import en cours...' : `Importer ${preview.guests.length} invité${preview.guests.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        ) : (
          /* ── Step 1: Upload ── */
          <div className="space-y-4">
            {/* Download template button */}
            <button
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[var(--violet)] text-[var(--violet)] font-medium rounded-xl hover:bg-[var(--violet-pale)] transition-colors"
            >
              <span>📥</span>
              Télécharger le modèle Excel
            </button>
            <p className="text-xs text-gray-400 text-center -mt-2">
              Remplissez le modèle avec vos invités, puis uploadez-le ci-dessous.
            </p>

            {/* File upload */}
            <div>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-[var(--violet)] transition-colors"
              >
                <div className="text-3xl mb-2">📂</div>
                <p className="text-sm text-gray-500">Cliquez pour choisir votre fichier</p>
                <p className="text-xs text-gray-400 mt-2">
                  Colonnes : Prénom | Nom | Téléphone WhatsApp | Table / Siège | Groupe
                </p>
                <p className="text-xs text-gray-300 mt-1">.xlsx ou .csv</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileSelect(f)
                }}
                className="hidden"
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
