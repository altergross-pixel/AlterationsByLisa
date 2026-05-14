-- ============================================================
-- ADD NEW COLUMNS TO PRICING MASTER
-- ============================================================
ALTER TABLE pricing_master
  ADD COLUMN IF NOT EXISTS price_max   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_note  TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================================
-- REPLACE ALL PRICING DATA WITH MASTER BILLING SHEET
-- ============================================================
TRUNCATE pricing_master;

INSERT INTO pricing_master (service_name, price, price_max, price_note, category, sort_order) VALUES

-- ── Evening Gowns & Formal Gowns ──────────────────────────
('Hem gown (1 layer)',               80,  NULL, 'Minimum',                            'evening_gowns',   10),
('Hem gown (2–3 layers)',           180,  NULL, 'Minimum',                            'evening_gowns',   11),
('Hem gown with horsehair',         100,  NULL,  NULL,                                'evening_gowns',   12),
('Shorten gown from waist',          80,  NULL,  NULL,                                'evening_gowns',   13),
('Take in sides (bodice)',           80,  NULL,  NULL,                                'evening_gowns',   14),
('Take in sides (full gown)',       100,  NULL,  NULL,                                'evening_gowns',   15),
('Add darts / shape back',           40,  NULL,  NULL,                                'evening_gowns',   16),
('Raise or lower waist',             60,  NULL,  NULL,                                'evening_gowns',   17),
('Shoulder adjustment',              50,  NULL,  NULL,                                'evening_gowns',   18),
('Sleeve shorten',                   40,  NULL,  NULL,                                'evening_gowns',   19),
('Sleeve take-in',                   80,  NULL,  NULL,                                'evening_gowns',   20),
('Neckline reshape',                 60,  NULL,  NULL,                                'evening_gowns',   21),
('Replace zipper',                   40,  NULL,  NULL,                                'evening_gowns',   22),
('Add full lining',                 300,  NULL, 'Plus material fee if not provided',  'evening_gowns',   23),
('Create front/back sleeves',       300,  NULL, 'Plus fabric fee',                    'evening_gowns',   24),

-- ── Regular Dresses ───────────────────────────────────────
('Hem dress',                        60,   80,   NULL,                                'regular_dresses', 30),
('Take in sides',                    80,  NULL,  NULL,                                'regular_dresses', 31),
('Shorten sleeves',                  40,  NULL,  NULL,                                'regular_dresses', 32),
('Shoulder fix',                     40,  NULL,  NULL,                                'regular_dresses', 33),
('Reshape neckline',                 60,  NULL,  NULL,                                'regular_dresses', 34),
('Replace zipper',                   40,  NULL,  NULL,                                'regular_dresses', 35),

-- ── Skirts ───────────────────────────────────────────────
('Hem skirt',                        50,  NULL,  NULL,                                'skirts',          40),
('Take in waist',                    40,  NULL,  NULL,                                'skirts',          41),
('Take in hips',                     40,  NULL,  NULL,                                'skirts',          42),
('Close slit',                       20,  NULL,  NULL,                                'skirts',          43),
('Add slit',                         30,  NULL,  NULL,                                'skirts',          44),
('Kick pleat',                       40,  NULL, 'Plus material fee if not provided',  'skirts',          45),
('Make skirt longer',                50,  NULL,  NULL,                                'skirts',          46),

-- ── Pants ────────────────────────────────────────────────
('Hem pants',                        40,  NULL,  NULL,                                'pants',           50),
('Hem jeans',                        40,  NULL,  NULL,                                'pants',           51),
('Original hem',                     50,  NULL,  NULL,                                'pants',           52),
('Take in waist',                    30,  NULL,  NULL,                                'pants',           53),
('Take in legs',                     40,  NULL,  NULL,                                'pants',           54),
('Patch holes',                      20,  NULL,  NULL,                                'pants',           55),

-- ── Jackets / Coats ──────────────────────────────────────
('Hem jacket',                       80,  NULL,  NULL,                                'jackets_coats',   60),
('Shorten sleeves',                  40,  NULL,  NULL,                                'jackets_coats',   61),
('Take in sides',                    80,  NULL,  NULL,                                'jackets_coats',   62),

-- ── Custom Work ──────────────────────────────────────────
('Make skirt from pants',            80,  100,   NULL,                                'custom_work',     70),
('Add lining to skirt',             100,  NULL, 'Plus material fee if not provided',  'custom_work',     71),
('Add pockets',                      45,  NULL,  NULL,                                'custom_work',     72),
('Add panel to widen dress',         80,  100,   NULL,                                'custom_work',     73),
('Create modesty panel',             60,  NULL,  NULL,                                'custom_work',     74),
('Attach gems / appliqués',          40,  NULL, 'Price varies by complexity',         'custom_work',     75),

-- ── Modesty Alterations ──────────────────────────────────
('Fabric fee (purchased)',           40,  NULL, 'Add-on — +$40 minimum',              'modesty',         80),
('Fabric taken from dress',          40,  NULL, 'Add-on — +$40',                      'modesty',         81),
('Expensive fabric add-on',          30,   80,  'Add-on, price varies',               'modesty',         82),
('Add sleeves',                     100,  NULL,  NULL,                                'modesty',         83),
('Add 3/4 sleeves',                 100,  NULL,  NULL,                                'modesty',         84),
('Add full-length sleeves',         100,  NULL,  NULL,                                'modesty',         85),
('Add sleeve lining',                80,  NULL,  NULL,                                'modesty',         86),
('Add underarm panel',               40,  NULL,  NULL,                                'modesty',         87),
('Raise neckline (front)',           60,  NULL,  NULL,                                'modesty',         88),
('Raise neckline (back)',            80,  NULL,  NULL,                                'modesty',         89),
('Add chest coverage panel',         60,  NULL,  NULL,                                'modesty',         90),
('Add back coverage panel',          80,  NULL,  NULL,                                'modesty',         91),
('Line see-through sleeves',        100,  NULL,  NULL,                                'modesty',         92),
('Line see-through bodice',         100,  NULL,  NULL,                                'modesty',         93),
('Replace sheer panel',               0,  NULL, 'Price varies — quote required',      'modesty',         94),
('Sewn-in shell (homemade fabric)', 180,  NULL,  NULL,                                'modesty',         95),
('Sewn-in shell (simple fabric)',   100,  NULL,  NULL,                                'modesty',         96),
('Add modesty skirt length',         80,  NULL,  NULL,                                'modesty',         97),
('Add fabric to widen skirt bottom',100,  NULL,  NULL,                                'modesty',         98),
('Add fabric to close slit',         40,  NULL, 'Add-on — +$40',                      'modesty',         99);

-- ============================================================
-- ORDER PHOTOS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS order_photos (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     UUID REFERENCES orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename     TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE order_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_order_photos"
  ON order_photos FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- SUPABASE STORAGE BUCKET  (run this in the SQL editor)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-photos',
  'order-photos',
  true,
  10485760,   -- 10 MB per file
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow the anon key to upload, read, and delete from this bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'allow_all_storage_order_photos'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "allow_all_storage_order_photos"
      ON storage.objects FOR ALL
      USING (bucket_id = 'order-photos')
      WITH CHECK (bucket_id = 'order-photos')
    $policy$;
  END IF;
END $$;
