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

export type Theme = "light" | "dark";
