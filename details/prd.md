# Product Requirements Document (PRD) — Study Dashboard

## 1. Executive Summary & Vision

**Product Name:** Study Dashboard  
**Status:** In Active Development / Production-Ready Alpha  
**Target Platform:** Web (Desktop First, Mobile Adaptive)  

### Vision
Study Dashboard is a spatial, frosted-glass productivity cockpit engineered for intense, focused study sessions. It unifies all critical student and knowledge-worker workflows—time boxing, task tracking, AI-powered document comprehension, peer accountability calling, ambient audio, and atmosphere customization—into a single persistent, customizable canvas.

---

## 2. Problem Statement & User Personas

### 2.1 The Problem
- **Context Switching Tax:** Students and developers constantly juggle separate browser tabs for Pomodoro timers, PDF syllabus/notes viewers, AI chat tools (ChatGPT/Gemini), Spotify/YouTube for lo-fi beats, and Discord/Google Meet for study groups.
- **Cognitive Clutter:** Generic productivity tools are either rigid (opinionated column layouts) or overwhelmingly complex (Notion databases).
- **Distraction Loops:** Opening YouTube or full web browsers during study sessions frequently derails focus through algorithmic recommendations and ads.
- **Fragile Setup:** Traditional web extensions and widgets often break, lack synchronized state across devices, or require expensive subscription tiers.

### 2.2 Target Personas
1. **University & College Students:** Preparing for competitive exams (e.g., engineering, medical, civil services) needing syllabus analysis, Previous Year Question (PYQ) breakdowns, and accountability study rooms.
2. **Self-Directed Learners & Bootcampers:** Learning software engineering, data science, or mathematics requiring documentation browsing, inline lectures, and AI flashcards.
3. **Deep Work Professionals:** Knowledge workers requiring an aesthetic, distraction-free spatial cockpit with synthesized ambient focus audio.

---

## 3. Product Goals & Success Metrics

### 3.1 Business & Product Goals
- Provide a zero-cost, enterprise-grade study sanctuary utilizing robust free-tier architectures (Supabase + Google Gemini API).
- Deliver 100% client-side persistence with real-time cloud sync for layout and widgets.
- Enable zero-friction collaborative study via serverless WebRTC peer rooms.

### 3.2 Key Performance Indicators (KPIs)
- **Focus Session Duration:** Average time spent in active Pomodoro focus mode (> 45 min/day).
- **AI Material Generation:** Conversion rate of uploaded PDF syllabi to active flashcard/quiz sessions (> 40%).
- **Peer Retention:** % of users returning to Study Call rooms weekly.
- **Latency & Reliability:** Widget layout hydration under 150ms; Web Audio latency under 20ms.

---

## 4. Feature Specifications

### 4.1 Spatial Canvas & Dashboard Grid
- **Drag-and-Drop & Resizable Layout:** Powered by a customized `react-grid-layout` grid engine.
- **Auto-Persistence:** Grid layout mutations (position `x`, `y`, width `w`, height `h`) automatically sync to Supabase `profiles.dashboard_layout` with a 1000ms debounce.
- **Context Menu & Management:**
  - Right-click context menu on any widget with quick delete/remove actions.
  - Top-left "Add Widget" catalog popover to spawn missing or deleted widgets.
  - One-click "Reset Layout" to restore default optimized spatial proportions.

### 4.2 Analog Pomodoro Timer
- **Analog SVG Dial & Minute Hand:** High-precision SVG dial with interactive time-lapse visualization.
- **Synthesized Web Audio Engine:**
  - Soft rhythmic mechanical ticking synthesized on-the-fly via Web Audio API oscillators and bandpass filters.
  - Soft tactile click sound on start/pause/reset.
  - Resonant harmonic Tibetan bell "ting" upon session completion.
  - Zero external `.mp3` or `.wav` dependencies (guarantees zero missing audio assets or network latency).
  - Explicit mute toggle with persistent silent state.
- **Session Modes:** Focus (default 25 min), Short Break (5 min), Long Break (15 min).
- **Session Counter:** Visual tracker recording completed focus intervals across sessions.
- **Responsive Geometry:** Dial and controls gracefully scale without clipping across card resizing.

