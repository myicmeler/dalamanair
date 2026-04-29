-- =============================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Run once — all statements are safe to re-run
-- =============================================

-- 1. Quote requests table
CREATE TABLE IF NOT EXISTS quote_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  pickup_location_id    UUID REFERENCES locations(id),
  dropoff_location_id   UUID REFERENCES locations(id),
  pickup_time           TIMESTAMPTZ NOT NULL,
  passengers            INT NOT NULL DEFAULT 1,
  luggage               INT NOT NULL DEFAULT 0,
  trip_type             TEXT NOT NULL DEFAULT 'oneway' CHECK (trip_type IN ('oneway','return')),
  return_time           TIMESTAMPTZ,
  flight_number         TEXT,
  notes                 TEXT,
  status                TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','expired','cancelled')),
  expires_at            TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Quote offers table
CREATE TABLE IF NOT EXISTS quote_offers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID REFERENCES quote_requests(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  vehicle_id  UUID REFERENCES vehicles(id),
  price       NUMERIC(10,2) NOT NULL,
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS policies for quotes
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_offers   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_own_requests"      ON quote_requests;
DROP POLICY IF EXISTS "providers_see_open_requests" ON quote_requests;
DROP POLICY IF EXISTS "providers_own_offers"        ON quote_offers;
DROP POLICY IF EXISTS "customers_see_own_offers"    ON quote_offers;

CREATE POLICY "customers_own_requests" ON quote_requests
  FOR ALL USING (customer_id = auth.uid());

CREATE POLICY "providers_see_open_requests" ON quote_requests
  FOR SELECT USING (status = 'open');

CREATE POLICY "providers_own_offers" ON quote_offers
  FOR ALL USING (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  );

CREATE POLICY "customers_see_own_offers" ON quote_offers
  FOR SELECT USING (
    request_id IN (SELECT id FROM quote_requests WHERE customer_id = auth.uid())
  );

-- 4. UTM tracking columns on bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS utm_source   TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS utm_medium   TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- 5. TURSAB + insurance on providers
ALTER TABLE providers ADD COLUMN IF NOT EXISTS tursab_number    TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS insurance_number TEXT;
