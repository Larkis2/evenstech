'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

/* ══════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════ */

interface LayerRect {
  x: number; y: number; w: number; h: number // all in %
}

interface LayerStyle {
  fontFamily: string
  fontSize: number       // px relative to canvas width (stored as % of width)
  color: string
  bold: boolean
  italic: boolean
  underline: boolean
  align: 'left' | 'center' | 'right'
  opacity: number
  bgColor?: string       // optional background color
  bgOpacity?: number
  borderColor?: string
  borderWidth?: number
}

type LayerKind = 'text' | 'guestName' | 'qrCode' | 'image' | 'shape'

interface Layer {
  id: string
  kind: LayerKind
  label: string
  content: string        // text content for text/guestName layers
  rect: LayerRect
  zIndex: number
  visible: boolean
  auto?: boolean         // guestName & qrCode are auto
  style: LayerStyle
  imageDataUrl?: string
  shapeType?: 'rectangle' | 'circle'
}

interface DesignEditorProps {
  imageUrl: string
  eventName: string
  eventDate?: string
  eventTime?: string
  eventLocation?: string
  dallePrompt?: string
  label?: string
  onSave: (config: Record<string, unknown>) => void
  onBack: () => void
}

/* ══════════════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════════════ */

const FONT_OPTIONS = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans-serif', label: 'Sans-serif' },
  { value: 'cursive', label: 'Calligraphie' },
  { value: 'Cinzel, serif', label: 'Cinzel' },
  { value: 'Dancing Script, cursive', label: 'Dancing Script' },
  { value: 'Great Vibes, cursive', label: 'Great Vibes' },
]

const COLOR_PRESETS = [
  '#FFFFFF', '#000000', '#2D1B69', '#C49A3C', '#D4AF6A',
  '#F5E6D3', '#A855F7', '#EC4899', '#10B981', '#1E3A5F',
]

function formatDateFR(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch { return dateStr }
}

let _layerId = 100
function nextId() { return `layer-${++_layerId}` }

function defaultStyle(overrides: Partial<LayerStyle> = {}): LayerStyle {
  return {
    fontFamily: 'serif',
    fontSize: 4,
    color: '#2D1B69',
    bold: false,
    italic: false,
    underline: false,
    align: 'center',
    opacity: 1,
    ...overrides,
  }
}

/* ══════════════════════════════════════════════════════
   Resize handles
   ══════════════════════════════════════════════════════ */

type HandleDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const HANDLES: { dir: HandleDir; cursor: string; style: React.CSSProperties }[] = [
  { dir: 'nw', cursor: 'nwse-resize', style: { top: -5, left: -5 } },
  { dir: 'n',  cursor: 'ns-resize',   style: { top: -5, left: '50%', transform: 'translateX(-50%)' } },
  { dir: 'ne', cursor: 'nesw-resize', style: { top: -5, right: -5 } },
  { dir: 'e',  cursor: 'ew-resize',   style: { top: '50%', right: -5, transform: 'translateY(-50%)' } },
  { dir: 'se', cursor: 'nwse-resize', style: { bottom: -5, right: -5 } },
  { dir: 's',  cursor: 'ns-resize',   style: { bottom: -5, left: '50%', transform: 'translateX(-50%)' } },
  { dir: 'sw', cursor: 'nesw-resize', style: { bottom: -5, left: -5 } },
  { dir: 'w',  cursor: 'ew-resize',   style: { top: '50%', left: -5, transform: 'translateY(-50%)' } },
]

/* ══════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════ */

