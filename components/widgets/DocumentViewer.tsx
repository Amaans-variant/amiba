"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  Layers,
  ListChecks,
  Loader2,
  Play,
  Repeat,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  Youtube,
} from "lucide-react";
import { WidgetChrome } from "@/components/ui/WidgetChrome";
import { usePdf } from "@/hooks/usePdf";
import { useAIContextStore } from "@/store/useAIContextStore";
import { cn } from "@/lib/utils";
import type { DocTabMode } from "@/types";
import type { SearchResultItem } from "@/app/api/search/route";
import type { YouTubeVideoItem } from "@/app/api/youtube/route";

const TABS: { mode: DocTabMode; label: string; icon: React.ReactNode }[] = [
  { mode: "flashcards", label: "Flash card", icon: <Layers className="h-4 w-4" /> },
  { mode: "quiz", label: "Quiz", icon: <ListChecks className="h-4 w-4" /> },
  { mode: "pyq", label: "PYQ AI", icon: <GraduationCap className="h-4 w-4" /> },
];

const PRESETS = [
  { label: "Wikipedia", url: "https://en.wikipedia.org" },
  { label: "MDN Docs", url: "https://developer.mozilla.org" },
  { label: "LibreTexts", url: "https://libretexts.org" },
  { label: "WolframAlpha", url: "https://www.wolframalpha.com" },
  { label: "YouTube", isYouTube: true },
];

const YT_CATEGORIES = [
  "All",
  "Lo-Fi Beats",
  "Study Music",
  "Calculus",
  "Computer Science",
  "Physics",
  "MIT Lectures",
  "Coding Tutorials",
];

function extractYouTubeDetails(rawUrl: string): {
  type: "video" | "search" | "home";
  videoId?: string;
  query?: string;
} | null {
  try {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      if (rawUrl.includes("youtube.com") || rawUrl.includes("youtu.be")) {
        parsed = new URL(`https://${rawUrl}`);
      } else {
        return null;
      }
    }

    if (!parsed.hostname.includes("youtube.com") && !parsed.hostname.includes("youtu.be")) {
      return null;
    }

    const shortsMatch = parsed.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return { type: "video", videoId: shortsMatch[1] };

    const embedMatch = parsed.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return { type: "video", videoId: embedMatch[1] };

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.slice(1).split("/")[0].split("?")[0];
      if (id.length === 11) return { type: "video", videoId: id };
    }

    const v = parsed.searchParams.get("v");
    if (v && v.length === 11) return { type: "video", videoId: v };

    const q = parsed.searchParams.get("search_query");
    if (q) return { type: "search", query: q };

    return { type: "home" };
  } catch {
    return null;
  }
}

