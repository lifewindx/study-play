-- Preserve study history while collapsing legacy duplicate system segments.
WITH duplicate_all_segments AS (
  SELECT
    id,
    MIN(id) OVER (PARTITION BY lesson_id) AS canonical_id
  FROM segments
  WHERE label = 'All'
    AND start_time = 0
)
UPDATE study_sessions AS session
SET segment_id = duplicate.canonical_id
FROM duplicate_all_segments AS duplicate
WHERE session.segment_id = duplicate.id
  AND duplicate.id <> duplicate.canonical_id;

WITH duplicate_all_segments AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY lesson_id ORDER BY id) AS position
  FROM segments
  WHERE label = 'All'
    AND start_time = 0
)
DELETE FROM segments AS segment
USING duplicate_all_segments AS duplicate
WHERE segment.id = duplicate.id
  AND duplicate.position > 1;

-- The video duration is runtime metadata. Keep the canonical All row as a placeholder.
UPDATE segments
SET end_time = 0,
    updated_at = NOW()
WHERE label = 'All'
  AND start_time = 0
  AND end_time <> 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_segments_one_all_per_lesson
  ON segments (lesson_id)
  WHERE label = 'All' AND start_time = 0;
