# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Philosophie du projet

**Simple comme Canva. Puissant comme RSVPify. Accessible à tous.**

N'importe qui dans le monde — qu'il soit à Kinshasa, Paris, Montréal ou Dakar — sans aucune expérience informatique, doit pouvoir créer et envoyer 200 invitations belles et personnalisées en moins de 30 minutes.

Règle d'or : **chaque écran a une seule action principale évidente.**

---

## Ce qu'on fait

Plateforme web d'invitations numériques avec QR code pour tous types d'événements (mariage, anniversaire, corporate, baptême, dot…) destinée à **un public mondial**, avec un lancement prioritaire en **Afrique francophone** (Kinshasa, RDC).

### Avantages vs concurrents (Fotify, RSVPify, planningevents-rdc)
- IA intégrée pour concevoir l'invitation en décrivant son idée en mots simples
- Import design externe (Photoshop, Illustrator, Affinity, Canva, PowerPoint)
- Templates animés avec effets visuels (particules, vidéo fond, éléments flottants)
- Import Excel/CSV pour 250 invités en 10 secondes
- Envoi WhatsApp automatique et personnalisé par invité
- Scanner QR caméra dédié à l'entrée (onglet séparé)
- Multi-langues : français, anglais, lingala, swahili (extensible)
- Cérémonies multiples : dot, civil, religieux, réception — mais aussi tout autre format
- Préférences boissons et repas personnalisables selon l'événement
- Tarification flexible : FC, USD, EUR et autres devises
- Paiement Mobile Money (phase 2) + carte bancaire internationale

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Base de données | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| IA design texte | Claude API (claude-sonnet-4-20250514) |
| IA génération images | OpenAI DALL-E 3 |
| Emails | Resend + React Email |
| QR Code génération | `qrcode` (npm) |
| QR Code scan caméra | `html5-qrcode` (npm) |
| Import Excel | `xlsx` (npm) |
| Déploiement | Vercel |
| Paiement phase 2 | Mobile Money (Airtel, M-Pesa, Orange) |

