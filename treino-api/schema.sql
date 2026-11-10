CREATE TABLE IF NOT EXISTS owner_backup (
  owner text PRIMARY KEY,
  revision integer NOT NULL CHECK (revision > 0),
  saved_at timestamptz NOT NULL DEFAULT now(),
  snapshot jsonb NOT NULL
);
