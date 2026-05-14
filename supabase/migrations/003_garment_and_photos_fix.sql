-- ============================================================
-- ADD GARMENT FIELD TO ORDERS
-- ============================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS garment TEXT;

-- ============================================================
-- ENSURE ORDER_PHOTOS TABLE EXISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_photos (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     UUID REFERENCES orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename     TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE order_photos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'order_photos'
      AND policyname = 'allow_all_order_photos'
  ) THEN
    EXECUTE $p$ CREATE POLICY "allow_all_order_photos"
      ON order_photos FOR ALL USING (true) WITH CHECK (true) $p$;
  END IF;
END $$;

-- ============================================================
-- STORAGE BUCKET — ensure it exists and is public
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-photos',
  'order-photos',
  true,
  10485760,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- ============================================================
-- STORAGE RLS POLICIES — allow anon key full access
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'allow_select_order_photos'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "allow_select_order_photos"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'order-photos')
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'allow_insert_order_photos'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "allow_insert_order_photos"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'order-photos')
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'allow_delete_order_photos'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "allow_delete_order_photos"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'order-photos')
    $p$;
  END IF;
END $$;
