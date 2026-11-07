# Preflight & Production Readiness Checklist — Study Dashboard

Complete this verification checklist prior to merging, staging, or deploying Study Dashboard to production.

---

## 1. Environment & Secrets Configuration

- [ ] **`.env.local` Created:** Copied from `.env.example`.
- [ ] **Supabase Public Credentials:**
  - `NEXT_PUBLIC_SUPABASE_URL`: Verified format `https://<project-ref>.supabase.co`.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Verified valid public anon token.
- [ ] **Supabase Service Role (Server-only):**
  - `SUPABASE_SERVICE_ROLE_KEY`: Configured only if administrative user operations or server seed scripts are executed.
- [ ] **Google Gemini AI Key:**
  - `GEMINI_API_KEY`: Acquired from [Google AI Studio](https://aistudio.google.com/apikey).
  - `GEMINI_MODEL`: Set to `gemini-3.1-flash-lite` (or active production equivalent).
- [ ] **WebRTC TURN Server (Optional / Recommended for Campus Networks):**
  - `NEXT_PUBLIC_TURN_URL`: e.g., Metered or OpenRelay TURN address.
  - `NEXT_PUBLIC_TURN_USERNAME`: TURN authentication username.
  - `NEXT_PUBLIC_TURN_CREDENTIAL`: TURN credential string.

---

## 2. Supabase Database & Auth Validation

- [ ] **Database Schema Execution:**
  - `supabase/schema.sql` executed in Supabase SQL Editor.
  - Tables verified: `public.profiles`, `public.todos`, `public.study_rooms`, `public.messages`.
- [ ] **Row Level Security (RLS) Active:**
  - Verified RLS is enabled on all public tables:
    ```sql
    select tablename, rowsecurity from pg_tables where schemaname = 'public';
    ```
- [ ] **Automatic Profile Creation Trigger:**
  - `on_auth_user_created` trigger active on `auth.users` inserting into `public.profiles`.
- [ ] **Realtime Replication Enabled:**
  - Verified Supabase Realtime is enabled for `public.messages` and broadcast channels in **Database → Replication**.
- [ ] **Redirect URLs Configured:**
  - `http://localhost:3000/auth/callback` added to Supabase **Authentication → URL Configuration**.
  - Production domain redirect (e.g., `https://your-domain.vercel.app/auth/callback`) configured.

---

## 3. Build & Static Analysis Checks

Execute the following commands in the project root:

```bash
# 1. Type Check (Strict TypeScript validation)
npx tsc --noEmit

# 2. ESLint Validation
npm run lint

# 3. Next.js Production Build
npm run build
```

- [ ] **Type Check:** Exited with code `0` (Zero TypeScript compile errors).
- [ ] **ESLint:** No blocking syntax or import errors.
- [ ] **Production Build:** Next.js build succeeds with static pages generated and dynamic route handlers compiled.

---

## 4. Feature Verification & User Flow Sanity Checks

### 4.1 Authentication & Profile Hydration
- [ ] User can sign up with email and password.
- [ ] Email confirmation callback properly sets session cookie.
- [ ] User can sign in and is redirected to `/dashboard`.
- [ ] Non-authenticated users accessing `/dashboard` are redirected to `/login`.
- [ ] Sign out button invalidates session and clears cookies.

### 4.2 Dashboard Grid & Layout Persistence
- [ ] Widgets render on initial default layout without overlap.
- [ ] Dragging and resizing a widget updates coordinates smoothly at 60 FPS.
- [ ] Layout coordinates persist across page reloads (saved in `profiles.dashboard_layout`).
- [ ] Right-clicking any widget displays context menu with "Delete Widget" option.
- [ ] "Add Widget" popover allows re-spawning deleted widgets.
- [ ] "Reset Layout" button restores default spatial arrangement.

### 4.3 Analog Pomodoro Widget
- [ ] Start/Pause button toggles session countdown.
- [ ] Clock tick audio plays rhythmically during focus mode.
- [ ] Speaker/mute toggle immediately stops clock ticking sound.
- [ ] Session completion plays harmonic Tibetan bell chime.
- [ ] Analog clock dial and buttons scale smoothly when the widget is resized.
- [ ] Completed sessions counter increments and persists.

### 4.4 Task Checklist (To-Do List)
- [ ] Adding a new task persists immediately to Supabase `todos`.
- [ ] Checking off a task strikes through text with smooth opacity fade.
- [ ] Deleting a task removes record from database.
- [ ] List scrolls internally with frosted custom scrollbar when full.

### 4.5 Document Viewer & In-Widget Web Browser
- [ ] Uploading a syllabus PDF parses text and renders page in viewer.
- [ ] Clicking **Flash card**, **Quiz**, or **PYQ AI** sends extracted text to AI Assistant and opens study material.
- [ ] Context-aware AI tab bar is visible for PDFs and collapses in website mode.
- [ ] Searching a topic (e.g., "calculus", "lofi") renders Google-like search results card list.
- [ ] Clicking a search result loads website via `/api/proxy`.
- [ ] Proxy toggle in address bar allows switching between proxied and direct mode.
- [ ] Open in New Tab (`↗`) button opens the active URL in a native browser tab.

### 4.6 Embedded YouTube Study Hub
- [ ] Searching "youtube" opens the native In-Widget YouTube Explorer.
- [ ] Category chips (Lo-Fi Beats, Study Music, Calculus, etc.) filter video cards.
- [ ] Clicking any video card plays video directly in the 16:9 embedded player.
- [ ] Video player controls (play/pause, volume, fullscreen, HD) function without ads.
- [ ] "Loop" toggle enables seamless looping of background music tracks.
- [ ] "Back to Feed" returns to full video card grid.

### 4.7 Peer Study Call Room
- [ ] Host can generate a 6-character room code.
- [ ] Guest joining with valid code establishes WebRTC peer connection.
- [ ] Local and remote audio/video tracks stream with minimal latency.
- [ ] In-call chat messages transmit in real time via Supabase Realtime channel.
- [ ] Modal expansion morphs widget into full-screen glassy dialogue.

### 4.8 Background Art & Atmosphere Studio
- [ ] "Background Art" button in dashboard header opens atmosphere picker modal.
- [ ] Selecting any curated preset (Anime Lo-Fi, Cyberpunk, Cozy Library) updates background instantly.
- [ ] Pasting a custom image URL updates wallpaper and saves to `localStorage`.
- [ ] Uploading a local device image stores Base64 and updates wallpaper.
- [ ] Dark Overlay slider (0–75%) adjusts readability dimming in real time.
- [ ] Glass Blur slider (0–12px) adjusts backdrop depth-of-field blur.
- [ ] Settings persist across browser reloads.

---

## 5. Security & Network Preflight

- [ ] **SSRF Guard:** Verified `/api/proxy` rejects `localhost`, `127.0.0.1`, and private IP ranges (`10.*`, `192.168.*`, `172.16-31.*`).
- [ ] **Security Headers:** Next.js response headers enforce `X-Content-Type-Options: nosniff` and appropriate frame protections where applicable.
- [ ] **API Rate Limits:** Monitored Gemini free-tier rate limits (15 RPM / 1M TPM for `gemini-3.1-flash-lite`).
- [ ] **Clean Console:** DevTools console contains zero unhandled Promise rejections or uncaught runtime exceptions during standard study sessions.
