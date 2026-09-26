CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS beers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brewery TEXT,
  country TEXT,
  region TEXT,
  style TEXT,
  abv NUMERIC(4,1),
  description TEXT,
  photo_url TEXT,
  rating INTEGER NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  notes TEXT,
  last_tasted_at DATE,
  carbonation TEXT NOT NULL DEFAULT 'Media' CHECK (carbonation IN ('Bassa','Media','Alta')),
  to_try BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS beers_user_updated_idx ON beers(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS beers_user_rating_idx ON beers(user_id, rating);

CREATE TABLE IF NOT EXISTS purchase_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Altro',
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS beer_purchase_places (
  beer_id UUID NOT NULL REFERENCES beers(id) ON DELETE CASCADE,
  purchase_place_id UUID NOT NULL REFERENCES purchase_places(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (beer_id, purchase_place_id)
);

CREATE INDEX IF NOT EXISTS purchase_places_user_idx ON purchase_places(user_id);
