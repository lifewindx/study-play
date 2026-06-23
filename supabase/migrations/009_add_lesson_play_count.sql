ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS play_count INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lessons_play_count_nonnegative'
  ) THEN
    ALTER TABLE lessons
    ADD CONSTRAINT lessons_play_count_nonnegative CHECK (play_count >= 0);
  END IF;
END
$$;
