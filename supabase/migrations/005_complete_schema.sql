-- ============================================================
-- MIGRATION 005 — Complete idempotent schema
-- Safe to run even if previous migrations were partially run.
-- Run this in Supabase → SQL Editor to set up everything.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── CUSTOMERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── PRICING MASTER ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing_master (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  price        NUMERIC(10,2) NOT NULL,
  price_max    NUMERIC(10,2),
  price_note   TEXT,
  description  TEXT,
  category     TEXT DEFAULT 'general',
  is_active    BOOLEAN DEFAULT true,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── ORDERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number SERIAL,
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  status       TEXT DEFAULT 'new'
               CHECK (status IN ('new','in_progress','ready','picked_up')),
  pickup_date  DATE,
  notes        TEXT,
  subtotal     NUMERIC(10,2) DEFAULT 0,
  deposit_paid NUMERIC(10,2) DEFAULT 0,
  total_paid   NUMERIC(10,2) DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── ORDER GARMENTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_garments (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id      UUID REFERENCES orders(id) ON DELETE CASCADE,
  garment_type  TEXT NOT NULL DEFAULT 'Garment',
  garment_color TEXT,
  description   TEXT,
  notes         TEXT,
  sort_order    INTEGER DEFAULT 0,
  subtotal      NUMERIC(10,2) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── GARMENT ALTERATIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS garment_alterations (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  garment_id   UUID REFERENCES order_garments(id) ON DELETE CASCADE,
  order_id     UUID REFERENCES orders(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  price        NUMERIC(10,2) NOT NULL,
  quantity     INTEGER DEFAULT 1,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── GARMENT PHOTOS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS garment_photos (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  garment_id   UUID REFERENCES order_garments(id) ON DELETE CASCADE,
  order_id     UUID REFERENCES orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename     TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── LEGACY TABLES (kept for safety, no longer used by app) ───
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     UUID REFERENCES orders(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  price        NUMERIC(10,2) NOT NULL,
  quantity     INTEGER DEFAULT 1,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS order_photos (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     UUID REFERENCES orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename     TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── UPDATED_AT TRIGGER ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='customers_updated_at') THEN
    CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='pricing_updated_at') THEN
    CREATE TRIGGER pricing_updated_at BEFORE UPDATE ON pricing_master
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='orders_updated_at') THEN
    CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_master     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_garments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE garment_alterations ENABLE ROW LEVEL SECURITY;
ALTER TABLE garment_photos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_photos       ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customers'          AND policyname='allow_all') THEN CREATE POLICY "allow_all" ON customers          FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pricing_master'     AND policyname='allow_all') THEN CREATE POLICY "allow_all" ON pricing_master     FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders'             AND policyname='allow_all') THEN CREATE POLICY "allow_all" ON orders             FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_garments'     AND policyname='allow_all') THEN CREATE POLICY "allow_all" ON order_garments     FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='garment_alterations' AND policyname='allow_all') THEN CREATE POLICY "allow_all" ON garment_alterations FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='garment_photos'     AND policyname='allow_all') THEN CREATE POLICY "allow_all" ON garment_photos     FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_items'        AND policyname='allow_all') THEN CREATE POLICY "allow_all" ON order_items        FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_photos'       AND policyname='allow_all') THEN CREATE POLICY "allow_all" ON order_photos       FOR ALL USING (true) WITH CHECK (true); END IF;
END $$;

