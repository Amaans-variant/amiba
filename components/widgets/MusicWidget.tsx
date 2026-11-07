"use client";

import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Maximize2, Music2, Pause, Play, SkipForward, X } from "lucide-react";
import { WidgetChrome } from "@/components/ui/WidgetChrome";
import { GlassButton } from "@/components/ui/GlassButton";

// Minimal shape of the bits of the YouTube IFrame Player API this widget
// actually touches — the full official types live in the (optional,
// not installed here) @types/youtube package. Declaring just what we use
// keeps the dependency list small.
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  nextVideo(): void;
  loadVideoById(id: string): void;
  loadPlaylist(opts: { list: string }): void;
  getVideoData(): { title?: string; author?: string };
  destroy(): void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      height: string;
      width: string;
      videoId?: string;
      playerVars?: Record<string, number | string>;
      events: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
      };
    }
  ) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Pulls a video or playlist id out of a pasted YouTube URL, or passes a bare id through. */
function parseYouTubeInput(input: string): { videoId?: string; playlistId?: string } {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const list = url.searchParams.get("list");
    const v = url.searchParams.get("v");
    if (url.hostname.includes("youtu.be")) {
      return { videoId: url.pathname.slice(1) || undefined, playlistId: list ?? undefined };
    }
    if (v || list) return { videoId: v ?? undefined, playlistId: list ?? undefined };
  } catch {
    // Not a URL — treat the raw string as an id (11-char video ids are typical).
  }
  return { videoId: trimmed || undefined };
}

export function MusicWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const expandedContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  const [scriptReady, setScriptReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [current, setCurrent] = useState<{ videoId?: string; playlistId?: string } | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => setMounted(true), []);

  // Load the IFrame API script once.
  useEffect(() => {
    if (window.YT?.Player) {
      setScriptReady(true);
      return;
    }
    const existing = document.getElementById("youtube-iframe-api");
    if (!existing) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
    window.onYouTubeIframeAPIReady = () => setScriptReady(true);
  }, []);

  // (Re)create the player whenever the API is ready, a track is chosen, or
  // the widget flips between compact <-> expanded (the target DOM node
  // changes, so the player has to be rebuilt against the node that's
  // actually mounted right now).
  useEffect(() => {
    if (!scriptReady || !current || !window.YT) return;
    const target = expanded ? expandedContainerRef.current : containerRef.current;
    if (!target) return;

    playerRef.current?.destroy();
    playerRef.current = new window.YT.Player(target, {
      height: "100%",
      width: "100%",
      videoId: current.playlistId ? undefined : current.videoId,
      playerVars: {
        autoplay: 1,
        controls: expanded ? 1 : 0,
        ...(current.playlistId ? { listType: "playlist", list: current.playlistId } : {}),
      },
      events: {
        onReady: () => {
          const data = playerRef.current?.getVideoData();
          if (data?.title) setNowPlaying(data.title);
        },
        onStateChange: (e) => {
          setIsPlaying(e.data === window.YT!.PlayerState.PLAYING);
          const data = playerRef.current?.getVideoData();
          if (data?.title) setNowPlaying(data.title);
        },
      },
    });

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady, current, expanded]);

  const loadInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setCurrent(parseYouTubeInput(urlInput));
    setUrlInput("");
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    isPlaying ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
  };

  const skip = () => playerRef.current?.nextVideo();

  const renderContent = (isExpanded: boolean) => (
    <WidgetChrome
      icon={<Music2 className="h-4 w-4" />}
      title="Music"
      subtitle={nowPlaying ?? (current ? "Loading..." : "Nothing loaded")}
      noPadding
      actions={
        isExpanded ? (
          <button
            onClick={() => setExpanded(false)}
            className="rounded-md p-1.5 text-ink-soft transition-colors hover:bg-white/10 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          current && (
            <button
              onClick={() => setExpanded(true)}
              className="rounded-md p-1.5 text-ink-soft transition-colors hover:bg-white/10 hover:text-ink"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )
        )
      }
    >
      <div className="flex h-full flex-col">
        {!current ? (
          <form onSubmit={loadInput} className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <Music2 className="h-5 w-5 text-ink-faint" />
            <p className="text-[11px] text-ink-faint">Paste a YouTube video or playlist link</p>
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="glass-input text-xs"
            />
            <GlassButton type="submit" size="sm" variant="primary">
              Load
            </GlassButton>
          </form>
        ) : (
          <div className="flex h-full flex-col">
            <div className={isExpanded ? "min-h-0 flex-1 bg-black" : "hidden"}>
              <div ref={expandedContainerRef} className="h-full w-full" />
            </div>
            {!isExpanded && <div ref={containerRef} className="hidden" />}
            <div className="flex items-center justify-center gap-3 p-3">
              <button
                onClick={togglePlay}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-glass-border bg-white/5 text-ink transition-colors hover:border-accent/50 hover:text-accent"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
              </button>
              <button
                onClick={skip}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-glass-border bg-white/5 text-ink-soft transition-colors hover:text-ink"
              >
                <SkipForward className="h-3.5 w-3.5" />
              </button>
            </div>
            {isExpanded && (
              <form onSubmit={loadInput} className="flex gap-2 border-t border-glass-border p-3">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Load a different link..."
                  className="glass-input text-xs"
                />
                <GlassButton type="submit" size="sm">
                  Load
                </GlassButton>
              </form>
            )}
          </div>
        )}
      </div>
    </WidgetChrome>
  );

  return (
    <>
      <div className="h-full">
        {!expanded ? (
          <motion.div layoutId="music-widget-card" className="h-full">
            {renderContent(false)}
          </motion.div>
        ) : (
          <div className="glass-panel flex h-full flex-col items-center justify-center gap-2 text-ink-faint">
            <Music2 className="h-5 w-5" />
            <button
              onClick={() => setExpanded(false)}
              className="text-xs underline underline-offset-2 hover:text-ink-soft"
            >
              Bring back
            </button>
          </div>
        )}
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {expanded && (
              <motion.div
                key="music-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setExpanded(false)}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
              >
                <motion.div
                  layoutId="music-widget-card"
                  onClick={(e) => e.stopPropagation()}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="glass-panel-strong h-[min(560px,85vh)] w-full max-w-xl overflow-hidden"
                >
                  {renderContent(true)}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
