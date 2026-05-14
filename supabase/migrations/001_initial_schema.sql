-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRICING MASTER
-- ============================================================
CREATE TABLE pricing_master (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number SERIAL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'ready', 'picked_up')),
  pickup_date DATE,
  notes TEXT,
  subtotal NUMERIC(10,2) DEFAULT 0,
  deposit_paid NUMERIC(10,2) DEFAULT 0,
  total_paid NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER pricing_master_updated_at BEFORE UPDATE ON pricing_master
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED PRICING MASTER
-- ============================================================
INSERT INTO pricing_master (service_name, price, category, sort_order) VALUES
  ('Dress Hem',          80.00, 'dress',   1),
  ('Take In Waist',      45.00, 'dress',   2),
  ('Shorten Straps',     35.00, 'dress',   3),
  ('Add Cups',           55.00, 'dress',   4),
  ('Take In Sides',      50.00, 'dress',   5),
  ('Sleeve Shortening',  40.00, 'jacket',  6),
  ('Jacket Sleeves',     65.00, 'jacket',  7),
  ('Pants Hem',          30.00, 'pants',   8),
  ('Let Out Waist',      45.00, 'pants',   9),
  ('Pants Taper',        40.00, 'pants',  10),
  ('Zipper Replacement', 45.00, 'general',11),
  ('Button Replacement', 15.00, 'general',12);

-- ============================================================
-- ROW LEVEL SECURITY (open for now — add auth later if needed)
-- ============================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon key (single-user business app)
CREATE POLICY "allow_all_customers"     ON customers     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pricing"       ON pricing_master FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_orders"        ON orders        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_order_items"   ON order_items   FOR ALL USING (true) WITH CHECK (true);
