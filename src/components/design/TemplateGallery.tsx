'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import DesignEditor from './DesignEditor'

interface TemplateGalleryProps {
  eventId: string
  eventName: string
  eventDate?: string
  eventTime?: string
  eventLocation?: string
  onSave: (config: Record<string, unknown>) => void
}

interface TemplateDefinition {
  id: string
  name: string
  description: string
  headerColor: string
  accentColor: string
  bodyColor: string
  namesFont: string
  ornament: string
  effectType: string
  gradientStops: string[]
  decorPattern: 'gold-corners' | 'floral' | 'geometric' | 'wax' | 'leaves' | 'anchors'
}

const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'elegance-sombre',
    name: 'Élégance Sombre',
    description: 'Fond noir & or — raffiné et intemporel',
    headerColor: '#1C1612',
    accentColor: '#B8963E',
    bodyColor: '#FAF6EF',
    namesFont: 'Playfair Display',
    ornament: 'gold-frame',
    effectType: 'particles',
    gradientStops: ['#0D0A07', '#1C1612', '#2A1F16', '#1C1612', '#0D0A07'],
    decorPattern: 'gold-corners',
  },
  {
    id: 'violet-festif',
    name: 'Violet Festif',
    description: 'Fond violet & rose — festif et moderne',
    headerColor: '#2D1B69',
    accentColor: '#A855F7',
    bodyColor: '#FBF8FF',
    namesFont: 'Cormorant Garamond',
    ornament: 'royal-crest',
    effectType: 'floating',
    gradientStops: ['#1A0F40', '#2D1B69', '#3D2580', '#2D1B69', '#1A0F40'],
    decorPattern: 'floral',
  },
  {
    id: 'rose-romantique',
    name: 'Rose Romantique',
    description: 'Fond rose & bordeaux — doux et élégant',
    headerColor: '#831843',
    accentColor: '#EC4899',
    bodyColor: '#FFF0F8',
    namesFont: 'Great Vibes',
    ornament: 'floral-border',
    effectType: 'particles',
    gradientStops: ['#5C102F', '#831843', '#9B1E52', '#831843', '#5C102F'],
    decorPattern: 'floral',
  },
  {
    id: 'wax-afrika',
    name: 'Wax / Afrika',
    description: 'Fond brun & or — motifs africains vibrants',
    headerColor: '#2D1B0E',
    accentColor: '#C4832A',
    bodyColor: '#FDF8F0',
    namesFont: 'Dancing Script',
    ornament: 'geometric-african',
    effectType: 'particles',
    gradientStops: ['#1A0F06', '#2D1B0E', '#3D2712', '#2D1B0E', '#1A0F06'],
    decorPattern: 'wax',
  },
  {
    id: 'emeraude',
    name: 'Émeraude',
    description: 'Fond vert & or — nature et sérénité',
    headerColor: '#064E3B',
    accentColor: '#059669',
    bodyColor: '#F0FDF4',
    namesFont: 'Playfair Display',
    ornament: 'floral-border',
    effectType: 'floating',
    gradientStops: ['#022C22', '#064E3B', '#065F46', '#064E3B', '#022C22'],
    decorPattern: 'leaves',
  },
  {
    id: 'marine-or',
    name: 'Marine & Or',
    description: 'Fond bleu nuit & or — classique et noble',
    headerColor: '#1A2535',
    accentColor: '#D4AF6A',
    bodyColor: '#F0F4FA',
    namesFont: 'Lora',
    ornament: 'minimal-lines',
    effectType: 'none',
    gradientStops: ['#0F1620', '#1A2535', '#223044', '#1A2535', '#0F1620'],
    decorPattern: 'anchors',
  },
]

/* ═══════════════════════════════════════════════════════
   Generate template background image (900x1200) on canvas
   ═══════════════════════════════════════════════════════ */

