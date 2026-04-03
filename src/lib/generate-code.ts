const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateInvitationCode(): string {
  let s = ''
  for (let i = 0; i < 4; i++) {
    s += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return `INV-${new Date().getFullYear()}-${s}`
}
