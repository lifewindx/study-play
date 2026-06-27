ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS split_enabled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS split_position REAL NOT NULL DEFAULT 50,
ADD COLUMN IF NOT EXISTS split_rotated_side TEXT NOT NULL DEFAULT 'top';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lessons_split_position_range'
  ) THEN
    ALTER TABLE lessons
    ADD CONSTRAINT lessons_split_position_range
    CHECK (split_position >= 10 AND split_position <= 90);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lessons_split_rotated_side_valid'
  ) THEN
    ALTER TABLE lessons
    ADD CONSTRAINT lessons_split_rotated_side_valid
    CHECK (split_rotated_side IN ('top', 'bottom'));
  END IF;
END
$$;
