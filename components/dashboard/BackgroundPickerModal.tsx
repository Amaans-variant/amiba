"use client";

import { useRef, useState } from "react";
import {
  Check,
  Eye,
  ImageIcon,
  Plus,
  RotateCcw,
  Sliders,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  BACKGROUND_PRESETS,
  useBackgroundStore,
} from "@/store/useBackgroundStore";
import { cn } from "@/lib/utils";

interface BackgroundPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackgroundPickerModal({ isOpen, onClose }: BackgroundPickerModalProps) {
  const {
    currentUrl,
    customBackgrounds,
    dimOpacity,
    blurAmount,
    setBackground,
    addCustomBackground,
    removeCustomBackground,
    setDimOpacity,
    setBlurAmount,
    resetDefault,
  } = useBackgroundStore();

  const [inputUrl, setInputUrl] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [urlError, setUrlError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const categories = ["All", "Cozy", "Anime", "Sci-Fi", "Nature"];

  const filteredPresets =
    activeCategory === "All"
      ? BACKGROUND_PRESETS
      : BACKGROUND_PRESETS.filter((p) => p.category === activeCategory);

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputUrl.trim();
    if (!trimmed) return;

    if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("data:image/")) {
      setUrlError("Please enter a valid image URL starting with http:// or https://");
      return;
    }

    setUrlError(null);
    addCustomBackground(trimmed);
    setInputUrl("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUrlError("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result) {
        addCustomBackground(result);
        setUrlError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-glass-border bg-[#0f1118]/95 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-glass-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/30 bg-accent/15 text-accent">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">Background Art & Atmosphere</h2>
              <p className="text-[11px] text-ink-faint">
                Customize your study dashboard wallpaper, mood lighting, and blur.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink-faint transition-colors hover:bg-white/10 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5">
          {/* Controls: Dimming and Blur */}
          <div className="rounded-xl border border-glass-border bg-white/[0.02] p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <Sliders className="h-3.5 w-3.5 text-accent" />
                <span>Atmosphere Adjustments</span>
              </div>
              <button
                type="button"
                onClick={resetDefault}
                className="flex items-center gap-1 text-[10px] text-ink-faint transition-colors hover:text-ink"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                <span>Reset to default</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Dimming Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-ink-soft">Dark Overlay (Readability)</span>
                  <span className="font-mono text-accent">{dimOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="75"
                  value={dimOpacity}
                  onChange={(e) => setDimOpacity(Number(e.target.value))}
                  className="w-full accent-accent h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />
              </div>

              {/* Blur Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-ink-soft">Glass Blur (Depth of Field)</span>
                  <span className="font-mono text-accent">{blurAmount}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={blurAmount}
                  onChange={(e) => setBlurAmount(Number(e.target.value))}
                  className="w-full accent-accent h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Add Custom Art */}
          <div className="rounded-xl border border-glass-border bg-white/[0.02] p-3.5 space-y-2.5">
            <h3 className="text-xs font-semibold text-ink">Add Custom Background Art</h3>

            <form onSubmit={handleAddUrl} className="flex gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  setUrlError(null);
                }}
                placeholder="Paste any image URL (Unsplash, Pinterest, Imgur)..."
                className="glass-input h-8 text-xs flex-1"
              />
              <button
                type="submit"
                className="flex h-8 items-center gap-1 rounded-lg border border-accent/40 bg-accent/90 px-3 text-xs font-semibold text-[#171009] transition-all hover:bg-accent hover:shadow-glow shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add URL</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-8 items-center gap-1 rounded-lg border border-glass-border bg-white/5 px-3 text-xs font-medium text-ink-soft transition-colors hover:border-glass-borderStrong hover:text-ink shrink-0"
              >
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Upload Image</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </form>

            {urlError && <p className="text-[11px] text-danger">{urlError}</p>}

            {/* Custom Backgrounds List */}
            {customBackgrounds.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] text-ink-faint mb-1.5 block">
                  Your Uploaded / Custom Art:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {customBackgrounds.map((url, i) => (
                    <div
                      key={i}
                      className={cn(
                        "group relative aspect-video overflow-hidden rounded-lg border cursor-pointer transition-all",
                        currentUrl === url
                          ? "border-accent ring-2 ring-accent/30 shadow-glow"
                          : "border-glass-border hover:border-glass-borderStrong"
                      )}
                      onClick={() => setBackground(url)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt="Custom background"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      {currentUrl === url && (
                        <div className="absolute top-1 right-1 rounded-full bg-accent p-0.5 text-[#171009]">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCustomBackground(url);
                        }}
                        title="Delete custom art"
                        className="absolute bottom-1 right-1 rounded-md bg-black/75 p-1 text-danger opacity-0 transition-opacity group-hover:opacity-100 hover:bg-danger hover:text-white"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Curated Gallery Presets */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-ink">Curated Atmosphere Presets</h3>

              {/* Category Pills */}
              <div className="flex gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                      activeCategory === cat
                        ? "bg-accent text-[#171009]"
                        : "bg-white/5 text-ink-faint hover:text-ink"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {filteredPresets.map((preset) => {
                const isActive = currentUrl === preset.url;
                return (
                  <div
                    key={preset.id}
                    onClick={() => setBackground(preset.url)}
                    className={cn(
                      "group relative aspect-video overflow-hidden rounded-xl border cursor-pointer transition-all",
                      isActive
                        ? "border-accent ring-2 ring-accent/30 shadow-glow"
                        : "border-glass-border hover:border-accent/40"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preset.thumb}
                      alt={preset.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Active Checkmark */}
                    {isActive && (
                      <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[#171009] shadow-md">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}

                    {/* Preset Info */}
                    <div className="absolute bottom-1.5 left-2 right-2">
                      <span className="text-[11px] font-medium text-white line-clamp-1 group-hover:text-accent transition-colors">
                        {preset.name}
                      </span>
                      <span className="text-[9px] text-white/60 block">
                        {preset.category}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-glass-border px-5 py-3 bg-white/[0.01]">
          <span className="text-[11px] text-ink-faint">
            Changes apply in real time and are saved automatically.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-glass-border bg-white/5 px-4 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-glass-borderStrong hover:bg-white/10"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
