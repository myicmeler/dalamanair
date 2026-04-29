-- Quote requests table
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

-- Quote offers table
CREATE TABLE IF NOT EXISTS quote_offers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        UUID REFERENCES quote_requests(id) ON DELETE CASCADE,
  provider_id       UUID REFERENCES providers(id) ON DELETE CASCADE,
  vehicle_id        UUID REFERENCES vehicles(id),
  price             NUMERIC(10,2) NOT NULL,
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_offers   ENABLE ROW LEVEL SECURITY;

-- Customers can see and create their own requests
CREATE POLICY "customers_own_requests" ON quote_requests
  FOR ALL USING (customer_id = auth.uid());

-- Providers can see open requests
CREATE POLICY "providers_see_open_requests" ON quote_requests
  FOR SELECT USING (status = 'open');

-- Providers can manage their own offers
CREATE POLICY "providers_own_offers" ON quote_offers
  FOR ALL USING (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  );

-- Customers can see offers on their requests
CREATE POLICY "customers_see_own_offers" ON quote_offers
  FOR SELECT USING (
    request_id IN (SELECT id FROM quote_requests WHERE customer_id = auth.uid())
  );
