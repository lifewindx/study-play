## Project: StudyPlay

악기 연습 도우미 웹앱. YouTube 영상의 특정 구간을 반복 재생하며 연습.

### Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS 3 + React Router 6
- **Database/Auth**: Supabase
- **Build**: Vite 5

### Project Structure

```
study-play/
├── AGENTS.md
├── package.json
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js / postcss.config.js
├── index.html
├── src/
│   ├── main.tsx         # Entry point
│   ├── App.tsx          # Router setup
│   ├── types.ts         # Shared types
│   ├── index.css        # Tailwind + CSS vars
│   ├── lib/
│   │   ├── db.ts        # Supabase client + data adapter
│   │   └── utils.ts     # Time formatting
│   ├── hooks/
│   │   └── useTheme.tsx # Theme context + toggle
│   ├── pages/
│   │   ├── ClassesPage.tsx    # Class CRUD + reorder
│   │   ├── LessonPage.tsx     # Lesson CRUD + reorder
│   │   ├── PlayerPage.tsx     # Video player + segments
│   │   └── CalendarPage.tsx   # Study history calendar
│   └── components/
│       ├── Layout.tsx         # Main layout (sidebar+content)
│       ├── Sidebar.tsx        # Navigation
│       ├── ThemeToggle.tsx    # Dark/light switch
│       ├── VideoPlayer.tsx    # YouTube video player
│       ├── SegmentEditor.tsx  # Add/edit segment form
│       └── SegmentList.tsx    # Segment list with reorder
├── supabase/
│   └── migrations/        # Database schema and RLS policies
```

### Data Model

```
classes
  id, title, description, sort_order, created_at, updated_at

lessons (belongs to class)
  id, class_id, title, video_url, video_type (youtube|local),
  local_file_path, sort_order, created_at, updated_at

segments (belongs to lesson)
  id, lesson_id, label, start_time, end_time, loop_gap,
  sort_order, created_at, updated_at

study_sessions (belongs to lesson, optional segment)
  id, lesson_id, segment_id, started_at, ended_at, duration_seconds
```

### Routes

| Route | Page | Description |
|-------|------|-------------|
| `/classes` | ClassesPage | Class list with create/reorder/delete |
| `/classes/:classId` | LessonPage | Lessons within a class |
| `/lesson/:lessonId` | PlayerPage | Video player with segment looping |
| `/calendar` | CalendarPage | Study history calendar |

### Key Features

- **Loop Practice**: Set start/end time segments with loop gap
- **Playback Speed**: 0.25x to 4x with fine ±0.1 control
- **Video Transform**: 90° rotation steps, horizontal/vertical flip
- **Fullscreen**: Browser fullscreen API
- **YouTube**: YouTube URL playback
- **Reorder**: Classes, lessons, segments all draggable with ▲▼ buttons
- **Study History**: Auto-recorded on play, calendar heatmap view
- **Dark/Light Theme**: System preference detection + manual toggle
- **Supabase**: Authenticated cloud persistence with RLS policies

### Ports & Configuration

| Setting | Value |
|---------|-------|
| Vite dev server | `localhost:3339` |

### Build Commands

```bash
# Development
npm run dev

# Production build
npm run build
```

---

## graphify

This project has a graphify knowledge graph at `graphify-out/`.
Global usage rules are in `~/.config/opencode/AGENTS.md`.
