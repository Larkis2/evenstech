import type { Guest } from '@/types'

export function buildWhatsAppMessage(
  guestName: string,
  code: string,
  eventName: string
): string {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/invitation/${code}`
  return `✨ Bonjour ${guestName} !\n\nVous êtes cordialement invité(e) à : *${eventName}*\n\nVoici votre invitation personnalisée :\n👉 ${url}\n\n_Invitation non transférable_`
}

/**
 * Normalise un numéro de téléphone pour WhatsApp.
 * - Supprime tous les caractères non numériques
 * - Si le numéro commence par 0, remplace par l'indicatif pays (défaut: 243 = RDC)
 * - Exemples :
 *   +243 81 234 5678 → 243812345678
 *   0812345678       → 243812345678
 *   243812345678     → 243812345678
 */
function normalizePhone(phone: string, defaultCountryCode = '243'): string {
  let clean = phone.replace(/\D/g, '')

  // Si commence par 00, enlever les deux zéros (format international alternatif)
  if (clean.startsWith('00')) {
    clean = clean.substring(2)
  }
  // Si commence par 0, remplacer par l'indicatif pays
  else if (clean.startsWith('0')) {
    clean = defaultCountryCode + clean.substring(1)
  }

  return clean
}

export function getWhatsAppUrl(phone: string, message: string): string {
  const normalized = normalizePhone(phone)
  return `https://api.whatsapp.com/send?phone=${normalized}&text=${encodeURIComponent(message)}`
}

export function sendToAll(
  guests: (Guest & { invitation?: { code: string }; event?: { name: string } })[]
): void {
  guests.forEach((guest, index) => {
    setTimeout(() => {
      const code = guest.invitation?.code
      const eventName = guest.event?.name
      if (!code || !eventName) return

      const msg = buildWhatsAppMessage(
        `${guest.first_name} ${guest.last_name}`,
        code,
        eventName
      )
      window.open(getWhatsAppUrl(guest.phone, msg), '_blank')
    }, index * 1500)
  })
}
