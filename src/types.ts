export type VideoType = "youtube" | "local";

export interface Class {
  id: number;
  title: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: number;
  class_id: number;
  title: string;
  video_url: string;
  video_type: VideoType;
  local_file_path: string | null;
  notes: string;
  difficulty: number;
  is_favorite: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Segment {
  id: number;
  lesson_id: number;
  label: string;
  start_time: number;
  end_time: number;
  loop_gap: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StudySession {
  id: number;
  lesson_id: number;
  segment_id: number | null;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
}

export interface RoutineItem {
  id: number;
  title: string;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RoutineCompletion {
  id: number;
  routine_item_id: number;
  routine_date: string;
  completed_at: string;
  created_at: string;
}

export type Theme = "light" | "dark";
