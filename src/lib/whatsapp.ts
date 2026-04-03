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
 * Gère tous les formats courants en RDC :
 *   +243 81 234 5678  → 243812345678
 *   +243-81-234-5678  → 243812345678
 *   00243812345678    → 243812345678
 *   0812345678        → 243812345678
 *   243812345678      → 243812345678
 *   812345678         → 243812345678
 */
export function normalizePhone(phone: string, defaultCountryCode = '243'): string {
  // Supprimer tout sauf les chiffres
  let clean = phone.replace(/[^0-9]/g, '')

  // 00243... → 243...
  if (clean.startsWith('00' + defaultCountryCode)) {
    clean = clean.substring(2)
  }
  // 0... → 243... (numéro local)
  else if (clean.startsWith('0')) {
    clean = defaultCountryCode + clean.substring(1)
  }
  // Si le numéro est court (9 chiffres, ex: 812345678), ajouter l'indicatif
  else if (!clean.startsWith(defaultCountryCode) && clean.length <= 10) {
    clean = defaultCountryCode + clean
  }

  return clean
}

export function getWhatsAppUrl(phone: string, message: string): string {
  const normalized = normalizePhone(phone)
  // Utiliser le format wa.me avec le numéro directement dans le path
  // C'est le format officiel recommandé par WhatsApp
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
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
