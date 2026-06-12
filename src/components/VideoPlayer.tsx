import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { VideoType } from "../types";

interface VideoPlayerProps {
  videoType: VideoType;
  videoUrl: string;
  startTime: number;
  endTime: number;
  loopGap: number;
  isPlaying: boolean;
  speed: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  segmentKey?: number;
  playCommand?: number;
  pauseCommand?: number;
}

export interface VideoPlayerHandle {
  playSegment: (start: number, end: number, gap: number) => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

const YOUTUBE_WIDGET_REFERRER = window.location.origin;

function getYoutubeOrigin(): string | null {
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    return window.location.origin;
  }
  return null;
}

function buildYoutubeEmbedSrc(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: "0",
    controls: "0",
    disablekb: "1",
    enablejsapi: "1",
    fs: "0",
    iv_load_policy: "3",
    modestbranding: "1",
    rel: "0",
    showinfo: "0",
    playsinline: "1",
    widget_referrer: YOUTUBE_WIDGET_REFERRER,
  });
  const origin = getYoutubeOrigin();
  if (origin) params.set("origin", origin);
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

let apiReady = false;
let apiPromise: Promise<void> | null = null;

function loadYTAPI(): Promise<void> {
  if (window.YT?.Player) {
    apiReady = true;
    return Promise.resolve();
  }
  if (apiReady) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>((resolve) => {
    const markReady = () => {
      apiReady = true;
      resolve();
    };

    window.onYouTubeIframeAPIReady = () => {
      markReady();
    };

    if (document.getElementById("yt-api-script")) {
      const timer = window.setInterval(() => {
        if (window.YT?.Player) {
          window.clearInterval(timer);
          markReady();
        }
      }, 50);
      return;
    }

    const s = document.createElement("script");
    s.id = "yt-api-script";
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => {
      apiPromise = null;
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setPlaybackRate: (rate: number) => void;
  destroy: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (elementId: string, cfg: Record<string, unknown>) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer({
  videoType,
  videoUrl,
  startTime,
  endTime,
  loopGap,
  isPlaying,
  speed,
  rotation,
  flipH,
  flipV,
  onTimeUpdate,
  segmentKey,
  playCommand,
  pauseCommand,
}: VideoPlayerProps, ref) {
  const shellRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const gapTimerRef = useRef<number | null>(null);
  const loopTimerRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const speedRef = useRef(speed);
  const startTimeRef = useRef(startTime);
  const endTimeRef = useRef(endTime);
  const loopGapRef = useRef(loopGap);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const lastKnownTimeRef = useRef(0);
  const [rotatedFitScale, setRotatedFitScale] = useState(1);

  isPlayingRef.current = isPlaying;
  speedRef.current = speed;
  startTimeRef.current = startTime;
  endTimeRef.current = endTime;
  loopGapRef.current = loopGap;
  onTimeUpdateRef.current = onTimeUpdate;

  const videoId = videoType === "youtube" ? extractYoutubeId(videoUrl) : null;

  function clearLoopTimer() {
    if (loopTimerRef.current !== null) {
      clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }
  }

  function scheduleLoop() {
    clearLoopTimer();
    const et = endTimeRef.current;
    const st = startTimeRef.current;
    if (!(et > 0 && st < et)) return;
    const remaining = (et - lastKnownTimeRef.current) / speedRef.current;
    if (remaining <= 0) { executeLoop(); return; }
    loopTimerRef.current = window.setTimeout(executeLoop, Math.max(remaining, 0.1) * 1000);
  }

  function executeLoop() {
    const st = startTimeRef.current;
    const gap = loopGapRef.current;
    const p = playerRef.current;
    if (!p) return;
    p.seekTo(st, true);
    if (gap > 0) {
      if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
      gapTimerRef.current = window.setTimeout(() => {
        if (isPlayingRef.current) {
          lastKnownTimeRef.current = st;
          p.playVideo();
          scheduleLoop();
        }
      }, gap * 1000);
    } else {
      lastKnownTimeRef.current = st;
      p.playVideo();
      scheduleLoop();
    }
  }

  function startPolling() {
    stopPolling();
    const poll = () => {
      if (!playerRef.current) return;
      try {
        const ct = playerRef.current.getCurrentTime();
        lastKnownTimeRef.current = ct;
        onTimeUpdateRef.current?.(ct);
      } catch {}
    };
    poll();
    pollTimerRef.current = window.setInterval(poll, 200);
  }

  function stopPolling() {
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  useImperativeHandle(ref, () => ({
    playSegment(start, end, gap) {
      startTimeRef.current = start;
      endTimeRef.current = end;
      loopGapRef.current = gap;
      lastKnownTimeRef.current = start;
      const p = playerRef.current;
      if (!p || videoType !== "youtube") return;
      if (start > 0) p.seekTo(start, true);
      p.playVideo();
      scheduleLoop();
      startPolling();
    },
    pause() {
      const p = playerRef.current;
      if (!p || videoType !== "youtube") return;
      p.pauseVideo();
      clearLoopTimer();
      if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
    },
    seekTo(seconds) {
      const p = playerRef.current;
      if (!p || videoType !== "youtube") return;
      const clampedSeconds = Math.max(0, seconds);
      p.seekTo(clampedSeconds, true);
      lastKnownTimeRef.current = clampedSeconds;
      onTimeUpdateRef.current?.(clampedSeconds);
      if (isPlayingRef.current) {
        clearLoopTimer();
        if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
        scheduleLoop();
      }
    },
  }));

  useEffect(() => {
    if (videoType !== "youtube" || !videoId) return;
    const host = hostRef.current;
    if (!host) return;

    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    stopPolling();
    clearLoopTimer();

    const iframeId = "yt-player-" + Math.random().toString(36).slice(2, 8);
    host.replaceChildren();
    const iframe = document.createElement("iframe");
    iframe.id = iframeId;
    iframe.title = "YouTube video player";
    iframe.src = buildYoutubeEmbedSrc(videoId);
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    host.appendChild(iframe);

    loadYTAPI().then(() => {
      if (!hostRef.current || !window.YT) return;
      try {
        const player = new window.YT.Player(iframeId, {
          events: {
            onReady: () => {
              playerRef.current = player;
              try { player.setPlaybackRate(speedRef.current); } catch {}
              if (isPlayingRef.current) {
                if (startTimeRef.current > 0) player.seekTo(startTimeRef.current, true);
                player.playVideo();
                startPolling();
                scheduleLoop();
              }
            },
            onStateChange: (e: Record<string, unknown>) => {
              const state = e.data as number;
              if (state === (window.YT?.PlayerState.PLAYING ?? 1)) {
                startPolling();
              } else {
                stopPolling();
                if (state === (window.YT?.PlayerState.ENDED ?? 0)) {
                  if (isPlayingRef.current) {
                    player.seekTo(startTimeRef.current, true);
                    player.playVideo();
                  }
                }
              }
            },
          },
        });
      } catch {}
    });

    return () => {
      stopPolling();
      clearLoopTimer();
      if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      host.replaceChildren();
    };
  }, [videoType, videoId]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p || videoType !== "youtube") return;
    if (isPlaying) {
      lastKnownTimeRef.current = startTime;
      if (startTime > 0) p.seekTo(startTime, true);
      p.playVideo();
      scheduleLoop();
      startPolling();
    } else {
      p.pauseVideo();
      clearLoopTimer();
      if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
    }
  }, [isPlaying]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p || videoType !== "youtube" || !playCommand) return;
    lastKnownTimeRef.current = startTime;
    if (startTime > 0) p.seekTo(startTime, true);
    p.playVideo();
    scheduleLoop();
    startPolling();
  }, [playCommand]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p || videoType !== "youtube" || !pauseCommand) return;
    p.pauseVideo();
    clearLoopTimer();
    if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
  }, [pauseCommand]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p || videoType !== "youtube" || !isPlaying) return;
    if (!(endTime > 0 && startTime < endTime)) return;
    clearLoopTimer();
    if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
    lastKnownTimeRef.current = startTime;
    p.seekTo(startTime, true);
    scheduleLoop();
  }, [segmentKey]);

  useEffect(() => {
    if (!playerRef.current || videoType !== "youtube") return;
    try { playerRef.current.setPlaybackRate(speed); } catch {}
    if (isPlaying && endTime > 0 && startTime < endTime) scheduleLoop();
  }, [speed]);

  useEffect(() => {
    return () => {
      stopPolling();
      clearLoopTimer();
      if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const updateScale = () => {
      const { width, height } = shell.getBoundingClientRect();
      if (width <= 0 || height <= 0) {
        setRotatedFitScale(1);
        return;
      }
      setRotatedFitScale(Math.min(width / height, height / width));
    };

    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(shell);
    return () => resizeObserver.disconnect();
  }, []);

  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const isQuarterTurn = normalizedRotation === 90 || normalizedRotation === 270;
  const transformStyle: React.CSSProperties = {
    transform: `rotate(${rotation}deg) scale(${isQuarterTurn ? rotatedFitScale : 1}) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
    transformOrigin: "center",
    transition: "transform 0.3s ease",
  };

  return (
    <div ref={shellRef} className="relative h-full w-full overflow-hidden bg-black">
      <div className="w-full h-full" style={transformStyle}>
        {videoType === "youtube" && videoId ? (
          <div ref={hostRef} className="w-full h-full" />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-sm" style={{ color: "#666" }}>
            No video
          </div>
        )}
      </div>
      {videoType === "youtube" && videoId && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black to-transparent" />
        </>
      )}
    </div>
  );
});
