import { createCanvas, loadImage } from 'canvas'
import QRCode from 'qrcode'

interface ElementPosition {
  x: number // % of image width
  y: number // % of image height
}

interface TextOverlay {
  eventTitle?: string
  prenom1?: string
  prenom2?: string
  eventDate?: string
  eventTime?: string
  eventLocation?: string
  personalMessage?: string
  textColor?: string
  accentColor?: string
  font?: string
  overlayOpacity?: number
}

interface Positions {
  infoCard?: ElementPosition
  guestName?: ElementPosition
  qrCode?: ElementPosition
}

interface ComposeOptions {
  backgroundUrl: string
  guestName: string
  tableSeat?: string
  invitationCode: string
  appUrl: string
  textOverlay?: TextOverlay
  positions?: Positions
}

function formatDateFR(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch { return dateStr }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function roundedRect(
  ctx: any,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export async function composeInvitation(options: ComposeOptions): Promise<Buffer> {
  const { backgroundUrl, guestName, tableSeat, invitationCode, appUrl, textOverlay, positions } = options

  const textColor = textOverlay?.textColor || '#2D1B69'
  const accentColor = textOverlay?.accentColor || '#C49A3C'
  const fontFamily = textOverlay?.font || 'serif'
  const overlayOpacity = textOverlay?.overlayOpacity ?? 0.92
  const prenom1 = textOverlay?.prenom1 || ''
  const prenom2 = textOverlay?.prenom2 || ''
  const eventTitle = (prenom1 && prenom2) ? `${prenom1} & ${prenom2}` : textOverlay?.eventTitle || ''
  const eventDate = textOverlay?.eventDate || ''
  const eventTime = textOverlay?.eventTime || ''
  const eventLocation = textOverlay?.eventLocation || ''
  const personalMessage = textOverlay?.personalMessage || ''

  // Default positions (%)
  const infoPos = positions?.infoCard || { x: 50, y: 35 }
  const namePos = positions?.guestName || { x: 50, y: 68 }
  const qrPos = positions?.qrCode || { x: 50, y: 82 }

  // Load image
  const bgImage = await loadImage(backgroundUrl)
  const width = bgImage.width
  const height = bgImage.height
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  ctx.drawImage(bgImage, 0, 0, width, height)

  // ── Info card (central cream rectangle) ──
  const cardW = width * 0.78
  const cardH = height * 0.36
  const cardX = (infoPos.x / 100) * width - cardW / 2
  const cardY = (infoPos.y / 100) * height - cardH / 2

  // Draw cream background
  ctx.fillStyle = `rgba(255,248,240,${overlayOpacity})`
  roundedRect(ctx, cardX, cardY, cardW, cardH, 24)
  ctx.fill()
  ctx.strokeStyle = accentColor
  ctx.lineWidth = 3
  ctx.stroke()

  let ty = cardY + cardH * 0.12

  // Event title
  if (eventTitle) {
    const fs = Math.round(width * 0.05)
    ctx.font = `bold ${fs}px "${fontFamily}"`
    ctx.fillStyle = accentColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(eventTitle, cardX + cardW / 2, ty)
    ty += fs * 1.2
  }

  // Separator
  ctx.strokeStyle = accentColor
  ctx.globalAlpha = 0.4
  ctx.lineWidth = 1
  const sepLen = width * 0.06
  const cx = cardX + cardW / 2
  ctx.beginPath(); ctx.moveTo(cx - sepLen - 8, ty); ctx.lineTo(cx - 8, ty); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx + 8, ty); ctx.lineTo(cx + sepLen + 8, ty); ctx.stroke()
  ctx.globalAlpha = 1
  ctx.fillStyle = accentColor
  ctx.font = `${Math.round(width * 0.018)}px "${fontFamily}"`
  ctx.fillText('\u2767', cx, ty)
  ty += width * 0.03

  // Date & time
  if (eventDate || eventTime) {
    const fs = Math.round(width * 0.023)
    ctx.font = `${fs}px "${fontFamily}"`
    ctx.fillStyle = textColor
    let dateStr = ''
    if (eventDate) dateStr += formatDateFR(eventDate)
    if (eventDate && eventTime) dateStr += ' à '
    if (eventTime) dateStr += eventTime
    ctx.fillText(dateStr, cx, ty)
    ty += fs * 1.5
  }

  // Location
  if (eventLocation) {
    const fs = Math.round(width * 0.02)
    ctx.font = `${fs}px "${fontFamily}"`
    ctx.fillStyle = textColor
    ctx.globalAlpha = 0.7
    ctx.fillText(eventLocation, cx, ty)
    ctx.globalAlpha = 1
    ty += fs * 1.6
  }

  // Personal message
  if (personalMessage) {
    const fs = Math.round(width * 0.018)
    ctx.font = `italic ${fs}px "${fontFamily}"`
    ctx.fillStyle = textColor
    ctx.globalAlpha = 0.75
    ctx.fillText(`\u00AB ${personalMessage} \u00BB`, cx, ty)
    ctx.globalAlpha = 1
  }

  // ── Guest name (separate element) ──
  const nameX = (namePos.x / 100) * width
  const nameY = (namePos.y / 100) * height
  const nameFontSize = Math.round(width * 0.04)

  // Small cream pill behind name
  ctx.font = `bold ${nameFontSize}px "${fontFamily}"`
  const nameMetrics = ctx.measureText(guestName)
  const pillW = nameMetrics.width + 40
  const pillH = nameFontSize * 2
  ctx.fillStyle = `rgba(255,248,240,${Math.min(overlayOpacity, 0.85)})`
  roundedRect(ctx, nameX - pillW / 2, nameY - pillH / 2, pillW, pillH, 14)
  ctx.fill()

  ctx.fillStyle = textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(guestName, nameX, nameY)

  // Table/seat
  if (tableSeat) {
    const tfs = Math.round(width * 0.02)
    ctx.font = `${tfs}px "${fontFamily}"`
    ctx.fillStyle = accentColor
    ctx.fillText(tableSeat, nameX, nameY + nameFontSize * 0.9)
  }

  // ── QR code ──
  const qrCenterX = (qrPos.x / 100) * width
  const qrCenterY = (qrPos.y / 100) * height
  const qrSize = Math.round(width * 0.15)
  const qrPadding = 8

  const qrUrl = `${appUrl}/invitation/${invitationCode}`
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: qrSize, margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel: 'M',
  })
  const qrImage = await loadImage(qrDataUrl)

  const qrX = qrCenterX - qrSize / 2
  const qrY = qrCenterY - qrSize / 2

  // White rounded background
  ctx.fillStyle = '#FFFFFF'
  roundedRect(ctx, qrX - qrPadding, qrY - qrPadding, qrSize + qrPadding * 2, qrSize + qrPadding * 2, 10)
  ctx.strokeStyle = `${accentColor}40`
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fill()

  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize)

  // Code below QR
  const codeFontSize = Math.round(width * 0.016)
  ctx.font = `${codeFontSize}px "Arial"`
  ctx.fillStyle = textColor
  ctx.globalAlpha = 0.4
  ctx.textAlign = 'center'
  ctx.fillText(invitationCode, qrCenterX, qrY + qrSize + qrPadding + codeFontSize)
  ctx.globalAlpha = 1

  return canvas.toBuffer('image/png')
}
