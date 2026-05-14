-- ============================================================
-- MIGRATION 004: Garment-based order schema
-- Each order → many garments → each garment has alterations + photos
-- ============================================================

-- ── New tables ───────────────────────────────────────────────

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

CREATE TABLE IF NOT EXISTS garment_photos (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  garment_id   UUID REFERENCES order_garments(id) ON DELETE CASCADE,
  order_id     UUID REFERENCES orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename     TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE order_garments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_garments' AND policyname='allow_all_order_garments') THEN
    CREATE POLICY "allow_all_order_garments" ON order_garments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE garment_alterations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='garment_alterations' AND policyname='allow_all_garment_alterations') THEN
    CREATE POLICY "allow_all_garment_alterations" ON garment_alterations FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE garment_photos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='garment_photos' AND policyname='allow_all_garment_photos') THEN
    CREATE POLICY "allow_all_garment_photos" ON garment_photos FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Migrate existing order_items → garment_alterations ───────
-- For each order that has order_items, create one garment and move items under it.

DO $$
DECLARE
  r RECORD;
  new_garment_id UUID;
BEGIN
  FOR r IN
    SELECT DISTINCT o.id AS order_id,
                    COALESCE(o.garment, 'Garment') AS garment_type,
                    o.subtotal
    FROM orders o
    WHERE EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM order_garments og WHERE og.order_id = o.id)
  LOOP
    INSERT INTO order_garments (order_id, garment_type, subtotal, sort_order)
    VALUES (r.order_id, r.garment_type, r.subtotal, 0)
    RETURNING id INTO new_garment_id;

    INSERT INTO garment_alterations (garment_id, order_id, service_name, price, quantity, notes)
    SELECT new_garment_id, oi.order_id, oi.service_name, oi.price, oi.quantity, oi.notes
    FROM order_items oi
    WHERE oi.order_id = r.order_id;
  END LOOP;
END $$;

-- Migrate existing order_photos → garment_photos (link to the first garment per order)
INSERT INTO garment_photos (garment_id, order_id, storage_path, filename)
SELECT og.id, op.order_id, op.storage_path, op.filename
FROM order_photos op
JOIN LATERAL (
  SELECT id FROM order_garments
  WHERE order_id = op.order_id
  ORDER BY sort_order, created_at
  LIMIT 1
) og ON true
WHERE NOT EXISTS (
  SELECT 1 FROM garment_photos gp WHERE gp.storage_path = op.storage_path
);

-- ── Remove old garment column (moved to order_garments) ──────
ALTER TABLE orders DROP COLUMN IF EXISTS garment;

-- ── Ensure storage bucket policy exists ─────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('order-photos','order-photos', true, 10485760,
        ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif'])
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='allow_select_order_photos') THEN
    CREATE POLICY "allow_select_order_photos" ON storage.objects FOR SELECT USING (bucket_id='order-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='allow_insert_order_photos') THEN
    CREATE POLICY "allow_insert_order_photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id='order-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='allow_delete_order_photos') THEN
    CREATE POLICY "allow_delete_order_photos" ON storage.objects FOR DELETE USING (bucket_id='order-photos');
  END IF;
END $$;