### 4.3 Task Checklist (To-Do List)
- **Fluid Task Operations:** Add new tasks, toggle completion, and delete.
- **Visual Feedback:** Strikethrough typography with subtle opacity transitions for completed tasks.
- **Internal Glass Scrollbar:** Constrained overflow with custom frosted scrollbar to preserve dashboard aesthetics.
- **Database Persistence:** Real-time synchronization to Supabase `todos` table with Row-Level Security (RLS).

### 4.4 AI Study Assistant (Gemini 3.1 Flash-Lite)
- **Conversational Copilot:** Real-time conversational interface optimized for concept clarification, code debugging, and revision.
- **Document-Aware Context Engine:** Automatically ingests text from the Document Viewer widget via `useAIContextStore`.
- **Structured Study Modes:**
  - **Flashcards:** Generates 3D flippable cards with front concept and back explanation.
  - **Quiz Mode:** Interactive multi-choice questions with instant scoring and rationales.
  - **PYQ AI (Previous Year Questions):** Structured breakdown of exam questions categorized by unit, marks weightage, and model answers.

### 4.5 Document Viewer & In-Widget Web Browser
- **PDF Ingestion:** Client-side parsing using `pdfjs-dist` extracting full text without server roundtrips.
- **In-Widget Web Browser:**
  - **Live Search Engine (`/api/search`):** Query DuckDuckGo HTML scraping to display clean, Google-like SERP cards with titles, snippets, and favicons.
  - **Cross-Origin Proxy (`/api/proxy`):** Bypasses `X-Frame-Options` and CSP headers to embed research articles, documentation (MDN, Wikipedia, LibreTexts).
  - **SPA & Route Shim:** Automatically synchronizes `history.replaceState` and proxies relative fetch/XHR requests to prevent Single-Page App router crashes.
  - **AI Study Actions:** One-click ingestion of live website or PDF text directly into Flashcard/Quiz generators.
  - **Context-Aware Bar:** AI tab bar displays on PDFs and gracefully collapses in browser mode to maximize viewport height.

### 4.6 Embedded YouTube Study Hub
- **Distraction-Free Video Experience:**
  - Embedded YouTube player using `youtube-nocookie.com/embed` for zero ads and full HD controls.
  - Categorized study chips: Lo-Fi Beats, Study Music, Calculus, Computer Science, Physics, MIT Lectures.
  - In-widget search returning live video cards with durations, view counts, and channel badges.
  - One-click "Loop" toggle for continuous lo-fi background beats.
  - Complete elimination of external tab redirect friction.

### 4.7 Peer Study Call Room (WebRTC + Supabase Realtime)
- **Room Lifecycle:** Generate lightweight 6-character room codes; instant join for peer accountability.
- **Direct Mesh Audio/Video:** Low-latency WebRTC peer connection using Google STUN and optional TURN relays.
- **Fluid Expansion:** Framer Motion `layoutId` seamlessly expands widget into a centered modal with text chat and video feeds.
- **In-Call Controls:** Mute microphone, toggle camera, room link copying, and real-time chat messaging.

### 4.8 Study Time Tracker (Digital Stopwatch)
- Continuous active minutes counter recording sustained deep-work duration.
- Start, pause, and reset controls with localStorage persistence.

### 4.9 Background Art & Atmosphere Studio
- **Dynamic Background Layer:** Smoothly transitions high-resolution ambient wallpapers behind frosted widgets.
- **Curated Atmosphere Presets:** 10 curated themes (Lo-Fi Anime Room, Cyberpunk Neon, Rainy Cafe, Midnight Library, Misty Forest, etc.).
- **Custom Artwork:** Support for direct image URLs or local device image uploads (Base64 storage).
- **Readability Sliders:** Real-time dark overlay dimming (0% to 75%) and glass blur intensity (0px to 12px) ensuring text contrast.

---

## 5. Non-Functional & Technical Requirements

| Dimension | Requirement |
|---|---|
| **Performance** | Initial dashboard load < 1.5s; Widget resize at constant 60 FPS; Layout save debounce 1000ms. |
| **Security** | Supabase Row-Level Security (RLS) on all user data (`profiles`, `todos`, `study_rooms`); Private IP SSRF protection on `/api/proxy`. |
| **Compatibility** | Modern Evergreen Browsers (Chrome 110+, Firefox 115+, Safari 16+, Edge 110+). |
| **Accessibility** | High-contrast text on glassy backgrounds; keyboard navigable dialogs and forms. |
| **Deployment** | Vercel Edge / Node.js Runtime compatibility; container-ready Next.js build. |
