-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Add note column to Horas + create Ferias table with RLS
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add note column to Horas if it doesn't exist
ALTER TABLE "Horas"
  ADD COLUMN IF NOT EXISTS note TEXT;

-- ─── Férias table ────────────────────────────────────────────────────────────

-- 2. Create Ferias table
CREATE TABLE IF NOT EXISTS "Ferias" (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ferias_valid_range CHECK (end_date >= start_date)
);

-- 3. Performance index
CREATE INDEX IF NOT EXISTS idx_ferias_user_id ON "Ferias"(user_id);

-- 4. Enable RLS
ALTER TABLE "Ferias" ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if any
DROP POLICY IF EXISTS "select_own_ferias"  ON "Ferias";
DROP POLICY IF EXISTS "insert_own_ferias"  ON "Ferias";
DROP POLICY IF EXISTS "update_own_ferias"  ON "Ferias";
DROP POLICY IF EXISTS "delete_own_ferias"  ON "Ferias";

-- 6. RLS Policies
CREATE POLICY "select_own_ferias"
  ON "Ferias" FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "insert_own_ferias"
  ON "Ferias" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_ferias"
  ON "Ferias" FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_ferias"
  ON "Ferias" FOR DELETE
  USING (auth.uid() = user_id);
