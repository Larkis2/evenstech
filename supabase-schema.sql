-- Schéma complet Supabase — Plateforme Invitations Numériques Afrique
-- Exécuter dans le SQL Editor de Supabase Dashboard

CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('mariage','anniversaire','corporate','bapteme','dot','autre')),
  date             DATE NOT NULL,
  time             TIME NOT NULL,
  location         TEXT NOT NULL,
  address          TEXT,
  message          TEXT,
  ceremonies       JSONB DEFAULT '[]',
  design_mode      TEXT DEFAULT 'ai' CHECK (design_mode IN ('ai','studio','import','template')),
  design_config    JSONB DEFAULT '{}',
  design_image_url TEXT,
  design_zones     JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE guests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  table_seat  TEXT,
  group_name  TEXT,
  status      TEXT DEFAULT 'pending'
              CHECK (status IN ('pending','sent','verified','cancelled')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id     UUID REFERENCES guests(id) ON DELETE CASCADE,
  code         TEXT UNIQUE NOT NULL,
  sent_at      TIMESTAMPTZ,
  verified_at  TIMESTAMPTZ,
  verified_by  TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE guestbook_entries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id      UUID REFERENCES invitations(id) ON DELETE CASCADE,
  message            TEXT,
  drink_preferences  TEXT[] DEFAULT '{}',
  plus_ones          INT DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE organizations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE guestbook_entries ENABLE ROW LEVEL SECURITY;

-- Organizations: policies séparées (INSERT a besoin de WITH CHECK, pas USING)
CREATE POLICY "org_select" ON organizations FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "org_insert" ON organizations FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "org_update" ON organizations FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "org_delete" ON organizations FOR DELETE
  USING (user_id = auth.uid());

-- Events: policies séparées
CREATE POLICY "event_select" ON events FOR SELECT
  USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));
CREATE POLICY "event_insert" ON events FOR INSERT
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));
CREATE POLICY "event_update" ON events FOR UPDATE
  USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));
CREATE POLICY "event_delete" ON events FOR DELETE
  USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

-- Guests: policies séparées
CREATE POLICY "guests_select" ON guests FOR SELECT
  USING (event_id IN (
    SELECT id FROM events WHERE org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "guests_insert" ON guests FOR INSERT
  WITH CHECK (event_id IN (
    SELECT id FROM events WHERE org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "guests_update" ON guests FOR UPDATE
  USING (event_id IN (
    SELECT id FROM events WHERE org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "guests_delete" ON guests FOR DELETE
  USING (event_id IN (
    SELECT id FROM events WHERE org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  ));

-- Invitations: policies séparées
CREATE POLICY "inv_select" ON invitations FOR SELECT
  USING (guest_id IN (
    SELECT id FROM guests WHERE event_id IN (
      SELECT id FROM events WHERE org_id IN (
        SELECT id FROM organizations WHERE user_id = auth.uid()
      )
    )
  ));
CREATE POLICY "inv_insert" ON invitations FOR INSERT
  WITH CHECK (guest_id IN (
    SELECT id FROM guests WHERE event_id IN (
      SELECT id FROM events WHERE org_id IN (
        SELECT id FROM organizations WHERE user_id = auth.uid()
      )
    )
  ));
CREATE POLICY "inv_update" ON invitations FOR UPDATE
  USING (guest_id IN (
    SELECT id FROM guests WHERE event_id IN (
      SELECT id FROM events WHERE org_id IN (
        SELECT id FROM organizations WHERE user_id = auth.uid()
      )
    )
  ));
CREATE POLICY "inv_delete" ON invitations FOR DELETE
  USING (guest_id IN (
    SELECT id FROM guests WHERE event_id IN (
      SELECT id FROM events WHERE org_id IN (
        SELECT id FROM organizations WHERE user_id = auth.uid()
      )
    )
  ));

-- Public access for /invitation/[code] page (no login required)
CREATE POLICY "public_read_inv"    ON invitations       FOR SELECT USING (true);
CREATE POLICY "public_read_guest"  ON guests            FOR SELECT USING (true);
CREATE POLICY "public_read_event"  ON events            FOR SELECT USING (true);
CREATE POLICY "public_insert_book" ON guestbook_entries  FOR INSERT WITH CHECK (true);
CREATE POLICY "public_read_book"   ON guestbook_entries  FOR SELECT USING (true);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('couple-photos',  'couple-photos',  true),
  ('design-imports', 'design-imports', true);

CREATE POLICY "auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "public_read" ON storage.objects
  FOR SELECT USING (true);
