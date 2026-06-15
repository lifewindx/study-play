CREATE TABLE IF NOT EXISTS routine_completions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_item_id BIGINT NOT NULL REFERENCES routine_items(id) ON DELETE CASCADE,
  routine_date DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, routine_item_id, routine_date)
);

CREATE INDEX IF NOT EXISTS idx_routine_completions_user_id ON routine_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_completions_routine_date ON routine_completions(routine_date);

ALTER TABLE routine_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_routine_completions" ON routine_completions;

CREATE POLICY "user_routine_completions" ON routine_completions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
