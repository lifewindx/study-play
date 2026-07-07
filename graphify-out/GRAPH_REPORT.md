# Graph Report - StudyPlay  (2026-07-07)

## Corpus Check
- 57 files · ~24,757 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 644 nodes · 1005 edges · 34 communities (30 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `14190e0d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 36 edges
2. `Security Hardening Checklist` - 12 edges
3. `sanitizeError()` - 11 edges
4. `LocalPreviewDb` - 10 edges
5. `loadData` - 8 edges
6. `Project: StudyPlay` - 8 edges
7. `validatePassword()` - 7 edges
8. `handleSave()` - 7 edges
9. `loadClasses` - 7 edges
10. `Class` - 6 edges

## Surprising Connections (you probably didn't know these)
- `handleResendConfirmation()` --calls--> `sanitizeError()`  [EXTRACTED]
  src/pages/LoginPage.tsx → src/lib/errors.ts
- `handleAdd()` --calls--> `getDb()`  [EXTRACTED]
  src/components/RoutinePanel.tsx → src/lib/db.ts
- `handleToggle()` --calls--> `getDb()`  [EXTRACTED]
  src/components/RoutinePanel.tsx → src/lib/db.ts
- `handleDelete()` --calls--> `getDb()`  [EXTRACTED]
  src/components/RoutinePanel.tsx → src/lib/db.ts
- `handleSaveEdit()` --calls--> `getDb()`  [EXTRACTED]
  src/components/RoutinePanel.tsx → src/lib/db.ts

## Communities (34 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (48): [activeSegment, setActiveSegment], ActiveStudySession, activeStudySessionRef, [classTitle, setClassTitle], countLessonPlay, [currentTime, setCurrentTime], difficultySaveSequenceRef, [editingSegment, setEditingSegment] (+40 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (48): PlusIcon(), XIcon(), closeEdit(), { draggingId, startReorderDrag }, [editingItemId, setEditingItemId], [editingTitle, setEditingTitle], [error, setError], handleAdd() (+40 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (51): getDb(), openDateDetail(), [classDescription, setClassDescription], { classId }, [classTitle, setClassTitle], closeClassForm(), closeForm(), [cls, setCls] (+43 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (45): blob, checkLoop, containerRef, data, endTimeRef, gapTimerRef, hostRef, iframe (+37 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (34): addDays(), buildYearGrid(), CalendarCell, circleColors, [classes, setClasses], currentStreak, data, DayData (+26 more)

### Community 5 - "Community 5"
Cohesion: 0.1
Nodes (29): createSession(), destroySession(), hashPassword(), publicUser(), requireAuth(), SESSION_DAYS, tokenHash(), verifyPassword() (+21 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (26): CardViewToggleProps, containerRef, [open, setOpen], options, containerRef, DifficultyFilterMenuProps, [open, setOpen], OPTIONS (+18 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (25): [errorMessage, setErrorMessage], [isSubmitting, setIsSubmitting], LessonFormData, LessonFormModalProps, [title, setTitle], [videoUrl, setVideoUrl], ModalBackdrop(), ModalBackdropProps (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (24): 에이전트 선택 기준, 병렬 처리 원칙, 발행 예시, 실제 라우팅, 사용 전략, After code changes, Build Commands, code:block1 (study-play/) (+16 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (15): GripIcon(), PencilIcon(), TrashIcon(), [endTime, setEndTime], handleSubmit(), [label, setLabel], [loopGap, setLoopGap], SegmentEditor() (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.1
Nodes (19): FavoriteButton(), FavoriteButtonProps, ArrowLeftIcon(), ChevronLeftIcon(), ChevronRightIcon(), FlipIcon(), FullscreenExitIcon(), FullscreenIcon() (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (21): 빠른 적용 순서, 10. 환경변수 (Secrets), 1. 전송 계층 (Transport), 2. 콘텐츠 보안 (CSP), 3. 비밀번호 정책, 4. 입력 검증 (Input Validation), 5. 데이터베이스 (RLS), 6. 에러 메시지 (Error Sanitization) (+13 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (13): clampRating(), containerRef, DifficultyRatingProps, DifficultyStars(), draggedRef, dragStartedOnValueRef, dragStartValueRef, [dragValue, setDragValue] (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (16): Trash2Icon(), clearAllUserData(), [clearing, setClearing], [currentPassword, setCurrentPassword], [deleteConfirm, setDeleteConfirm], [deleting, setDeleting], handleDeleteAccount(), handleLogout() (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (14): messages, sanitizeError(), validatePassword(), handleChangePassword(), handleSendResetLink(), [checking, setChecking], [confirmPassword, setConfirmPassword], [error, setError] (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (13): AuthContext, AuthState, ApiOptions, AppUser, authApi, supabase, [confirmPassword, setConfirmPassword], [email, setEmail] (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.16
Nodes (9): AppHeader(), navItems, { user }, CalendarIcon(), UserIcon(), Layout(), AuthProvider(), useAuth() (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (13): allRows(), allUsers(), columnDefaults, missingPasswords, mysqlDate(), placeholders, required, supabase() (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.2
Nodes (11): MoonIcon(), SunIcon(), navItems, { theme }, { theme, toggleTheme }, ThemeToggle(), ThemeContext, ThemeContextValue (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.25
Nodes (11): finishStudySession, getSegmentEndTime(), handlePlaybackPaused(), handlePlayPause(), handleProgressKeyDown(), handleProgressPointerDown(), handleProgressPointerMove(), handleSelectSegment() (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (11): clearLoopTimer(), executeLoop(), forceHighQuality(), handler(), pause(), playSegment(), scheduleLoop(), seekTo() (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.2
Nodes (10): [email, setEmail], [error, setError], handleResendConfirmation(), handleSubmit(), [loading, setLoading], navigate, [password, setPassword], { refresh } (+2 more)

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (7): 1. Create the MySQL database, 2. Configure the application, 3. Migrate the Supabase data, code:text (NODE_ENV=production), code:bash (set -a), code:text (SUPABASE_URL=https://project.supabase.co), Hostinger deployment

### Community 24 - "Community 24"
Cohesion: 0.32
Nodes (5): run(), serve_file(), serve_video_file(), start_file_server(), main()

## Knowledge Gaps
- **300 isolated node(s):** `required`, `SESSION_DAYS`, `app`, `port`, `root` (+295 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `Community 2` to `Community 0`, `Community 1`, `Community 4`, `Community 7`, `Community 22`, `Community 25`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `LocalPreviewDb` connect `Community 22` to `Community 1`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `Class` connect `Community 1` to `Community 0`, `Community 2`, `Community 4`, `Community 7`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `required`, `SESSION_DAYS`, `app` to the rest of the system?**
  _300 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._