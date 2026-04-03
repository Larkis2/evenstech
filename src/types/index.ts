// Types centraux — créé EN PREMIER avant tout composant

export type EventType = 'mariage' | 'anniversaire' | 'corporate' | 'bapteme' | 'dot' | 'autre'
export type GuestStatus = 'pending' | 'sent' | 'verified' | 'cancelled'
export type DesignMode = 'ai' | 'import' | 'template'
export type EffectType = 'particles' | 'floating' | 'video' | 'none'

export interface Ceremony {
  name: string
  date: string
  time: string
  location: string
}

export interface DesignZone {
  x: number
  y: number
  fontSize?: number
  size?: number
  color?: string
  align?: string
}

export interface DesignConfig {
  mode: DesignMode
  // Mode AI / Template
  headerColor?: string
  accentColor?: string
  bodyColor?: string
  namesFont?: string
  ornament?: string
  couplePhotoUrl?: string
  effectType?: EffectType
  // Mode Import
  imageUrl?: string
  zones?: {
    guestName?: DesignZone
    qrCode?: DesignZone
    tableSeat?: DesignZone
  }
}

export interface Organization {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface Event {
  id: string
  org_id: string
  name: string
  type: EventType
  date: string
  time: string
  location: string
  address?: string
  message?: string
  ceremonies: Ceremony[]
  design_mode: DesignMode
  design_config: DesignConfig
  design_image_url?: string
  design_zones?: DesignConfig['zones']
  boissons_alcoolisees?: string[]
  boissons_non_alcoolisees?: string[]
  created_at: string
}

export interface Guest {
  id: string
  event_id: string
  first_name: string
  last_name: string
  phone: string
  email?: string
  table_seat?: string
  group_name?: string
  status: GuestStatus
  created_at: string
  // Joined
  invitation?: Invitation
  event?: Event
}

export interface Invitation {
  id: string
  guest_id: string
  code: string
  sent_at?: string
  verified_at?: string
  verified_by?: string
  created_at: string
  // Joined
  guest?: Guest
}

export interface GuestbookEntry {
  id: string
  invitation_id: string
  message?: string
  drink_preferences: string[]
  plus_ones: number
  created_at: string
}

// Wizard step types
export interface EventFormStep1 {
  type: EventType
  name: string
  date: string
  time: string
  location: string
  address?: string
}

export interface EventFormStep2 {
  ceremonies: Ceremony[]
  message?: string
}

export interface EventFormStep3 {
  design_mode: DesignMode
  design_config: DesignConfig
}

// Status display config
export const STATUS_COLORS: Record<GuestStatus, { bg: string; text: string; label: string }> = {
  pending:   { bg: '#F5EEFF', text: '#7C3AED', label: 'En attente' },
  sent:      { bg: '#FCE7F3', text: '#BE185D', label: 'Envoyé' },
  verified:  { bg: '#E8F8EF', text: '#059669', label: 'Confirmé' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626', label: 'Annulé' },
}

// Event type display config
export const EVENT_TYPE_LABELS: Record<EventType, { emoji: string; label: string }> = {
  mariage:      { emoji: '💍', label: 'Mariage' },
  anniversaire: { emoji: '🎂', label: 'Anniversaire' },
  corporate:    { emoji: '🏢', label: 'Corporate' },
  bapteme:      { emoji: '⛪', label: 'Baptême' },
  dot:          { emoji: '🤝', label: 'Dot' },
  autre:        { emoji: '🎉', label: 'Autre' },
}
