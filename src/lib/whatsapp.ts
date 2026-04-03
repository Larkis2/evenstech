import type { Guest } from '@/types'

export function buildWhatsAppMessage(
  guestName: string,
  code: string,
  eventName: string
): string {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/invitation/${code}`
  return `✨ Bonjour ${guestName} !\n\nVous êtes cordialement invité(e) à : *${eventName}*\n\nVoici votre invitation personnalisée :\n👉 ${url}\n\n_Invitation non transférable_`
}

export function getWhatsAppUrl(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, '')
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
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
