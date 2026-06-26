-- Tighten RLS so child rows cannot be attached to another user's parent rows.
-- Existing broad FOR ALL policies must be removed because permissive policies are ORed.

DELETE FROM routine_completions AS completion
WHERE NOT EXISTS (
  SELECT 1
  FROM routine_items AS item
  WHERE item.id = completion.routine_item_id
    AND item.user_id = completion.user_id
);

DELETE FROM study_sessions AS session
WHERE NOT EXISTS (
  SELECT 1
  FROM lessons AS lesson
  WHERE lesson.id = session.lesson_id
    AND lesson.user_id = session.user_id
)
OR (
  session.segment_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM segments AS segment
    WHERE segment.id = session.segment_id
      AND segment.lesson_id = session.lesson_id
      AND segment.user_id = session.user_id
  )
);

DELETE FROM segments AS segment
WHERE NOT EXISTS (
  SELECT 1
  FROM lessons AS lesson
  WHERE lesson.id = segment.lesson_id
    AND lesson.user_id = segment.user_id
);

DELETE FROM lessons AS lesson
WHERE NOT EXISTS (
  SELECT 1
  FROM classes AS cls
  WHERE cls.id = lesson.class_id
    AND cls.user_id = lesson.user_id
);

DROP POLICY IF EXISTS "user_lessons" ON lessons;
DROP POLICY IF EXISTS "user_segments" ON segments;
DROP POLICY IF EXISTS "user_sessions" ON study_sessions;
DROP POLICY IF EXISTS "user_routine_completions" ON routine_completions;

CREATE POLICY "lessons_select_own" ON lessons
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "lessons_insert_own_class" ON lessons
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM classes
      WHERE classes.id = lessons.class_id
        AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "lessons_update_own_class" ON lessons
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM classes
      WHERE classes.id = lessons.class_id
        AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "lessons_delete_own" ON lessons
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "segments_select_own" ON segments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "segments_insert_own_lesson" ON segments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM lessons
      WHERE lessons.id = segments.lesson_id
        AND lessons.user_id = auth.uid()
    )
  );

CREATE POLICY "segments_update_own_lesson" ON segments
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM lessons
      WHERE lessons.id = segments.lesson_id
        AND lessons.user_id = auth.uid()
    )
  );

CREATE POLICY "segments_delete_own" ON segments
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "study_sessions_select_own" ON study_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "study_sessions_insert_own_lesson_segment" ON study_sessions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM lessons
      WHERE lessons.id = study_sessions.lesson_id
        AND lessons.user_id = auth.uid()
    )
    AND (
      study_sessions.segment_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM segments
        WHERE segments.id = study_sessions.segment_id
          AND segments.lesson_id = study_sessions.lesson_id
          AND segments.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "study_sessions_update_own_lesson_segment" ON study_sessions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM lessons
      WHERE lessons.id = study_sessions.lesson_id
        AND lessons.user_id = auth.uid()
    )
    AND (
      study_sessions.segment_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM segments
        WHERE segments.id = study_sessions.segment_id
          AND segments.lesson_id = study_sessions.lesson_id
          AND segments.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "study_sessions_delete_own" ON study_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "routine_completions_select_own" ON routine_completions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "routine_completions_insert_own_item" ON routine_completions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM routine_items
      WHERE routine_items.id = routine_completions.routine_item_id
        AND routine_items.user_id = auth.uid()
    )
  );

CREATE POLICY "routine_completions_update_own_item" ON routine_completions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM routine_items
      WHERE routine_items.id = routine_completions.routine_item_id
        AND routine_items.user_id = auth.uid()
    )
  );

CREATE POLICY "routine_completions_delete_own" ON routine_completions
  FOR DELETE USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
