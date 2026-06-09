-- 1. Adicionar user_id se não existir
ALTER TABLE "Horas"
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Índice de performance
CREATE INDEX IF NOT EXISTS idx_horas_user_id ON "Horas"(user_id);

-- 3. Ativar RLS
ALTER TABLE "Horas" ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas antigas se existirem
DROP POLICY IF EXISTS "select_own_records" ON "Horas";
DROP POLICY IF EXISTS "insert_own_records" ON "Horas";
DROP POLICY IF EXISTS "update_own_records" ON "Horas";
DROP POLICY IF EXISTS "delete_own_records" ON "Horas";

-- 5. Política SELECT
CREATE POLICY "select_own_records"
  ON "Horas" FOR SELECT
  USING (auth.uid() = user_id);

-- 6. Política INSERT
CREATE POLICY "insert_own_records"
  ON "Horas" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 7. Política UPDATE
CREATE POLICY "update_own_records"
  ON "Horas" FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. Política DELETE
CREATE POLICY "delete_own_records"
  ON "Horas" FOR DELETE
  USING (auth.uid() = user_id);
