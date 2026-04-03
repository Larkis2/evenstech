import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { generateInvitationCode } from '@/lib/generate-code'

export interface ImportResult {
  count: number
  errors: string[]
}

export async function importGuestsFromExcel(
  file: File,
  eventId: string
): Promise<ImportResult> {
  const supabase = createClient()
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet)

  const errors: string[] = []
  const guests = rows
    .map((row, index) => {
      const firstName = row['Prénom'] || row['Prenom'] || row['prenom'] || ''
      const lastName = row['Nom'] || row['nom'] || ''
      const phone = row['Téléphone WhatsApp'] || row['Telephone'] || row['phone'] || ''

      if (!firstName || !lastName || !phone) {
        errors.push(`Ligne ${index + 2}: données manquantes (prénom, nom ou téléphone)`)
        return null
      }

      return {
        event_id: eventId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        table_seat: (row['Table / Siège'] || row['Table'] || '').trim() || null,
        group_name: (row['Groupe'] || row['groupe'] || '').trim() || null,
        status: 'pending' as const,
      }
    })
    .filter((g): g is NonNullable<typeof g> => g !== null)

  if (guests.length === 0) {
    return { count: 0, errors: ['Aucun invité valide trouvé dans le fichier'] }
  }

  const { data, error } = await supabase
    .from('guests')
    .insert(guests)
    .select()

  if (error) {
    return { count: 0, errors: [error.message] }
  }

  // Generate invitation code for each guest
  for (const guest of data) {
    const code = generateInvitationCode()
    const { error: invError } = await supabase
      .from('invitations')
      .insert({ guest_id: guest.id, code })

    if (invError) {
      errors.push(`Code pour ${guest.first_name} ${guest.last_name}: ${invError.message}`)
    }
  }

  return { count: data.length, errors }
}
