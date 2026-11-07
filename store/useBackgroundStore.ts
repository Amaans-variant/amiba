import { create } from "zustand";

export interface BackgroundPreset {
  id: string;
  name: string;
  category: "Cozy" | "Anime" | "Sci-Fi" | "Nature" | "Minimal";
  url: string;
  thumb: string;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: "scandinavian-studio",
    name: "Warm Interior Studio",
    category: "Cozy",
    url: "https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2500&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "lofi-study-room",
    name: "Lo-Fi Anime Study Room",
    category: "Anime",
    url: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=2500&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "neon-cyberpunk",
    name: "Neon Cyberpunk Alley",
    category: "Sci-Fi",
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=2500&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "rainy-coffee-shop",
    name: "Rainy Coffee Shop Window",
    category: "Cozy",
    url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=2500&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "deep-galaxy",
    name: "Cosmic Nebula & Stars",
    category: "Sci-Fi",
    url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2500&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "mountain-mist",
    name: "Misty Mountain Peaks",
    category: "Nature",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2500&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "library-books",
    name: "Midnight Classic Library",
    category: "Cozy",
    url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=2500&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "minimal-dark-forest",
    name: "Foggy Pine Forest",
    category: "Nature",
    url: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2500&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "tokyo-night",
    name: "Tokyo Shinjuku Twilight",
    category: "Sci-Fi",
    url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=2500&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "autumn-path",
    name: "Golden Autumn Path",
    category: "Nature",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2500&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&auto=format&fit=crop",
  },
];

interface BackgroundStoreState {
  currentUrl: string;
  customBackgrounds: string[];
  dimOpacity: number; // 0 to 80%
  blurAmount: number; // 0 to 10px
  hydrated: boolean;
  hydrate: () => void;
  setBackground: (url: string) => void;
  addCustomBackground: (url: string) => void;
  removeCustomBackground: (url: string) => void;
  setDimOpacity: (opacity: number) => void;
  setBlurAmount: (blur: number) => void;
  resetDefault: () => void;
}

const STORAGE_KEY = "study_dashboard_background_v1";

export const useBackgroundStore = create<BackgroundStoreState>((set, get) => ({
  currentUrl: BACKGROUND_PRESETS[0].url,
  customBackgrounds: [],
  dimOpacity: 25,
  blurAmount: 0,
  hydrated: false,

  hydrate: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          currentUrl: parsed.currentUrl || BACKGROUND_PRESETS[0].url,
          customBackgrounds: Array.isArray(parsed.customBackgrounds) ? parsed.customBackgrounds : [],
          dimOpacity: typeof parsed.dimOpacity === "number" ? parsed.dimOpacity : 25,
          blurAmount: typeof parsed.blurAmount === "number" ? parsed.blurAmount : 0,
          hydrated: true,
        });
        return;
      }
    } catch (e) {
      console.error("Failed to hydrate background store:", e);
    }
    set({ hydrated: true });
  },

  setBackground: (url: string) => {
    set({ currentUrl: url });
    persistStore({ ...get(), currentUrl: url });
  },

  addCustomBackground: (url: string) => {
    const list = get().customBackgrounds;
    if (!list.includes(url)) {
      const updated = [url, ...list];
      set({ customBackgrounds: updated, currentUrl: url });
      persistStore({ ...get(), customBackgrounds: updated, currentUrl: url });
    } else {
      set({ currentUrl: url });
      persistStore({ ...get(), currentUrl: url });
    }
  },

  removeCustomBackground: (url: string) => {
    const updated = get().customBackgrounds.filter((u) => u !== url);
    const newCurrent = get().currentUrl === url ? BACKGROUND_PRESETS[0].url : get().currentUrl;
    set({ customBackgrounds: updated, currentUrl: newCurrent });
    persistStore({ ...get(), customBackgrounds: updated, currentUrl: newCurrent });
  },

  setDimOpacity: (opacity: number) => {
    set({ dimOpacity: opacity });
    persistStore({ ...get(), dimOpacity: opacity });
  },

  setBlurAmount: (blur: number) => {
    set({ blurAmount: blur });
    persistStore({ ...get(), blurAmount: blur });
  },

  resetDefault: () => {
    const defaultUrl = BACKGROUND_PRESETS[0].url;
    set({ currentUrl: defaultUrl, dimOpacity: 25, blurAmount: 0 });
    persistStore({ ...get(), currentUrl: defaultUrl, dimOpacity: 25, blurAmount: 0 });
  },
}));

function persistStore(state: BackgroundStoreState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentUrl: state.currentUrl,
        customBackgrounds: state.customBackgrounds,
        dimOpacity: state.dimOpacity,
        blurAmount: state.blurAmount,
      })
    );
  } catch (e) {
    console.error("Failed to persist background store:", e);
  }
}
