INSERT INTO segments (user_id, lesson_id, label, start_time, end_time, loop_gap, sort_order)
SELECT
  l.user_id,
  l.id,
  'All',
  0,
  0,
  0,
  COALESCE((
    SELECT MIN(s.sort_order) - 1
    FROM segments s
    WHERE s.lesson_id = l.id
  ), 0)
FROM lessons l
WHERE NOT EXISTS (
  SELECT 1
  FROM segments s
  WHERE s.lesson_id = l.id
    AND s.label = 'All'
    AND s.start_time = 0
    AND s.end_time = 0
);