export function DocumentViewer() {
  const { doc, fullText, loading, error, loadFromFile } = usePdf();
  const { pushContext, requestId: activeRequestId } = useAIContextStore();

  const [source, setSource] = useState<"pdf" | "website">("pdf");
  const [fileName, setFileName] = useState<string | null>(null);

  // Browser state
  const [url, setUrl] = useState("");
  const [embeddedUrl, setEmbeddedUrl] = useState<string | null>(null);
  const [displayTitle, setDisplayTitle] = useState<string | null>(null);
  const [useProxy, setUseProxy] = useState(true);
  const [webText, setWebText] = useState<string | null>(null);
  const [webLoading, setWebLoading] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [activeTab, setActiveTab] = useState<DocTabMode | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // View Mode: "home" | "search" | "browse" | "youtube"
  const [viewMode, setViewMode] = useState<"home" | "search" | "browse" | "youtube">("home");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchVideos, setSearchVideos] = useState<YouTubeVideoItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // YouTube Dedicated Full-Site state
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [activeVideoTitle, setActiveVideoTitle] = useState<string | null>(null);
  const [activeVideoChannel, setActiveVideoChannel] = useState<string | null>(null);
  const [activeVideoViews, setActiveVideoViews] = useState<string | null>(null);
  const [ytVideos, setYtVideos] = useState<YouTubeVideoItem[]>([]);
  const [ytQuery, setYtQuery] = useState("lofi study beats");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isYtLoading, setIsYtLoading] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object url on unmount or when it changes
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const onFilePicked = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setActiveTab(null);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(URL.createObjectURL(file));
    await loadFromFile(file);
  };

  const fetchYouTubeVideos = async (q: string) => {
    setIsYtLoading(true);
    try {
      const res = await fetch(`/api/youtube?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setYtVideos(data.videos || []);
      }
    } catch (err) {
      console.error("Failed to fetch YouTube videos:", err);
    } finally {
      setIsYtLoading(false);
    }
  };

  const openYouTubeHub = (query?: string, videoId?: string, videoTitle?: string, videoChannel?: string) => {
    setViewMode("youtube");
    const q = query || "lofi study beats";
    setYtQuery(q);
    setUrl(videoId ? `https://www.youtube.com/watch?v=${videoId}` : "https://www.youtube.com");
    if (videoId) {
      setActiveVideoId(videoId);
      setActiveVideoTitle(videoTitle || "Playing Video");
      setActiveVideoChannel(videoChannel || "YouTube Creator");
    } else {
      setActiveVideoId(null);
      setActiveVideoTitle(null);
      setActiveVideoChannel(null);
    }
    fetchYouTubeVideos(q);
  };

  const playYouTubeVideo = (video: YouTubeVideoItem) => {
    setActiveVideoId(video.videoId);
    setActiveVideoTitle(video.title);
    setActiveVideoChannel(video.channel);
    setActiveVideoViews(video.views);
    setViewMode("youtube");
    setUrl(`https://www.youtube.com/watch?v=${video.videoId}`);
    setWebText(`YouTube Video: "${video.title}" by ${video.channel}. Topics: study, education, lecture notes.`);
  };

  const performSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === "youtube") {
      openYouTubeHub("lofi study beats");
      return;
    }

    setSearchQuery(trimmed);
    setIsSearching(true);
    setSearchError(null);
    setViewMode("search");

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error("Search request failed");
      const data = await res.json();
      setSearchResults(data.results || []);
      setSearchVideos(data.videos || []);
    } catch (err: unknown) {
      console.error("Search error:", err);
      setSearchError("Unable to fetch live search results. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const loadWebsite = (targetUrl: string, title?: string) => {
    const trimmed = targetUrl.trim();
    if (!trimmed) return;

    // Check if target is YouTube
    const ytDetails = extractYouTubeDetails(trimmed);
    if (ytDetails) {
      if (ytDetails.type === "video" && ytDetails.videoId) {
        openYouTubeHub(undefined, ytDetails.videoId, title);
        return;
      }
      if (ytDetails.type === "search" && ytDetails.query) {
        openYouTubeHub(ytDetails.query);
        return;
      }
      openYouTubeHub("lofi study beats");
      return;
    }

    // Normal website browsing
    setUrl(trimmed);
    setEmbeddedUrl(trimmed);
    setDisplayTitle(title || trimmed);
    setViewMode("browse");
    setIframeKey((k) => k + 1);
    setWebLoading(true);
    setWebText(null);

    // Extract text in background for AI study features
    fetch(`/api/proxy?url=${encodeURIComponent(trimmed)}&extractText=true`)
      .then((res) => res.json())
      .then((data) => {
        if (data.text) {
          setWebText(data.text);
        }
      })
      .catch(() => {})
      .finally(() => setWebLoading(false));
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    const ytDetails = extractYouTubeDetails(trimmed);
    if (ytDetails) {
      if (ytDetails.type === "video" && ytDetails.videoId) {
        openYouTubeHub(undefined, ytDetails.videoId);
        return;
      }
      if (ytDetails.type === "search" && ytDetails.query) {
        openYouTubeHub(ytDetails.query);
        return;
      }
      openYouTubeHub();
      return;
    }

    const isDirectUrl =
      /^https?:\/\//i.test(trimmed) ||
      (!trimmed.includes(" ") &&
        /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed));

    if (isDirectUrl) {
      const formatted = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      loadWebsite(formatted);
    } else {
      performSearch(trimmed);
    }
  };

  const handleTab = (mode: DocTabMode) => {
    const textToUse =
      source === "pdf"
        ? fullText
        : viewMode === "youtube"
        ? `YouTube Video: ${activeVideoTitle || "Study Session"} by ${activeVideoChannel || "Educational Channel"}. Detailed study analysis, key concepts, formulas, and flashcard review.`
        : webText;
    if (!textToUse) return;
    setActiveTab(mode);
    const sourceTitle =
      source === "pdf"
        ? fileName ?? "the loaded document"
        : viewMode === "youtube"
        ? activeVideoTitle || "YouTube Video"
        : displayTitle || embeddedUrl || "the loaded website";
    pushContext(mode, textToUse, sourceTitle);
  };

  const availableText =
    source === "pdf" ? fullText : viewMode === "youtube" ? activeVideoTitle || "YouTube" : webText;

  const iframeSrc = embeddedUrl
    ? useProxy
      ? `/api/proxy?url=${encodeURIComponent(embeddedUrl)}`
      : embeddedUrl
    : null;

  return (
    <WidgetChrome
      icon={<FileText className="h-4 w-4" />}
      title="Document viewer"
      subtitle={
        source === "pdf"
          ? fileName ?? "No PDF loaded"
          : viewMode === "youtube"
          ? activeVideoTitle ? `YouTube: ${activeVideoTitle}` : "YouTube"
          : viewMode === "search"
          ? `Search: "${searchQuery}"`
          : displayTitle || embeddedUrl || "Web Browser"
      }
      noPadding
      actions={
        <div className="flex gap-1 rounded-full border border-glass-border bg-white/5 p-0.5">
          <button
            onClick={() => setSource("pdf")}
            className={cn(
              "rounded-full px-2 py-1 text-[11px] font-medium transition-colors",
              source === "pdf" ? "bg-accent text-[#171009]" : "text-ink-soft hover:text-ink"
            )}
          >
            PDF
          </button>
          <button
            onClick={() => setSource("website")}
            className={cn(
              "rounded-full px-2 py-1 text-[11px] font-medium transition-colors",
              source === "website" ? "bg-accent text-[#171009]" : "text-ink-soft hover:text-ink"
            )}
          >
            Website
          </button>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        {/* Context-aware tab bar — AI Flashcard, Quiz, PYQ AI (only shown in PDF document mode) */}
        {source === "pdf" && (
          <div className="flex items-center justify-between border-b border-glass-border px-4 py-2">
            <div className="flex items-center gap-3">
              {TABS.map((tab) => (
                <button
                  key={tab.mode}
                  onClick={() => handleTab(tab.mode)}
                  disabled={!availableText}
                  title={
                    !availableText
                      ? "Load a PDF to generate AI study materials"
                      : tab.label
                  }
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border transition-all",
                    activeTab === tab.mode && activeRequestId > 0
                      ? "border-accent bg-accent/20 text-accent shadow-glow"
                      : "border-glass-border bg-white/5 text-ink-soft hover:border-glass-borderStrong hover:text-ink",
                    !availableText && "cursor-not-allowed opacity-35"
                  )}
                >
                  {tab.icon}
                </button>
              ))}
            </div>
            {fileName && (
              <span className="text-[11px] text-ink-faint truncate max-w-[200px]">
                {fileName}
              </span>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-hidden">
          {source === "pdf" ? (
            <div className="flex h-full flex-col">
              {!doc && !loading && (
                <label className="m-4 flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl2 border border-dashed border-glass-border text-ink-faint transition-colors hover:border-accent/50 hover:text-ink-soft">
                  <Upload className="h-6 w-6" />
                  <span className="text-xs">Click to upload a PDF (syllabus, PYQ paper, notes)</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => onFilePicked(e.target.files?.[0])}
                  />
                </label>
              )}

              {loading && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-ink-faint">
                  <Loader2 className="h-5 w-5 animate-spin text-accent" />
                  <span className="text-xs">Reading {fileName}...</span>
                </div>
              )}

              {error && !loading && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center text-danger">
                  <span className="text-xs">{error}</span>
                </div>
              )}

              {doc && !loading && pdfUrl && (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white/5">
                  <iframe
                    src={`${pdfUrl}#toolbar=0`}
                    className="h-full w-full border-0 rounded-b-xl2 bg-white"
                    title="PDF Viewer"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col">
              {/* Browser Address & Search Bar */}
              <form
                onSubmit={handleInputSubmit}
                className="flex items-center gap-1.5 border-b border-glass-border p-2 bg-white/[0.02]"
              >
                {/* Back to search results or home button */}
                {(viewMode === "browse" || viewMode === "youtube") && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeVideoId) {
                        setActiveVideoId(null);
                      } else if (searchResults.length > 0) {
                        setViewMode("search");
                      } else {
                        setViewMode("home");
                      }
                    }}
                    title={activeVideoId ? "Back to YouTube Feed" : searchResults.length > 0 ? "Back to Search Results" : "Back to Home"}
                    className="flex h-8 items-center gap-1 rounded-lg border border-glass-border bg-white/5 px-2 text-[11px] text-ink-soft transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    <span className="hidden sm:inline">
                      {activeVideoId ? "Feed" : searchResults.length > 0 ? "Results" : "Home"}
                    </span>
                  </button>
                )}

                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Search Google & YouTube (e.g. youtube, lofi beats) or enter URL..."
                    className="glass-input h-8 pl-8 pr-7 text-xs"
                  />
                  {url && (
                    <button
                      type="button"
                      onClick={() => setUrl("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {viewMode === "browse" && (
                  <button
                    type="button"
                    onClick={() => setUseProxy((p) => !p)}
                    title={
                      useProxy
                        ? "Proxy active: bypasses iframe blockers (click to disable)"
                        : "Direct embed active (click to use proxy)"
                    }
                    className={cn(
                      "flex h-8 items-center gap-1 rounded-lg border px-2 text-[10px] transition-colors",
                      useProxy
                        ? "border-accent/30 bg-accent/15 text-accent"
                        : "border-glass-border bg-white/5 text-ink-faint hover:text-ink"
                    )}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    <span className="hidden sm:inline">{useProxy ? "Proxy" : "Direct"}</span>
                  </button>
                )}

                {viewMode === "browse" && embeddedUrl && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIframeKey((k) => k + 1)}
                      title="Reload page"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-glass-border bg-white/5 text-ink-soft transition-colors hover:border-accent/40 hover:text-ink"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={url || embeddedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in new tab"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-glass-border bg-white/5 text-ink-soft transition-colors hover:border-accent/40 hover:text-ink"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </>
                )}

                <button
                  type="submit"
                  disabled={isSearching}
                  className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-glass-border bg-accent/90 px-3 text-xs font-semibold text-[#171009] transition-all hover:bg-accent hover:shadow-glow disabled:opacity-50"
                >
                  {isSearching ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span>Search</span>
                  )}
                </button>
              </form>

              {/* VIEW 1: Complete In-Widget YouTube Experience */}
              {viewMode === "youtube" ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar bg-[#0f0f0f]">
                  {/* YouTube In-Widget Header & Search */}
                  <div className="sticky top-0 z-20 flex flex-col gap-2 border-b border-white/10 bg-[#0f0f0f]/95 p-3 backdrop-blur-md">
                    <div className="flex items-center justify-between gap-3">
                      {/* YouTube Brand Logo */}
                      <div
                        onClick={() => {
                          setActiveVideoId(null);
                          fetchYouTubeVideos("lofi study beats");
                        }}
                        className="flex cursor-pointer items-center gap-1.5 select-none"
                      >
                        <div className="flex h-6 w-8 items-center justify-center rounded-md bg-red-600 text-white shadow-md">
                          <Play className="h-3.5 w-3.5 fill-white ml-0.5" />
                        </div>
                        <span className="font-display font-bold tracking-tight text-sm text-white">
                          YouTube
                        </span>
                      </div>

                      {/* Search Bar */}
                      <div className="flex flex-1 max-w-sm items-center gap-1.5">
                        <div className="relative flex-1">
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/50" />
                          <input
                            type="text"
                            value={ytQuery}
                            onChange={(e) => setYtQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                fetchYouTubeVideos(ytQuery);
                              }
                            }}
                            placeholder="Search YouTube..."
                            className="h-7 w-full rounded-full border border-white/20 bg-white/5 pl-7 pr-3 text-xs text-white placeholder-white/40 focus:border-red-500 focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => fetchYouTubeVideos(ytQuery)}
                          disabled={isYtLoading}
                          className="flex h-7 items-center rounded-full bg-white/10 px-3 text-xs font-medium text-white transition-colors hover:bg-white/20"
                        >
                          {isYtLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin text-white" />
                          ) : (
                            <span>Search</span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* YouTube Category Filter Chips */}
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
                      {YT_CATEGORIES.map((category) => {
                        const isCatActive =
                          category === "All"
                            ? activeCategory === "All"
                            : ytQuery === category || activeCategory === category;
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => {
                              setActiveCategory(category);
                              const q = category === "All" ? "lofi study beats" : category;
                              setYtQuery(q);
                              fetchYouTubeVideos(q);
                            }}
                            className={cn(
                              "shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                              isCatActive
                                ? "bg-white text-black"
                                : "bg-white/10 text-white/80 hover:bg-white/15 hover:text-white"
                            )}
                          >
                            {category}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3 space-y-4">
                    {/* Active Video Player Stage */}
                    {activeVideoId && (
                      <div className="overflow-hidden rounded-xl border border-white/15 bg-black shadow-2xl">
                        <div className="aspect-video w-full">
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&rel=0${isLooping ? `&loop=1&playlist=${activeVideoId}` : ""}`}
                            title={activeVideoTitle || "YouTube Player"}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="h-full w-full border-0"
                          />
                        </div>

                        {/* Player Meta & Controls */}
                        <div className="p-3 bg-[#181818]">
                          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                            {activeVideoTitle || "Now Playing"}
                          </h3>

                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                                {(activeVideoChannel || "Y")[0].toUpperCase()}
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-white block">
                                  {activeVideoChannel || "YouTube Creator"}
                                </span>
                                {activeVideoViews && (
                                  <span className="text-[10px] text-white/60">
                                    {activeVideoViews}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* In-Widget Action Buttons */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setIsLooping(!isLooping)}
                                className={cn(
                                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                                  isLooping
                                    ? "bg-red-600 text-white"
                                    : "bg-white/10 text-white/80 hover:bg-white/20"
                                )}
                                title={isLooping ? "Loop is ON" : "Loop this video"}
                              >
                                <Repeat className="h-3 w-3" />
                                <span>{isLooping ? "Looping" : "Loop"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleTab("flashcards")}
                                className="flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-[11px] font-medium text-accent hover:bg-accent hover:text-[#171009] transition-colors"
                                title="Generate AI Study Flashcards for this video"
                              >
                                <Sparkles className="h-3 w-3" />
                                <span>AI Flashcards</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setActiveVideoId(null)}
                                className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80 hover:bg-white/20 transition-colors"
                              >
                                Back to Feed
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Feed Section Title */}
                    <div className="flex items-center justify-between text-xs text-white/70">
                      <span className="font-semibold text-white">
                        {activeVideoId ? "Up Next & Recommended" : `Explore: ${ytQuery}`}
                      </span>
                      {isYtLoading && (
                        <span className="flex items-center gap-1 text-[11px] text-accent">
                          <Loader2 className="h-3 w-3 animate-spin" /> Loading videos...
                        </span>
                      )}
                    </div>

                    {/* YouTube Video Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ytVideos.map((video) => (
                        <div
                          key={video.videoId}
                          onClick={() => playYouTubeVideo(video)}
                          className={cn(
                            "group cursor-pointer overflow-hidden rounded-xl border p-2 transition-all hover:border-white/30 hover:bg-white/[0.06]",
                            activeVideoId === video.videoId
                              ? "border-red-500/50 bg-red-500/10"
                              : "border-white/10 bg-[#161616]"
                          )}
                        >
                          {/* Thumbnail */}
                          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black/60">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                            {/* Duration Badge */}
                            {video.duration && (
                              <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.2 text-[9px] font-mono font-medium text-white">
                                {video.duration}
                              </span>
                            )}
                            {/* Play Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white shadow-xl">
                                <Play className="h-4 w-4 fill-current ml-0.5" />
                              </div>
                            </div>
                          </div>

                          {/* Info */}
                          <div className="mt-2">
                            <h5 className="text-xs font-semibold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                              {video.title}
                            </h5>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-white/60">
                              <span className="truncate max-w-[130px] font-medium">
                                {video.channel}
                              </span>
                              {video.views && <span>{video.views}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : viewMode === "browse" && embeddedUrl && iframeSrc ? (
                /* VIEW 2: Normal Website Browser (Proxied) */
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
                  {webLoading && (
                    <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-[#12141a]/85 px-2.5 py-1 text-[10px] text-accent backdrop-blur-md">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Extracting for AI...</span>
                    </div>
                  )}
                  <iframe
                    key={iframeKey}
                    src={iframeSrc}
                    className="h-full w-full border-0"
                    title={displayTitle || "Embedded website"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
                  />
                </div>
              ) : viewMode === "search" ? (
                /* VIEW 3: Google / YouTube Search Results Page */
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 custom-scrollbar">
                  {/* Results Header */}
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-glass-border pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-ink">
                          Results for &ldquo;<span className="text-accent">{searchQuery}</span>&rdquo;
                        </h3>
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-ink-faint">
                          {searchResults.length} results
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-ink-faint">
                        Click any result to open it directly inside the viewer.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openYouTubeHub(searchQuery)}
                      className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20"
                    >
                      <Youtube className="h-3.5 w-3.5 text-red-500" />
                      <span>YouTube</span>
                    </button>
                  </div>

                  {/* Loading State */}
                  {isSearching && (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-ink-faint">
                      <Loader2 className="h-6 w-6 animate-spin text-accent" />
                      <span className="text-xs">Searching web for &ldquo;{searchQuery}&rdquo;...</span>
                    </div>
                  )}

                  {/* Error State */}
                  {searchError && !isSearching && (
                    <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                      {searchError}
                    </div>
                  )}

                  {/* Videos from YouTube (Google Style Video Results Carousel) */}
                  {!isSearching && searchVideos.length > 0 && (
                    <div className="mb-4 rounded-xl border border-glass-border bg-white/[0.02] p-3">
                      <div className="mb-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                          <Youtube className="h-4 w-4 text-red-500" />
                          <span>Videos</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openYouTubeHub(searchQuery)}
                          className="text-[10px] text-accent hover:underline"
                        >
                          View all on YouTube →
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {searchVideos.slice(0, 4).map((video) => (
                          <div
                            key={video.videoId}
                            onClick={() => playYouTubeVideo(video)}
                            className="group flex cursor-pointer gap-2 rounded-lg border border-glass-border bg-white/[0.02] p-1.5 transition-all hover:border-accent/40 hover:bg-white/[0.05]"
                          >
                            <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded bg-black/40">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="h-full w-full object-cover"
                              />
                              {video.duration && (
                                <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[8px] text-white">
                                  {video.duration}
                                </span>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100">
                                <Play className="h-3 w-3 fill-white text-white" />
                              </div>
                            </div>
                            <div className="flex flex-col justify-between overflow-hidden">
                              <h5 className="text-[10px] font-medium text-ink line-clamp-2 leading-tight group-hover:text-accent">
                                {video.title}
                              </h5>
                              <span className="text-[9px] text-ink-faint truncate">
                                {video.channel}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Web Search Results List */}
                  {!isSearching && searchResults.length > 0 && (
                    <div className="flex flex-col gap-3">
                      {searchResults.map((item, idx) => (
                        <div
                          key={idx}
                          className="group relative rounded-xl border border-glass-border bg-white/[0.02] p-3 transition-all hover:border-accent/40 hover:bg-white/[0.04]"
                        >
                          {/* Site badge & URL breadcrumb */}
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 overflow-hidden text-[11px] text-ink-faint">
                              {item.icon ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.icon}
                                  alt=""
                                  className="h-3.5 w-3.5 shrink-0 rounded-sm object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <Globe className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                              )}
                              <span className="truncate max-w-[220px] font-mono text-[10px]">
                                {item.displayUrl}
                              </span>
                            </div>

                            {item.isYouTube && (
                              <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-semibold text-red-400 border border-red-500/20">
                                <Play className="h-2.5 w-2.5 fill-current" />
                                YouTube
                              </span>
                            )}
                          </div>

                          {/* Result Title */}
                          <h4
                            onClick={() => {
                              if (item.isYouTube) {
                                if (item.videoId) {
                                  openYouTubeHub(undefined, item.videoId, item.title);
                                } else {
                                  openYouTubeHub(searchQuery);
                                }
                              } else {
                                loadWebsite(item.url, item.title);
                              }
                            }}
                            className="cursor-pointer text-xs font-semibold text-accent transition-colors hover:underline group-hover:text-accentStrong"
                          >
                            {item.title}
                          </h4>

                          {/* Snippet */}
                          {item.snippet && (
                            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-soft">
                              {item.snippet}
                            </p>
                          )}

                          {/* Action Buttons */}
                          <div className="mt-2.5 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.isYouTube) {
                                  if (item.videoId) {
                                    openYouTubeHub(undefined, item.videoId, item.title);
                                  } else {
                                    openYouTubeHub(searchQuery);
                                  }
                                } else {
                                  loadWebsite(item.url, item.title);
                                }
                              }}
                              className="flex items-center gap-1 rounded-md bg-accent/15 px-2 py-1 text-[10px] font-medium text-accent transition-colors hover:bg-accent hover:text-[#171009]"
                            >
                              <span>
                                {item.isYouTube ? "Play in YouTube" : "Open in Viewer"}
                              </span>
                            </button>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[10px] text-ink-faint transition-colors hover:bg-white/10 hover:text-ink"
                            >
                              <span>New Tab</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {!isSearching && searchResults.length === 0 && !searchError && (
                    <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                      <p className="text-xs text-ink-faint">
                        No results found for &ldquo;{searchQuery}&rdquo;.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* VIEW 4: Home / Initial Empty State */
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-glass-border bg-white/5 text-accent shadow-glow">
                    <Globe className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-ink">Web & Video Study Hub</h3>
                    <p className="mt-1 max-w-xs text-[11px] text-ink-faint leading-relaxed">
                      Search Google & YouTube, watch study lectures, or browse educational websites with AI tools.
                    </p>
                  </div>

                  {/* Preset Bookmarks */}
                  <div className="mt-2 flex flex-wrap justify-center gap-1.5 max-w-sm">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          if (preset.isYouTube) {
                            openYouTubeHub("lofi study beats");
                          } else if (preset.url) {
                            loadWebsite(preset.url, preset.label);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] transition-colors",
                          preset.isYouTube
                            ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            : "border-glass-border bg-white/5 text-ink-soft hover:border-accent/40 hover:bg-white/10 hover:text-accent"
                        )}
                      >
                        {preset.isYouTube && <Youtube className="h-3 w-3 text-red-500" />}
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </WidgetChrome>
  );
}