function generateTemplateImage(t: TemplateDefinition): string {
  const W = 900
  const H = 1200
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Background gradient (vertical)
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  t.gradientStops.forEach((color, i) => {
    grad.addColorStop(i / (t.gradientStops.length - 1), color)
  })
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Subtle radial glow in center
  const radial = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6)
  radial.addColorStop(0, t.accentColor + '15')
  radial.addColorStop(1, 'transparent')
  ctx.fillStyle = radial
  ctx.fillRect(0, 0, W, H)

  // Decorative elements based on pattern
  ctx.strokeStyle = t.accentColor + '40'
  ctx.lineWidth = 1.5

  switch (t.decorPattern) {
    case 'gold-corners':
      drawGoldCorners(ctx, W, H, t.accentColor)
      break
    case 'floral':
      drawFloralBorders(ctx, W, H, t.accentColor)
      break
    case 'wax':
      drawWaxPattern(ctx, W, H, t.accentColor)
      break
    case 'geometric':
      drawGeometricPattern(ctx, W, H, t.accentColor)
      break
    case 'leaves':
      drawLeafBorders(ctx, W, H, t.accentColor)
      break
    case 'anchors':
      drawAnchorBorders(ctx, W, H, t.accentColor)
      break
  }

  // Top ornamental line
  ctx.strokeStyle = t.accentColor + '60'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(W * 0.2, 80)
  ctx.lineTo(W * 0.8, 80)
  ctx.stroke()

  // Bottom ornamental line
  ctx.beginPath()
  ctx.moveTo(W * 0.2, H - 80)
  ctx.lineTo(W * 0.8, H - 80)
  ctx.stroke()

  // Center ornament diamond
  ctx.fillStyle = t.accentColor + '50'
  const cx = W / 2
  const cy = 80
  ctx.beginPath()
  ctx.moveTo(cx, cy - 6)
  ctx.lineTo(cx + 6, cy)
  ctx.lineTo(cx, cy + 6)
  ctx.lineTo(cx - 6, cy)
  ctx.closePath()
  ctx.fill()

  // Bottom diamond
  ctx.beginPath()
  ctx.moveTo(cx, H - 80 - 6)
  ctx.lineTo(cx + 6, H - 80)
  ctx.lineTo(cx, H - 80 + 6)
  ctx.lineTo(cx - 6, H - 80)
  ctx.closePath()
  ctx.fill()

  // Inner border frame
  ctx.strokeStyle = t.accentColor + '25'
  ctx.lineWidth = 1
  const margin = 40
  ctx.strokeRect(margin, margin, W - margin * 2, H - margin * 2)

  return canvas.toDataURL('image/png')
}

function drawGoldCorners(ctx: CanvasRenderingContext2D, W: number, H: number, color: string) {
  ctx.strokeStyle = color + '50'
  ctx.lineWidth = 2
  const s = 80 // corner size
  const m = 60 // margin

  // Top-left
  ctx.beginPath()
  ctx.moveTo(m, m + s)
  ctx.lineTo(m, m)
  ctx.lineTo(m + s, m)
  ctx.stroke()

  // Top-right
  ctx.beginPath()
  ctx.moveTo(W - m - s, m)
  ctx.lineTo(W - m, m)
  ctx.lineTo(W - m, m + s)
  ctx.stroke()

  // Bottom-right
  ctx.beginPath()
  ctx.moveTo(W - m, H - m - s)
  ctx.lineTo(W - m, H - m)
  ctx.lineTo(W - m - s, H - m)
  ctx.stroke()

  // Bottom-left
  ctx.beginPath()
  ctx.moveTo(m + s, H - m)
  ctx.lineTo(m, H - m)
  ctx.lineTo(m, H - m - s)
  ctx.stroke()

  // Inner decorative corners (smaller)
  ctx.strokeStyle = color + '30'
  ctx.lineWidth = 1
  const s2 = 40
  const m2 = 75
  ;[
    [m2, m2, m2 + s2, m2, m2, m2 + s2],
    [W - m2, m2, W - m2 - s2, m2, W - m2, m2 + s2],
    [W - m2, H - m2, W - m2 - s2, H - m2, W - m2, H - m2 - s2],
    [m2, H - m2, m2 + s2, H - m2, m2, H - m2 - s2],
  ].forEach(([ax, ay, bx, by, cx, cy]) => {
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(ax, ay)
    ctx.lineTo(cx, cy)
    ctx.stroke()
  })
}

