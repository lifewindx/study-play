ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS difficulty SMALLINT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lessons_difficulty_range'
  ) THEN
    ALTER TABLE lessons
    ADD CONSTRAINT lessons_difficulty_range CHECK (difficulty BETWEEN 0 AND 5);
  END IF;
END
$$;