-- ── SUPABASE STORAGE ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-photos', 'order-photos', true, 10485760,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='order_photos_select') THEN
    CREATE POLICY "order_photos_select" ON storage.objects FOR SELECT USING (bucket_id = 'order-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='order_photos_insert') THEN
    CREATE POLICY "order_photos_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'order-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='order_photos_update') THEN
    CREATE POLICY "order_photos_update" ON storage.objects FOR UPDATE USING (bucket_id = 'order-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='order_photos_delete') THEN
    CREATE POLICY "order_photos_delete" ON storage.objects FOR DELETE USING (bucket_id = 'order-photos');
  END IF;
END $$;

-- ── SEED PRICING (only if table is completely empty) ─────────
INSERT INTO pricing_master (service_name, price, price_max, price_note, category, sort_order)
SELECT * FROM (VALUES
  ('Hem gown (1 layer)',               80.00, NULL::numeric,  'Minimum',                           'evening_gowns',   10),
  ('Hem gown (2–3 layers)',           180.00, NULL,           'Minimum',                           'evening_gowns',   11),
  ('Hem gown with horsehair',         100.00, NULL,           NULL,                                'evening_gowns',   12),
  ('Shorten gown from waist',          80.00, NULL,           NULL,                                'evening_gowns',   13),
  ('Take in sides (bodice)',           80.00, NULL,           NULL,                                'evening_gowns',   14),
  ('Take in sides (full gown)',       100.00, NULL,           NULL,                                'evening_gowns',   15),
  ('Add darts / shape back',           40.00, NULL,           NULL,                                'evening_gowns',   16),
  ('Raise or lower waist',             60.00, NULL,           NULL,                                'evening_gowns',   17),
  ('Shoulder adjustment',              50.00, NULL,           NULL,                                'evening_gowns',   18),
  ('Sleeve shorten',                   40.00, NULL,           NULL,                                'evening_gowns',   19),
  ('Sleeve take-in',                   80.00, NULL,           NULL,                                'evening_gowns',   20),
  ('Neckline reshape',                 60.00, NULL,           NULL,                                'evening_gowns',   21),
  ('Replace zipper',                   40.00, NULL,           NULL,                                'evening_gowns',   22),
  ('Add full lining',                 300.00, NULL,           'Plus material fee if not provided', 'evening_gowns',   23),
  ('Create front/back sleeves',       300.00, NULL,           'Plus fabric fee',                   'evening_gowns',   24),
  ('Hem dress',                        60.00, 80.00,          NULL,                                'regular_dresses', 30),
  ('Take in sides',                    80.00, NULL,           NULL,                                'regular_dresses', 31),
  ('Shorten sleeves',                  40.00, NULL,           NULL,                                'regular_dresses', 32),
  ('Shoulder fix',                     40.00, NULL,           NULL,                                'regular_dresses', 33),
  ('Reshape neckline',                 60.00, NULL,           NULL,                                'regular_dresses', 34),
  ('Replace zipper',                   40.00, NULL,           NULL,                                'regular_dresses', 35),
  ('Hem skirt',                        50.00, NULL,           NULL,                                'skirts',          40),
  ('Take in waist',                    40.00, NULL,           NULL,                                'skirts',          41),
  ('Take in hips',                     40.00, NULL,           NULL,                                'skirts',          42),
  ('Close slit',                       20.00, NULL,           NULL,                                'skirts',          43),
  ('Add slit',                         30.00, NULL,           NULL,                                'skirts',          44),
  ('Kick pleat',                       40.00, NULL,           'Plus material fee if not provided', 'skirts',          45),
  ('Make skirt longer',                50.00, NULL,           NULL,                                'skirts',          46),
  ('Hem pants',                        40.00, NULL,           NULL,                                'pants',           50),
  ('Hem jeans',                        40.00, NULL,           NULL,                                'pants',           51),
  ('Original hem',                     50.00, NULL,           NULL,                                'pants',           52),
  ('Take in waist',                    30.00, NULL,           NULL,                                'pants',           53),
  ('Take in legs',                     40.00, NULL,           NULL,                                'pants',           54),
  ('Patch holes',                      20.00, NULL,           NULL,                                'pants',           55),
  ('Hem jacket',                       80.00, NULL,           NULL,                                'jackets_coats',   60),
  ('Shorten sleeves',                  40.00, NULL,           NULL,                                'jackets_coats',   61),
  ('Take in sides',                    80.00, NULL,           NULL,                                'jackets_coats',   62),
  ('Make skirt from pants',            80.00, 100.00,         NULL,                                'custom_work',     70),
  ('Add lining to skirt',             100.00, NULL,           'Plus material fee if not provided', 'custom_work',     71),
  ('Add pockets',                      45.00, NULL,           NULL,                                'custom_work',     72),
  ('Add panel to widen dress',         80.00, 100.00,         NULL,                                'custom_work',     73),
  ('Create modesty panel',             60.00, NULL,           NULL,                                'custom_work',     74),
  ('Attach gems / appliqués',          40.00, NULL,           'Price varies by complexity',        'custom_work',     75),
  ('Fabric fee (purchased)',           40.00, NULL,           'Add-on — +$40 minimum',             'modesty',         80),
  ('Fabric taken from dress',          40.00, NULL,           'Add-on — +$40',                     'modesty',         81),
  ('Expensive fabric add-on',          30.00, 80.00,          'Add-on, price varies',              'modesty',         82),
  ('Add sleeves',                     100.00, NULL,           NULL,                                'modesty',         83),
  ('Add 3/4 sleeves',                 100.00, NULL,           NULL,                                'modesty',         84),
  ('Add full-length sleeves',         100.00, NULL,           NULL,                                'modesty',         85),
  ('Add sleeve lining',                80.00, NULL,           NULL,                                'modesty',         86),
  ('Add underarm panel',               40.00, NULL,           NULL,                                'modesty',         87),
  ('Raise neckline (front)',           60.00, NULL,           NULL,                                'modesty',         88),
  ('Raise neckline (back)',            80.00, NULL,           NULL,                                'modesty',         89),
  ('Add chest coverage panel',         60.00, NULL,           NULL,                                'modesty',         90),
  ('Add back coverage panel',          80.00, NULL,           NULL,                                'modesty',         91),
  ('Line see-through sleeves',        100.00, NULL,           NULL,                                'modesty',         92),
  ('Line see-through bodice',         100.00, NULL,           NULL,                                'modesty',         93),
  ('Replace sheer panel',               0.00, NULL,           'Price varies — quote required',     'modesty',         94),
  ('Sewn-in shell (homemade fabric)', 180.00, NULL,           NULL,                                'modesty',         95),
  ('Sewn-in shell (simple fabric)',   100.00, NULL,           NULL,                                'modesty',         96),
  ('Add modesty skirt length',         80.00, NULL,           NULL,                                'modesty',         97),
  ('Add fabric to widen skirt bottom',100.00, NULL,           NULL,                                'modesty',         98),
  ('Add fabric to close slit',         40.00, NULL,           'Add-on — +$40',                     'modesty',         99)
) AS v(service_name, price, price_max, price_note, category, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM pricing_master LIMIT 1);
