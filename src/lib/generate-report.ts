import { jsPDF } from 'jspdf'
import type { Guest } from '@/types'

interface GuestWithEntry extends Omit<Guest, 'invitation' | 'event'> {
  guestbook?: {
    message?: string
    drink_preferences: string[]
    plus_ones: number
  } | null
}

/* ═══════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════ */

function drawStatusDot(doc: jsPDF, x: number, y: number, color: [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2])
  doc.circle(x, y - 1.2, 1.8, 'F')
}

function safeText(text: string): string {
  // Replace accented chars that helvetica can't render
  return text
    .replace(/é/g, 'e').replace(/è/g, 'e').replace(/ê/g, 'e').replace(/ë/g, 'e')
    .replace(/à/g, 'a').replace(/â/g, 'a').replace(/ä/g, 'a')
    .replace(/ù/g, 'u').replace(/û/g, 'u').replace(/ü/g, 'u')
    .replace(/ô/g, 'o').replace(/ö/g, 'o')
    .replace(/î/g, 'i').replace(/ï/g, 'i')
    .replace(/ç/g, 'c')
    .replace(/É/g, 'E').replace(/È/g, 'E').replace(/Ê/g, 'E')
    .replace(/À/g, 'A').replace(/Â/g, 'A')
    .replace(/Ù/g, 'U').replace(/Û/g, 'U')
    .replace(/Ô/g, 'O').replace(/Î/g, 'I')
    .replace(/Ç/g, 'C')
}

const COLOR_GREEN: [number, number, number] = [5, 150, 105]
const COLOR_RED: [number, number, number] = [220, 38, 38]
const COLOR_AMBER: [number, number, number] = [217, 119, 6]
const COLOR_VIOLET: [number, number, number] = [124, 58, 237]
const COLOR_GRAY: [number, number, number] = [107, 114, 128]

/* ═══════════════════════════════════════════════════════
   Main
   ═══════════════════════════════════════════════════════ */