export default function DesignEditor({
  imageUrl, eventName, eventDate, eventTime, eventLocation,
  dallePrompt, label, onSave, onBack,
}: DesignEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  // Extract couple names
  const nameParts = eventName
    .replace(/^(mariage|anniversaire|dot|baptême|fête)\s+(de\s+)?/i, '')
    .split(/\s*[&+]\s*/)
  const prenom1 = nameParts[0]?.trim() || ''
  const prenom2 = nameParts[1]?.trim() || ''
  const coupleTitle = prenom1 && prenom2 ? `${prenom1} & ${prenom2}` : prenom1 || eventName

  // ── Layers state ──
  const [layers, setLayers] = useState<Layer[]>(() => [
    {
      id: 'title', kind: 'text', label: 'Titre',
      content: coupleTitle,
      rect: { x: 15, y: 22, w: 70, h: 8 }, zIndex: 10, visible: true,
      style: defaultStyle({ fontFamily: 'serif', fontSize: 5.5, color: '#C49A3C', bold: true }),
    },
    {
      id: 'date', kind: 'text', label: 'Date & Heure',
      content: `${eventDate ? formatDateFR(eventDate) : ''}${eventDate && eventTime ? ' à ' : ''}${eventTime || ''}`,
      rect: { x: 15, y: 32, w: 70, h: 5 }, zIndex: 11, visible: true,
      style: defaultStyle({ fontSize: 2.5, color: '#2D1B69' }),
    },
    {
      id: 'location', kind: 'text', label: 'Lieu',
      content: eventLocation || '',
      rect: { x: 15, y: 38, w: 70, h: 5 }, zIndex: 12, visible: true,
      style: defaultStyle({ fontSize: 2.2, color: '#2D1B69', opacity: 0.7 }),
    },
    {
      id: 'message', kind: 'text', label: 'Message',
      content: '',
      rect: { x: 15, y: 44, w: 70, h: 5 }, zIndex: 13, visible: true,
      style: defaultStyle({ fontSize: 2, color: '#2D1B69', italic: true, opacity: 0.75 }),
    },
    {
      id: 'guest', kind: 'guestName', label: 'Nom invité', auto: true,
      content: 'Sophie Mutombo',
      rect: { x: 25, y: 64, w: 50, h: 7 }, zIndex: 20, visible: true,
      style: defaultStyle({ fontSize: 3.5, color: '#2D1B69', bold: true, bgColor: 'rgba(255,248,240,0.85)' }),
    },
    {
      id: 'qr', kind: 'qrCode', label: 'QR Code', auto: true,
      content: '',
      rect: { x: 35, y: 74, w: 30, h: 20 }, zIndex: 30, visible: true,
      style: defaultStyle(),
    },
  ])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const selectedLayer = layers.find(l => l.id === selectedId) || null
  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex)

  // ── Layer mutations ──

  function updateLayer(id: string, patch: Partial<Layer>) {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }

  function updateRect(id: string, patch: Partial<LayerRect>) {
    setLayers(prev => prev.map(l =>
      l.id === id ? { ...l, rect: { ...l.rect, ...patch } } : l
    ))
  }

  function updateStyle(id: string, patch: Partial<LayerStyle>) {
    setLayers(prev => prev.map(l =>
      l.id === id ? { ...l, style: { ...l.style, ...patch } } : l
    ))
  }

  function deleteLayer(id: string) {
    setLayers(prev => prev.filter(l => l.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  function moveLayerUp(id: string) {
    setLayers(prev => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex)
      const idx = sorted.findIndex(l => l.id === id)
      if (idx < sorted.length - 1) {
        const z1 = sorted[idx].zIndex
        sorted[idx] = { ...sorted[idx], zIndex: sorted[idx + 1].zIndex }
        sorted[idx + 1] = { ...sorted[idx + 1], zIndex: z1 }
      }
      return sorted
    })
  }

  function moveLayerDown(id: string) {
    setLayers(prev => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex)
      const idx = sorted.findIndex(l => l.id === id)
      if (idx > 0) {
        const z1 = sorted[idx].zIndex
        sorted[idx] = { ...sorted[idx], zIndex: sorted[idx - 1].zIndex }
        sorted[idx - 1] = { ...sorted[idx - 1], zIndex: z1 }
      }
      return sorted
    })
  }

  // ── Add items ──

  function addText() {
    const maxZ = Math.max(...layers.map(l => l.zIndex), 0)
    const layer: Layer = {
      id: nextId(), kind: 'text', label: 'Texte libre',
      content: 'Votre texte ici',
      rect: { x: 20, y: 50, w: 60, h: 6 }, zIndex: maxZ + 1, visible: true,
      style: defaultStyle({ fontSize: 3 }),
    }
    setLayers(prev => [...prev, layer])
    setSelectedId(layer.id)
  }

  function addImage() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const maxZ = Math.max(...layers.map(l => l.zIndex), 0)
        const layer: Layer = {
          id: nextId(), kind: 'image', label: file.name.slice(0, 20),
          content: '',
          rect: { x: 20, y: 20, w: 30, h: 25 }, zIndex: maxZ + 1, visible: true,
          style: defaultStyle(),
          imageDataUrl: reader.result as string,
        }
        setLayers(prev => [...prev, layer])
        setSelectedId(layer.id)
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  function addShape(shapeType: 'rectangle' | 'circle') {
    const maxZ = Math.max(...layers.map(l => l.zIndex), 0)
    const layer: Layer = {
      id: nextId(), kind: 'shape', label: shapeType === 'rectangle' ? 'Rectangle' : 'Cercle',
      content: '',
      rect: { x: 25, y: 30, w: 30, h: 20 }, zIndex: maxZ + 1, visible: true,
      style: defaultStyle({ bgColor: 'rgba(255,248,240,0.8)', borderColor: '#C49A3C', borderWidth: 2 }),
      shapeType,
    }
    setLayers(prev => [...prev, layer])
    setSelectedId(layer.id)
  }

  // ── Drag & Resize via pointer events ──

  const interactionRef = useRef<{
    mode: 'drag' | 'resize'
    layerId: string
    handleDir?: HandleDir
    startClient: { x: number; y: number }
    startRect: LayerRect
  } | null>(null)

  const startDrag = useCallback((e: React.PointerEvent, layerId: string) => {
    if ((e.target as HTMLElement).dataset.handle) return
    if ((e.target as HTMLElement).dataset.noDrag) return
    if (editingId === layerId) return // don't drag while editing text
    const layer = layers.find(l => l.id === layerId)
    if (!layer) return
    interactionRef.current = {
      mode: 'drag', layerId,
      startClient: { x: e.clientX, y: e.clientY },
      startRect: { ...layer.rect },
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    e.preventDefault()
    e.stopPropagation()
    setSelectedId(layerId)
  }, [layers, editingId])

  const startResize = useCallback((e: React.PointerEvent, layerId: string, dir: HandleDir) => {
    const layer = layers.find(l => l.id === layerId)
    if (!layer) return
    interactionRef.current = {
      mode: 'resize', layerId, handleDir: dir,
      startClient: { x: e.clientX, y: e.clientY },
      startRect: { ...layer.rect },
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    e.preventDefault()
    e.stopPropagation()
  }, [layers])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const ref = interactionRef.current
    if (!ref || !canvasRef.current) return
    const bounds = canvasRef.current.getBoundingClientRect()
    const dxPct = ((e.clientX - ref.startClient.x) / bounds.width) * 100
    const dyPct = ((e.clientY - ref.startClient.y) / bounds.height) * 100
    const r = ref.startRect

    if (ref.mode === 'drag') {
      updateRect(ref.layerId, {
        x: Math.max(0, Math.min(100 - r.w, r.x + dxPct)),
        y: Math.max(0, Math.min(100 - r.h, r.y + dyPct)),
      })
    } else if (ref.mode === 'resize' && ref.handleDir) {
      const d = ref.handleDir
      let nx = r.x, ny = r.y, nw = r.w, nh = r.h
      if (d.includes('e')) nw = Math.max(5, r.w + dxPct)
      if (d.includes('w')) { nx = r.x + dxPct; nw = Math.max(5, r.w - dxPct) }
      if (d.includes('s')) nh = Math.max(3, r.h + dyPct)
      if (d.includes('n')) { ny = r.y + dyPct; nh = Math.max(3, r.h - dyPct) }
      updateRect(ref.layerId, { x: Math.max(0, nx), y: Math.max(0, ny), w: nw, h: nh })
    }
  }, [])

  const onPointerUp = useCallback(() => { interactionRef.current = null }, [])

  // ── Click outside to deselect ──
  function handleCanvasClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'IMG') {
      setSelectedId(null)
      setEditingId(null)
    }
  }

  // ── Keyboard: delete layer, escape editing ──
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setEditingId(null); setSelectedId(null) }
      if (e.key === 'Delete' && selectedId && !editingId) {
        const layer = layers.find(l => l.id === selectedId)
        if (layer && !layer.auto) deleteLayer(selectedId)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedId, editingId, layers])

  // ── Render layer content ──
  function renderLayerContent(layer: Layer) {
    const s = layer.style
    const fontSizeVw = `${s.fontSize}cqw` // container query width units

    switch (layer.kind) {
      case 'text': {
        const isEditing = editingId === layer.id
        return (
          <div
            className="w-full h-full flex items-center"
            style={{
              justifyContent: s.align === 'left' ? 'flex-start' : s.align === 'right' ? 'flex-end' : 'center',
              padding: '2px 6px',
              opacity: s.opacity,
            }}
          >
            {isEditing ? (
              <textarea
                autoFocus
                data-no-drag="1"
                value={layer.content}
                onChange={e => updateLayer(layer.id, { content: e.target.value })}
                onBlur={() => setEditingId(null)}
                onKeyDown={e => { if (e.key === 'Escape') setEditingId(null) }}
                className="bg-transparent outline-none resize-none w-full h-full"
                style={{
                  fontFamily: s.fontFamily,
                  fontSize: fontSizeVw,
                  color: s.color,
                  fontWeight: s.bold ? 'bold' : 'normal',
                  fontStyle: s.italic ? 'italic' : 'normal',
                  textDecoration: s.underline ? 'underline' : 'none',
                  textAlign: s.align,
                  caretColor: s.color,
                  lineHeight: 1.3,
                }}
              />
            ) : (
              <p
                className="w-full whitespace-pre-wrap break-words cursor-text"
                style={{
                  fontFamily: s.fontFamily,
                  fontSize: fontSizeVw,
                  color: s.color,
                  fontWeight: s.bold ? 'bold' : 'normal',
                  fontStyle: s.italic ? 'italic' : 'normal',
                  textDecoration: s.underline ? 'underline' : 'none',
                  textAlign: s.align,
                  lineHeight: 1.3,
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  setEditingId(layer.id)
                }}
              >
                {layer.content || '(double-clic pour éditer)'}
              </p>
            )}
          </div>
        )
      }

      case 'guestName': {
        return (
          <div
            className="w-full h-full flex items-center justify-center rounded-xl px-3"
            style={{ backgroundColor: s.bgColor || 'rgba(255,248,240,0.85)' }}
          >
            <p
              className="text-center whitespace-nowrap"
              style={{
                fontFamily: s.fontFamily,
                fontSize: fontSizeVw,
                color: s.color,
                fontWeight: s.bold ? 'bold' : 'normal',
              }}
            >
              {layer.content}
            </p>
            {/* Auto badge */}
            <span className="absolute top-0 right-0 bg-orange-400 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg rounded-tr-lg">
              AUTO
            </span>
          </div>
        )
      }

      case 'qrCode': {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            <div
              className="bg-white rounded-lg p-1 shadow-sm flex-1 flex items-center justify-center aspect-square max-h-full"
              style={{ border: `1px solid ${s.borderColor || '#C49A3C'}40` }}
            >
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-gray-400" fill="currentColor">
                <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm11-2h2v2h-2v-2zm-4 0h2v2h-2v-2zm0 4h2v2h-2v-2zm4 0h2v2h-2v-2zm2-4h2v2h-2v-2zm0 4h2v2h-2v-2zm2-2h2v2h-2v-2z" />
              </svg>
            </div>
            <p className="text-[8px] mt-0.5 font-mono opacity-40 text-center" style={{ color: s.color }}>
              INV-2026-XXXX
            </p>
            <span className="absolute top-0 right-0 bg-orange-400 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg rounded-tr-lg">
              AUTO
            </span>
          </div>
        )
      }

      case 'image': {
        return layer.imageDataUrl ? (
          <img src={layer.imageDataUrl} alt={layer.label} className="w-full h-full object-cover rounded-lg" draggable={false} />
        ) : null
      }

      case 'shape': {
        const radius = layer.shapeType === 'circle' ? '50%' : '12px'
        return (
          <div
            className="w-full h-full"
            style={{
              borderRadius: radius,
              backgroundColor: s.bgColor || 'rgba(255,248,240,0.8)',
              border: s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor || '#C49A3C'}` : 'none',
              opacity: s.opacity,
            }}
          />
        )
      }

      default:
        return null
    }
  }

  // ── Save ──
  function handleValidate() {
    const layerData = layers.map(l => ({
      id: l.id, kind: l.kind, label: l.label, content: l.content,
      rect: l.rect, zIndex: l.zIndex, visible: l.visible, auto: l.auto,
      style: l.style,
      ...(l.imageDataUrl ? { imageDataUrl: l.imageDataUrl } : {}),
      ...(l.shapeType ? { shapeType: l.shapeType } : {}),
    }))

    // Extract text overlay for compose-invitation compatibility
    const titleLayer = layers.find(l => l.id === 'title')
    const dateLayer = layers.find(l => l.id === 'date')
    const locationLayer = layers.find(l => l.id === 'location')
    const messageLayer = layers.find(l => l.id === 'message')
    const guestLayer = layers.find(l => l.id === 'guest')!
    const qrLayer = layers.find(l => l.id === 'qr')!

    onSave({
      imageUrl,
      ...(dallePrompt ? { dallePrompt } : {}),
      ...(label ? { label } : {}),
      textOverlay: {
        eventTitle: titleLayer?.content || coupleTitle,
        prenom1, prenom2,
        eventDate: eventDate || '',
        eventTime: eventTime || '',
        eventLocation: locationLayer?.content || eventLocation || '',
        personalMessage: messageLayer?.content || '',
        textColor: titleLayer?.style.color || '#2D1B69',
        accentColor: '#C49A3C',
        font: titleLayer?.style.fontFamily || 'serif',
        overlayOpacity: 0.92,
      },
      layers: layerData,
      positions: {
        infoCard: { x: 50, y: 35 },
        guestName: {
          x: guestLayer.rect.x + guestLayer.rect.w / 2,
          y: guestLayer.rect.y + guestLayer.rect.h / 2,
        },
        qrCode: {
          x: qrLayer.rect.x + qrLayer.rect.w / 2,
          y: qrLayer.rect.y + qrLayer.rect.h / 2,
        },
      },
    })
  }

  // ── Add menu state ──
  const [showAddMenu, setShowAddMenu] = useState(false)

  /* ══════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════ */

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">&larr; Retour</button>
        <span className="text-sm text-gray-300">|</span>
        <span className="text-sm font-medium text-[var(--text-title)]">Éditeur de design</span>
        <span className="ml-auto text-[10px] text-gray-400">
          Glissez &bull; Redimensionnez &bull; Double-clic = éditer le texte
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

        {/* ════════ LEFT: Canvas ════════ */}
        <div>
          <div
            ref={canvasRef}
            className="relative rounded-2xl overflow-hidden select-none"
            style={{ touchAction: 'none', containerType: 'inline-size' }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClick={handleCanvasClick}
          >
            <img src={imageUrl} alt="Design" className="w-full block" draggable={false} />

            {/* Render layers */}
            {sortedLayers.filter(l => l.visible).map(layer => {
              const isSelected = selectedId === layer.id
              return (
                <div
                  key={layer.id}
                  style={{
                    position: 'absolute',
                    left: `${layer.rect.x}%`,
                    top: `${layer.rect.y}%`,
                    width: `${layer.rect.w}%`,
                    height: `${layer.rect.h}%`,
                    zIndex: layer.zIndex,
                    outline: isSelected ? '2px solid #3B82F6' : undefined,
                    outlineOffset: '2px',
                    cursor: editingId === layer.id ? 'text' : 'grab',
                    userSelect: editingId === layer.id ? 'text' : 'none',
                  }}
                  onPointerDown={e => startDrag(e, layer.id)}
                  onClick={e => { e.stopPropagation(); setSelectedId(layer.id) }}
                  onDoubleClick={e => {
                    e.stopPropagation()
                    if (layer.kind === 'text' && !layer.auto) setEditingId(layer.id)
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.outline = '2px dashed #3B82F680'
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.outline = ''
                  }}
                >
                  {renderLayerContent(layer)}

                  {/* Resize handles */}
                  {isSelected && HANDLES.map(h => (
                    <div
                      key={h.dir}
                      data-handle="1"
                      style={{
                        position: 'absolute',
                        width: 10, height: 10,
                        backgroundColor: '#3B82F6',
                        border: '2px solid white',
                        borderRadius: 2,
                        cursor: h.cursor,
                        zIndex: 999,
                        ...h.style,
                      }}
                      onPointerDown={e => startResize(e, layer.id, h.dir)}
                    />
                  ))}
                </div>
              )
            })}
          </div>

          {/* Toolbar under canvas */}
          <div className="flex gap-2 mt-3 relative">
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[var(--violet)] text-white rounded-xl hover:opacity-90 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter
              </button>

              {showAddMenu && (
                <div className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[180px] z-50">
                  <button
                    onClick={() => { addText(); setShowAddMenu(false) }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className="w-5 h-5 flex items-center justify-center text-gray-400">T</span>
                    Texte libre
                  </button>
                  <button
                    onClick={() => { addImage(); setShowAddMenu(false) }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Image
                  </button>
                  <button
                    onClick={() => { addShape('rectangle'); setShowAddMenu(false) }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth={2} />
                    </svg>
                    Rectangle
                  </button>
                  <button
                    onClick={() => { addShape('circle'); setShowAddMenu(false) }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" strokeWidth={2} />
                    </svg>
                    Cercle
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ════════ RIGHT: Panel ════════ */}
        <div className="space-y-4 overflow-y-auto max-h-[85vh]">

          {/* ── Selected layer style panel ── */}
          {selectedLayer && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {selectedLayer.label}
                  {selectedLayer.auto && (
                    <span className="ml-2 bg-orange-100 text-orange-600 text-[9px] font-bold px-1.5 py-0.5 rounded">AUTO</span>
                  )}
                </h3>
                {selectedLayer.auto && (
                  <span className="text-[9px] text-orange-500">Remplacé par le vrai nom/QR de chaque invité</span>
                )}
              </div>

              {/* Content edit (for non-auto text layers) */}
              {selectedLayer.kind === 'text' && !selectedLayer.auto && (
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Contenu</label>
                  <textarea
                    value={selectedLayer.content}
                    onChange={e => updateLayer(selectedId!, { content: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--violet)] resize-none"
                  />
                </div>
              )}

              {/* Guest name preview (for guestName layer) */}
              {selectedLayer.kind === 'guestName' && (
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Nom affiché (aperçu)</label>
                  <input
                    type="text"
                    value={selectedLayer.content}
                    onChange={e => updateLayer(selectedId!, { content: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
                  />
                  <p className="text-[10px] text-orange-500 mt-0.5">Remplacé automatiquement par le vrai nom de chaque invité</p>
                </div>
              )}

              {/* Font/style controls for text-based layers */}
              {(selectedLayer.kind === 'text' || selectedLayer.kind === 'guestName') && (
                <>
                  {/* Font family */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Police</label>
                    <div className="grid grid-cols-2 gap-1">
                      {FONT_OPTIONS.map(f => (
                        <button
                          key={f.value}
                          onClick={() => updateStyle(selectedId!, { fontFamily: f.value })}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors ${
                            selectedLayer.style.fontFamily === f.value
                              ? 'bg-[var(--violet)] text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          style={{ fontFamily: f.value }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font size slider */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">
                      Taille — {selectedLayer.style.fontSize.toFixed(1)}
                    </label>
                    <input
                      type="range" min="1" max="10" step="0.2"
                      value={selectedLayer.style.fontSize}
                      onChange={e => updateStyle(selectedId!, { fontSize: parseFloat(e.target.value) })}
                      className="w-full accent-[var(--violet)]"
                    />
                  </div>

                  {/* Bold / Italic / Underline / Align */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateStyle(selectedId!, { bold: !selectedLayer.style.bold })}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                        selectedLayer.style.bold ? 'bg-[var(--violet)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >B</button>
                    <button
                      onClick={() => updateStyle(selectedId!, { italic: !selectedLayer.style.italic })}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm italic transition-colors ${
                        selectedLayer.style.italic ? 'bg-[var(--violet)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >I</button>
                    <button
                      onClick={() => updateStyle(selectedId!, { underline: !selectedLayer.style.underline })}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm underline transition-colors ${
                        selectedLayer.style.underline ? 'bg-[var(--violet)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >U</button>

                    <span className="w-px bg-gray-200 mx-1" />

                    {(['left', 'center', 'right'] as const).map(a => (
                      <button
                        key={a}
                        onClick={() => updateStyle(selectedId!, { align: a })}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                          selectedLayer.style.align === a ? 'bg-[var(--violet)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {a === 'left' && <path strokeLinecap="round" strokeWidth={2} d="M3 6h18M3 12h12M3 18h16" />}
                          {a === 'center' && <path strokeLinecap="round" strokeWidth={2} d="M3 6h18M6 12h12M4 18h16" />}
                          {a === 'right' && <path strokeLinecap="round" strokeWidth={2} d="M3 6h18M9 12h12M5 18h16" />}
                        </svg>
                      </button>
                    ))}
                  </div>

                  {/* Color */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Couleur</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {COLOR_PRESETS.map(c => (
                        <button
                          key={c}
                          onClick={() => updateStyle(selectedId!, { color: c })}
                          className={`w-7 h-7 rounded-full border-2 transition-transform ${
                            selectedLayer.style.color === c ? 'border-[var(--violet)] scale-110' : 'border-gray-200'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <input
                        type="color"
                        value={selectedLayer.style.color}
                        onChange={e => updateStyle(selectedId!, { color: e.target.value })}
                        className="w-7 h-7 rounded-full border border-gray-200 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Opacity */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">
                      Opacité — {Math.round(selectedLayer.style.opacity * 100)}%
                    </label>
                    <input
                      type="range" min="0.1" max="1" step="0.05"
                      value={selectedLayer.style.opacity}
                      onChange={e => updateStyle(selectedId!, { opacity: parseFloat(e.target.value) })}
                      className="w-full accent-[var(--violet)]"
                    />
                  </div>
                </>
              )}

              {/* Shape-specific controls */}
              {selectedLayer.kind === 'shape' && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Couleur fond</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {COLOR_PRESETS.map(c => (
                        <button
                          key={c}
                          onClick={() => updateStyle(selectedId!, { bgColor: c })}
                          className={`w-7 h-7 rounded-full border-2 transition-transform ${
                            selectedLayer.style.bgColor === c ? 'border-[var(--violet)] scale-110' : 'border-gray-200'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <input
                        type="color"
                        value={selectedLayer.style.bgColor || '#FFF8F0'}
                        onChange={e => updateStyle(selectedId!, { bgColor: e.target.value })}
                        className="w-7 h-7 rounded-full border border-gray-200 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Couleur bordure</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {COLOR_PRESETS.map(c => (
                        <button
                          key={c}
                          onClick={() => updateStyle(selectedId!, { borderColor: c })}
                          className={`w-7 h-7 rounded-full border-2 transition-transform ${
                            selectedLayer.style.borderColor === c ? 'border-[var(--violet)] scale-110' : 'border-gray-200'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">
                      Épaisseur bordure — {selectedLayer.style.borderWidth || 0}px
                    </label>
                    <input
                      type="range" min="0" max="8" step="1"
                      value={selectedLayer.style.borderWidth || 0}
                      onChange={e => updateStyle(selectedId!, { borderWidth: parseInt(e.target.value) })}
                      className="w-full accent-[var(--violet)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">
                      Opacité — {Math.round(selectedLayer.style.opacity * 100)}%
                    </label>
                    <input
                      type="range" min="0.1" max="1" step="0.05"
                      value={selectedLayer.style.opacity}
                      onChange={e => updateStyle(selectedId!, { opacity: parseFloat(e.target.value) })}
                      className="w-full accent-[var(--violet)]"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* No selection hint */}
          {!selectedLayer && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
              <p className="text-sm text-gray-400">Cliquez sur un calque pour modifier ses propriétés</p>
            </div>
          )}

          {/* ── Layers panel ── */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Calques</h3>
            <div className="space-y-1">
              {[...sortedLayers].reverse().map(layer => (
                <div
                  key={layer.id}
                  onClick={() => setSelectedId(layer.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                    selectedId === layer.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {/* Visibility toggle */}
                  <button
                    onClick={e => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }) }}
                    className="text-gray-400 hover:text-gray-600 shrink-0"
                    title={layer.visible ? 'Masquer' : 'Afficher'}
                  >
                    {layer.visible ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    )}
                  </button>

                  {/* Label + auto badge */}
                  <span className="truncate flex-1 text-xs font-medium">
                    {layer.label}
                    {layer.auto && (
                      <span className="ml-1 bg-orange-100 text-orange-600 text-[8px] font-bold px-1 py-0.5 rounded">AUTO</span>
                    )}
                  </span>

                  {/* Kind icon */}
                  <span className="text-[9px] text-gray-300 shrink-0">
                    {layer.kind === 'text' && 'T'}
                    {layer.kind === 'guestName' && 'N'}
                    {layer.kind === 'qrCode' && 'QR'}
                    {layer.kind === 'image' && 'IMG'}
                    {layer.kind === 'shape' && 'SHP'}
                  </span>

                  {/* Z-order */}
                  <button onClick={e => { e.stopPropagation(); moveLayerUp(layer.id) }}
                    className="text-gray-300 hover:text-gray-600 shrink-0" title="Avancer">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button onClick={e => { e.stopPropagation(); moveLayerDown(layer.id) }}
                    className="text-gray-300 hover:text-gray-600 shrink-0" title="Reculer">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Delete (not for auto layers) */}
                  {!layer.auto && (
                    <button onClick={e => { e.stopPropagation(); deleteLayer(layer.id) }}
                      className="text-gray-300 hover:text-red-500 shrink-0" title="Supprimer">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Validate ── */}
          <button
            onClick={handleValidate}
            className="w-full py-3 bg-[var(--violet)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Valider ce design
          </button>
        </div>
      </div>
    </div>
  )
}