### Installation complète
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir
npm install @supabase/supabase-js @supabase/ssr
npm install qrcode html5-qrcode
npm install resend @react-email/components
npm install xlsx
npm install @anthropic-ai/sdk openai jspdf
npm install @types/qrcode
```

## Build & Dev Commands

```bash
npm run dev          # Serveur de développement (localhost:3000)
npm run build        # Build production
npm run lint         # Linting
npm run start        # Serveur production local
```

---

## Navigation principale (4 onglets seulement)

```
┌─────────────────────────────────────────────────────┐
│  invit.app   [Mes événements] [Mes invités]          │
│              [Design]  [Contrôle entrée]  [+ Créer]  │
└─────────────────────────────────────────────────────┘
```

**Pas plus de 4 onglets.** Chaque onglet a un rôle clair et unique.

---

## Les 4 écrans principaux validés

### Écran 1 — Mes événements (page d'accueil)
- Message de bienvenue chaleureux avec prénom de l'utilisateur
- Gros bouton central "Créer mon événement" si aucun événement
- Grille des événements existants avec : emoji type, nom, date, barre de progression (envoyés/total)
- Carte "+" pour créer un nouvel événement

### Écran 2 — Créer un événement (wizard 3 étapes)
- **Étape 1** : Type d'événement + nom + date + heure + lieu
- **Étape 2** : Cérémonies multiples optionnelles + message personnalisé + boissons
- **Étape 3** : Choisir le design (IA / Import / Templates)

### Écran 3 — Mes invités
- Barre de stats en haut : Total · Envoyés · Confirmés · Annulés
- Barre d'outils : Recherche + Ajouter + Envoyer sur WhatsApp
- 3 méthodes d'ajout : manuelle, Import Excel/CSV, contacts téléphone (phase 2)

### Écran 4 — Contrôle entrée (onglet séparé)
- Scanner QR caméra (html5-qrcode) + saisie manuelle fallback
- Résultat visuel : ✅ Vert (valide) · ⚠️ Bleu (déjà scanné) · ❌ Rouge (invalide)
- Compteur temps réel

---

## Architecture

```
src/
├── app/
│   ├── (public)/invitation/[code]/page.tsx   # Page invité (sans login)
│   ├── (auth)/login/ & register/             # Auth pages
│   ├── api/auth/register/route.ts            # Register API (service role, bypass RLS)
│   ├── api/ai-design/route.ts                # Claude → DALL-E 3 image generation
│   ├── api/compose-invitation/route.ts       # Canvas composition (text+QR on DALL-E bg)
│   └── dashboard/
│       ├── page.tsx                          # Mes événements (accueil)
│       ├── events/new/page.tsx               # Wizard création 3 étapes
│       ├── events/[id]/page.tsx              # Détail événement
│       ├── guests/page.tsx                   # Gestion invités
│       ├── design/[id]/page.tsx              # Éditeur design (IA/import/template)
│       └── scan/page.tsx                     # Scanner QR contrôle entrée
├── components/
│   ├── invitation/   # InvitationCard, ComposedInvitationImage, QRCodeDisplay, WhatsAppShare, GuestbookForm, DrinkSelector, CeremoniesTimeline
│   ├── design/       # AIDesignChat, DesignEditor, TemplateGallery, ImportDesign
│   ├── guests/       # GuestActions, AddGuestModal, ImportExcel, ExportReportPDF
│   ├── scanner/      # QRScanner
│   └── ui/           # StepWizard, StatsBar, Sidebar
├── lib/              # generate-code, whatsapp, drinks, import-guests, ai-design, compose-invitation, generate-report, supabase clients
└── types/index.ts    # ALL types
```

---

## Key Conventions

- **Types first**: `src/types/index.ts` must exist before any component. No `any`.
- **Server Components by default** — `'use client'` only for: canvas, camera, chat IA, drag & drop
- **Supabase server**: `createServerClient` from `@supabase/ssr`
- **Supabase client**: `createBrowserClient` for interactive components
- **Register**: uses API route with service_role key to bypass RLS and auto-create org
- **Langue**: toute l'interface en français
- **Mobile-first**: responsive dès le départ
- **WhatsApp = canal principal** — always before email

---

## Color System

```css
:root {
  --bg-page: #FFF8F0;       /* fond crème chaud */
  --bg-card: #FFF0E0;       /* fond cartes événements */
  --hero-bg: #C49A3C;       /* or doux — bloc Bonjour */
  --violet: #7C3AED;        /* onglet actif, bouton créer */
  --violet-pale: #F5EEFF;   /* fond carte nouvelle */
  --gold: #C49A3C;          /* or principal */
  --gold-dark: #8B6914;     /* or foncé texte */
  --whatsapp: #25D366;
  --text-title: #2D1B69;    /* titres violet profond */
}
```

Guest statuses: pending (violet), sent (pink), verified (green), cancelled (red).

6 themes: Élégance Sombre, Violet Festif, Rose Romantique, Wax/Afrika, Émeraude, Marine & Or.

---

## Database

`organizations` → `events` → `guests` → `invitations` → `guestbook_entries`

Events table includes `boissons_alcoolisees TEXT[]` and `boissons_non_alcoolisees TEXT[]` for event-specific drink lists.

RLS with separate INSERT/SELECT/UPDATE/DELETE policies. Register uses service_role to bypass RLS.

---

## Design Flow

1. User describes event → Claude generates 3 DALL-E prompts → DALL-E 3 generates images (1024x1792)
2. User picks a design → opens DesignEditor (Canva-like editor)
3. DesignEditor: each text element is a separate draggable/resizable layer with per-layer font/style
4. Layers: Title, Date, Location, Message (editable text), Guest Name + QR Code (AUTO — draggable but not editable)
5. User can add: free text, images, shapes (rectangle, circle)
6. All layer positions/sizes/styles saved as JSON in `design_config.layers[]`
7. On `/invitation/[code]`: compose-invitation API overlays guest name + QR code using node-canvas
8. Composed PNG uploaded to Supabase Storage (`design-imports/invitations/`)
9. After design validation → auto-redirect to `/dashboard/guests?event_id=[id]`

**IMPORTANT**: react-rnd and react-draggable crash on React 19 (findDOMNode removed). Use native Pointer Events API for drag & resize.

---

## Guest Preferences Flow

1. Guest opens WhatsApp link → sees composed invitation image
2. Below: preference form with event-specific drinks (from `events.boissons_alcoolisees` / `boissons_non_alcoolisees`)
3. Max 1 alcool + max 1 soft, toggle buttons
4. On submit → insert guestbook_entry + update guest status to 'verified'
5. Show thank you message, form hidden

---

## PDF Report

Export button in dashboard generates PDF organized by table:
- Each table section lists guests, their drink choices, plus-ones, messages
- Summary totals at end (confirmed, pending, cancelled, total accompaniments)
- Uses jsPDF library

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY, OPENAI_API_KEY, RESEND_API_KEY, NEXT_PUBLIC_APP_URL
```

---

## Ordre de développement — SUIVRE STRICTEMENT

```
ÉTAPE 1  → Créer le projet Next.js + installer toutes les dépendances
ÉTAPE 2  → Créer src/types/index.ts (AVANT tout le reste)
ÉTAPE 3  → Créer src/lib/ (generate-code, whatsapp, drinks, import-guests, ai-design)
ÉTAPE 4  → Exécuter le SQL Supabase complet
ÉTAPE 5  → Pages auth login/register (auto-create org at register)
ÉTAPE 6  → Middleware protection /dashboard/*
ÉTAPE 7  → Layout dashboard + navigation 4 onglets
ÉTAPE 8  → Écran 1 : liste des événements + carte création
ÉTAPE 9  → Wizard création événement 3 étapes (incl. boissons)
ÉTAPE 10 → Écran design : Mode IA (DALL-E 3) + Mode Import + Mode Template
ÉTAPE 11 → Gabarit téléchargeable /public/templates/gabarit-invitation.png
ÉTAPE 12 → Écran invités : tableau + ajout individuel
ÉTAPE 13 → Import Excel/CSV
ÉTAPE 14 → Envoi WhatsApp automatique et personnalisé
ÉTAPE 15 → Page publique /invitation/[code] + InvitationCard
ÉTAPE 16 → Livre d'or + boissons locales + annulation
ÉTAPE 17 → Écran contrôle entrée + scanner QR caméra
ÉTAPE 18 → Realtime dashboard (Supabase Realtime)
ÉTAPE 19 → Templates animés (particules, flottant, vidéo fond)
ÉTAPE 20 → Responsive mobile + polish UI
ÉTAPE 21 → SEO + metadata dynamiques /invitation/[code]
ÉTAPE 22 → Deploy Vercel + domaine custom
```