export function generateTableReport(
  eventName: string,
  guests: GuestWithEntry[]
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  let y = 20

  function checkPage(needed: number) {
    if (y + needed > 275) {
      doc.addPage()
      y = 20
    }
  }

  // ── Header ──
  doc.setFillColor(45, 27, 105) // violet profond
  doc.rect(0, 0, pageWidth, 38, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(safeText(`Rapport - ${eventName}`), pageWidth / 2, 16, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(safeText(`Exporte le ${dateStr}`), pageWidth / 2, 24, { align: 'center' })

  // Summary bar in header
  const confirmed = guests.filter(g => g.status === 'verified').length
  const pending = guests.filter(g => g.status === 'pending' || g.status === 'sent').length
  const cancelled = guests.filter(g => g.status === 'cancelled').length
  const totalPlusOnes = guests.reduce((sum, g) => sum + (g.guestbook?.plus_ones ?? 0), 0)

  doc.setFontSize(8)
  const summaryText = safeText(
    `Presents: ${confirmed}  |  En attente: ${pending}  |  Annules: ${cancelled}  |  Accompagnants: ${totalPlusOnes}  |  Total: ${guests.length}`
  )
  doc.text(summaryText, pageWidth / 2, 32, { align: 'center' })

  doc.setTextColor(0, 0, 0)
  y = 48

  // ── Group by table ──
  const tables = new Map<string, GuestWithEntry[]>()
  for (const guest of guests) {
    const table = guest.table_seat || 'Sans table assignee'
    if (!tables.has(table)) tables.set(table, [])
    tables.get(table)!.push(guest)
  }

  for (const [tableName, tableGuests] of tables) {
    const tableConfirmed = tableGuests.filter(g => g.status === 'verified').length
    const tablePlusOnes = tableGuests.reduce((sum, g) => sum + (g.guestbook?.plus_ones ?? 0), 0)

    // Estimate space needed: header (12) + guests (16 each approx)
    checkPage(12 + Math.min(tableGuests.length, 3) * 16)

    // Table header band
    doc.setFillColor(245, 238, 255) // violet-pale
    doc.rect(margin, y - 4, pageWidth - margin * 2, 10, 'F')

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(45, 27, 105)
    doc.text(safeText(tableName.toUpperCase()), margin + 3, y + 2)

    // Table stats on the right
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128)
    const tableStats = `${tableConfirmed}/${tableGuests.length} confirmes${tablePlusOnes > 0 ? ` + ${tablePlusOnes} acc.` : ''}`
    doc.text(safeText(tableStats), pageWidth - margin - 3, y + 2, { align: 'right' })

    doc.setTextColor(0, 0, 0)
    y += 10

    // Guest rows
    for (const guest of tableGuests) {
      checkPage(20)

      const entry = guest.guestbook
      const fullName = `${guest.first_name} ${guest.last_name}`

      // Status indicator
      let statusColor: [number, number, number]
      let statusLabel: string

      if (guest.status === 'verified') {
        statusColor = COLOR_GREEN
        statusLabel = 'PRESENT'
      } else if (guest.status === 'cancelled') {
        statusColor = COLOR_RED
        statusLabel = 'ABSENT'
      } else {
        statusColor = COLOR_AMBER
        statusLabel = 'EN ATTENTE'
      }

      // Draw dot + name
      drawStatusDot(doc, margin + 4, y, statusColor)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(safeText(fullName), margin + 9, y)

      // Status label on the right
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
      doc.text(safeText(statusLabel), pageWidth - margin - 3, y, { align: 'right' })
      doc.setTextColor(0, 0, 0)

      y += 5

      // Details
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(COLOR_GRAY[0], COLOR_GRAY[1], COLOR_GRAY[2])

      if (entry) {
        const drinks = entry.drink_preferences?.length > 0
          ? entry.drink_preferences.join(' + ')
          : 'Aucune preference'
        doc.text(safeText(`Boisson : ${drinks}`), margin + 9, y)
        y += 4

        if (entry.plus_ones > 0) {
          doc.text(safeText(`Accompagnants : ${entry.plus_ones}`), margin + 9, y)
          y += 4
        }

        if (entry.message) {
          const msgTruncated = entry.message.length > 60
            ? entry.message.substring(0, 60) + '...'
            : entry.message
          doc.text(safeText(`Message : "${msgTruncated}"`), margin + 9, y)
          y += 4
        }
      } else if (guest.status === 'cancelled') {
        doc.setFont('helvetica', 'italic')
        doc.text('-- Absent(e)', margin + 9, y)
        y += 4
      } else {
        doc.setFont('helvetica', 'italic')
        doc.text('-- Pas encore repondu', margin + 9, y)
        y += 4
      }

      doc.setTextColor(0, 0, 0)
      y += 3
    }

    // Separator after table group
    doc.setDrawColor(230, 230, 230)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageWidth - margin, y)
    y += 6
  }

  // ── Total Summary ──
  checkPage(50)

  doc.setFillColor(45, 27, 105)
  doc.rect(margin, y, pageWidth - margin * 2, 10, 'F')
  y += 7
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL GENERAL', margin + 3, y)
  doc.setTextColor(0, 0, 0)
  y += 8

  const summaryRows = [
    { label: 'Presents confirmes', value: confirmed, color: COLOR_GREEN },
    { label: 'Accompagnants', value: totalPlusOnes, color: COLOR_VIOLET },
    { label: 'En attente de reponse', value: pending, color: COLOR_AMBER },
    { label: 'Annules / Absents', value: cancelled, color: COLOR_RED },
    { label: 'Total personnes attendues', value: confirmed + totalPlusOnes, color: [45, 27, 105] as [number, number, number] },
  ]

  for (const row of summaryRows) {
    drawStatusDot(doc, margin + 4, y, row.color)
    doc.setFontSize(10)
    doc.setFont('helvetica', row.label.startsWith('Total') ? 'bold' : 'normal')
    doc.text(safeText(row.label), margin + 9, y)
    doc.setFont('helvetica', 'bold')
    doc.text(String(row.value), pageWidth - margin - 3, y, { align: 'right' })
    y += 6
  }

  // Footer
  y += 4
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)
  y += 5
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(180, 180, 180)
  doc.text(safeText(`Genere par invit.app — ${dateStr}`), pageWidth / 2, y, { align: 'center' })

  return doc
}