function drawFloralBorders(ctx: CanvasRenderingContext2D, W: number, H: number, color: string) {
  ctx.fillStyle = color + '20'
  // Scatter small circles as petals along edges
  for (let i = 0; i < 30; i++) {
    const isTop = i < 15
    const x = 100 + (i % 15) * ((W - 200) / 14)
    const y = isTop ? 50 + Math.sin(i * 0.8) * 20 : H - 50 + Math.sin(i * 0.8) * 20
    ctx.beginPath()
    ctx.arc(x, y, 4 + Math.sin(i) * 2, 0, Math.PI * 2)
    ctx.fill()
  }
  // Side dots
  for (let i = 0; i < 20; i++) {
    const isLeft = i < 10
    const y = 120 + (i % 10) * ((H - 240) / 9)
    const x = isLeft ? 50 + Math.cos(i * 0.6) * 15 : W - 50 + Math.cos(i * 0.6) * 15
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawWaxPattern(ctx: CanvasRenderingContext2D, W: number, H: number, color: string) {
  ctx.strokeStyle = color + '25'
  ctx.lineWidth = 1.5
  // Geometric African-inspired pattern: concentric diamonds along borders
  const step = 60
  for (let x = 80; x < W - 80; x += step) {
    // Top border pattern
    drawDiamond(ctx, x, 55, 15)
    // Bottom border pattern
    drawDiamond(ctx, x, H - 55, 15)
  }
  for (let y = 120; y < H - 120; y += step) {
    // Left border pattern
    drawDiamond(ctx, 55, y, 12)
    // Right border pattern
    drawDiamond(ctx, W - 55, y, 12)
  }
  // Zigzag lines near top and bottom
  ctx.strokeStyle = color + '20'
  ctx.beginPath()
  for (let x = 80; x < W - 80; x += 30) {
    const yTop = 100
    ctx.lineTo(x, yTop + ((x / 30) % 2 === 0 ? -8 : 8))
  }
  ctx.stroke()
  ctx.beginPath()
  for (let x = 80; x < W - 80; x += 30) {
    const yBot = H - 100
    ctx.lineTo(x, yBot + ((x / 30) % 2 === 0 ? -8 : 8))
  }
  ctx.stroke()
}

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.beginPath()
  ctx.moveTo(cx, cy - size)
  ctx.lineTo(cx + size, cy)
  ctx.lineTo(cx, cy + size)
  ctx.lineTo(cx - size, cy)
  ctx.closePath()
  ctx.stroke()
}

function drawGeometricPattern(ctx: CanvasRenderingContext2D, W: number, H: number, color: string) {
  ctx.strokeStyle = color + '25'
  ctx.lineWidth = 1
  // Concentric rectangles
  for (let i = 0; i < 4; i++) {
    const m = 50 + i * 20
    ctx.strokeRect(m, m, W - m * 2, H - m * 2)
  }
}

function drawLeafBorders(ctx: CanvasRenderingContext2D, W: number, H: number, color: string) {
  ctx.strokeStyle = color + '30'
  ctx.lineWidth = 1.5
  // Leaf shapes along left and right
  for (let i = 0; i < 12; i++) {
    const y = 100 + i * ((H - 200) / 11)
    drawLeaf(ctx, 45, y, 18, i % 2 === 0 ? 1 : -1)
    drawLeaf(ctx, W - 45, y, 18, i % 2 === 0 ? -1 : 1)
  }
}

function drawLeaf(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, dir: number) {
  ctx.beginPath()
  ctx.moveTo(cx, cy - size)
  ctx.quadraticCurveTo(cx + size * dir, cy, cx, cy + size)
  ctx.quadraticCurveTo(cx - size * dir * 0.3, cy, cx, cy - size)
  ctx.stroke()
}

function drawAnchorBorders(ctx: CanvasRenderingContext2D, W: number, H: number, color: string) {
  ctx.strokeStyle = color + '30'
  ctx.lineWidth = 1
  // Elegant line pattern with small dots
  const dash = 20
  for (let y = 100; y < H - 100; y += 50) {
    // Left line segment
    ctx.beginPath()
    ctx.moveTo(50, y)
    ctx.lineTo(50 + dash, y)
    ctx.stroke()
    // Right line segment
    ctx.beginPath()
    ctx.moveTo(W - 50 - dash, y)
    ctx.lineTo(W - 50, y)
    ctx.stroke()
  }
  // Small dots at intersections
  ctx.fillStyle = color + '25'
  for (let y = 100; y < H - 100; y += 50) {
    ctx.beginPath()
    ctx.arc(50, y, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(W - 50, y, 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

/* ═══════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════ */

export default function TemplateGallery({
  eventId, eventName, eventDate, eventTime, eventLocation, onSave,
}: TemplateGalleryProps) {
  const [selected, setSelected] = useState<TemplateDefinition | null>(null)
  const [editorImageUrl, setEditorImageUrl] = useState<string | null>(null)
  const previewRefs = useRef<Map<string, HTMLCanvasElement>>(new Map())

  // Generate small preview thumbnails for the gallery
  const drawPreview = useCallback((canvas: HTMLCanvasElement | null, template: TemplateDefinition) => {
    if (!canvas) return
    previewRefs.current.set(template.id, canvas)
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    template.gradientStops.forEach((color, i) => {
      grad.addColorStop(i / (template.gradientStops.length - 1), color)
    })
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // Center glow
    const radial = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6)
    radial.addColorStop(0, template.accentColor + '15')
    radial.addColorStop(1, 'transparent')
    ctx.fillStyle = radial
    ctx.fillRect(0, 0, W, H)

    // Border frame
    ctx.strokeStyle = template.accentColor + '40'
    ctx.lineWidth = 1
    ctx.strokeRect(8, 8, W - 16, H - 16)

    // Lines
    ctx.strokeStyle = template.accentColor + '50'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(W * 0.25, 20)
    ctx.lineTo(W * 0.75, 20)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(W * 0.25, H - 20)
    ctx.lineTo(W * 0.75, H - 20)
    ctx.stroke()

    // Preview text
    ctx.fillStyle = template.accentColor
    ctx.font = `bold ${W * 0.08}px serif`
    ctx.textAlign = 'center'
    ctx.fillText('Sophie & Patrick', W / 2, H * 0.42)

    ctx.fillStyle = template.accentColor + '80'
    ctx.font = `${W * 0.05}px serif`
    ctx.fillText('25 Décembre 2026', W / 2, H * 0.52)

    // Small decorative dot
    ctx.fillStyle = template.accentColor + '60'
    ctx.beginPath()
    ctx.arc(W / 2, H * 0.46, 2, 0, Math.PI * 2)
    ctx.fill()
  }, [])

  // When user selects a template, generate the full 900x1200 image
  function handleSelectTemplate(template: TemplateDefinition) {
    const imageDataUrl = generateTemplateImage(template)
    setSelected(template)
    setEditorImageUrl(imageDataUrl)
  }

  // ── Editor mode ──
  if (editorImageUrl && selected) {
    return (
      <DesignEditor
        imageUrl={editorImageUrl}
        eventName={eventName}
        eventDate={eventDate}
        eventTime={eventTime}
        eventLocation={eventLocation}
        onSave={(config) => {
          onSave({
            ...config,
            templateId: selected.id,
            templateName: selected.name,
            effectType: selected.effectType,
            headerColor: selected.headerColor,
            accentColor: selected.accentColor,
          })
        }}
        onBack={() => {
          setEditorImageUrl(null)
          setSelected(null)
        }}
      />
    )
  }

  // ── Gallery mode ──
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Choisissez un modèle prédéfini. Vous pourrez ensuite personnaliser les textes, polices et positions dans l&apos;éditeur.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => handleSelectTemplate(template)}
            className="text-left rounded-xl overflow-hidden border-2 border-gray-100 hover:border-[var(--violet)] hover:ring-2 hover:ring-[var(--violet-pale)] transition-all group"
          >
            <div className="relative">
              <canvas
                ref={(el) => drawPreview(el, template)}
                width={180}
                height={240}
                className="w-full h-48 object-cover"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="text-white font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--violet)] px-4 py-2 rounded-lg">
                  Utiliser
                </span>
              </div>
            </div>
            <div className="p-3 bg-white">
              <p className="text-sm font-semibold text-[var(--text-title)]">{template.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{template.description}</p>
              {template.effectType !== 'none' && (
                <p className="text-xs text-[var(--violet)] mt-1">
                  Effet : {template.effectType}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
