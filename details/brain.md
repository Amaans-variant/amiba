# Engineering Brain & Architectural Decisions (ADR)

This document captures the hard-won engineering insights, edge cases, deep debugging sessions, and technical architectural decision records (ADRs) powering the Study Dashboard.

---

## 1. Architectural Decisions Records (ADRs)

### ADR 001: Pinned `react-grid-layout` v1.x over v2.x
- **Context:** `react-grid-layout` v2.0 introduced a breaking rewrite of layout state signatures, dropped direct `WidthProvider` auto-measuring behaviors, and altered resizing callback parameters.
- **Decision:** Pinned strictly to `react-grid-layout` v1.x (see `package.json`).
- **Consequence:** `WidthProvider` accurately measures the responsive grid container on resize without requiring custom resize listeners. Grid coordinates (`x`, `y`, `w`, `h`) serialize cleanly into Supabase `jsonb`.

### ADR 002: Procedural Web Audio API vs Static Sound Assets
- **Context:** Pomodoro timers commonly rely on external `.mp3` or `.wav` sound files. In university hostel networks or restricted environments, static audio files frequently fail to load, trigger CORS errors, or introduce 300–500ms playback latency.
- **Decision:** All audio—clock ticking, tactile click feedback, and the Tibetan session-complete bell—is synthesized procedurally in real-time using `AudioContext`, `OscillatorNode`, and `BiquadFilterNode`.
- **Consequence:** 0 HTTP audio requests, zero missing asset errors, < 5ms audio latency, and total control over frequencies, decay envelopes, and harmonic overtones.

### ADR 003: Pure Client-Side PDF Parsing (`pdfjs-dist`)
- **Context:** Uploading large student syllabi (often 20MB+) to server endpoints for text extraction causes serverless memory spikes, cold starts, and potential privacy liabilities.
- **Decision:** Offloaded PDF parsing directly to the client browser using `pdfjs-dist/build/pdf.worker.mjs` running in an isolated Web Worker.
- **Consequence:** Zero server load, instantaneous local feedback, and only extracted text chunks are dispatched to Gemini when the student requests flashcards or quizzes.

### ADR 004: In-Widget YouTube Integration vs Direct `youtube.com` Iframe
- **Context:** When users visit `youtube.com` directly in an iframe, Google sends `X-Frame-Options: SAMEORIGIN` and strict CSP `frame-ancestors 'self'`. When proxied, YouTube's desktop client scripts detect origin mismatch and hang indefinitely, rendering blank grey skeleton placeholders.
- **Decision:** Built a dedicated, native YouTube Explorer and Player interface inside the Document Viewer widget. Videos are embedded using `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1` (which officially supports iframes with zero ad interruptions).
- **Consequence:** High-performance, ad-free video playback, inline Lo-Fi loop controls, and seamless study music streaming without broken skeleton states or external redirects.

---

## 2. Deep Dive: The Remix / Single-Page App Proxy Conundrum

### The Problem Encountered
When users navigated to Single Page Apps (such as `chatgpt.com` or Remix applications) via the Document Viewer's proxy, the page crashed immediately with:
```
Application Error
Error: No result found for routeId "routes/$"
at _E (https://chatgpt.com/cdn/assets/2340486e-b3t78qt0psmq9d8c.js:...)
```

### Root Cause Analysis
1. **Path Discrepancy:** The iframe was loaded at `http://localhost:3000/api/proxy?url=https%3A%2F%2Fchatgpt.com%2F`.
2. The browser reported `window.location.pathname === "/api/proxy"`.
3. When React Router v7 / Remix booted up on the client, it evaluated `window.location.pathname`.
4. Because `"/api/proxy"` did not match any defined application routes, the router fell back to its wildcard catch-all route (`routes/$` with `path: "*"`).
5. The server had only pre-rendered and streamed loader data for the root route (`routes/_conversation`), leaving `e.routes["routes/$"]` as `undefined`.
6. Function `_E(e, t)` executed:
   ```javascript
   let n = e.routes[t];
   if (n == null) throw new Lk(`No result found for routeId "${t}"`);
   ```
7. This triggered an unhandled exception that mounted the red Remix error boundary.
8. Furthermore, relative sub-requests (`fetch('/...')`) were hitting `localhost:3000` instead of the target origin, triggering CORS blocks.

### The Multi-Stage Engineering Solution in `/api/proxy`
1. **Pathname Synchronization via `history.replaceState`:**
   At the very top of `<head>` before any application bundle runs, the proxy injects:
   ```javascript
   var targetPath = new URL(finalUrl).pathname || '/';
   if (window.location.pathname !== targetPath) {
     window.history.replaceState(window.history.state, '', targetPath);
   }
   ```
   This ensures client-side routers immediately see `"/"`, matching the pre-rendered route data.

2. **Prototype Route Fallback Shim:**
   To guarantee that any unexpected route lookup never crashes the decoder, we inject:
   ```javascript
   ['routes/$', 'routes/auth.login', 'routes/login'].forEach(function(routeId) {
     Object.defineProperty(Object.prototype, routeId, {
       value: { data: {} },
       writable: true,
       configurable: true
     });
   });
   ```
   Even if `e.routes` does not contain `routes/$`, JavaScript prototypes resolve the lookup to `{ data: {} }`, allowing `_E` to return cleanly without throwing.

3. **CORS-Free Fetch & XHR Rewriting:**
   Relative fetches are intercepted and rewritten from `fetch('/path')` to `/api/proxy?url=${encodeURIComponent(targetOrigin + path)}`, ensuring that all sub-resource data streams flow through the server proxy without browser CORS violations.

4. **Capture-Phase OAuth Interception:**
   Major authentication systems (OpenAI Auth, Google, Apple) explicitly reject iframes. We attach a capture-phase click listener (`addEventListener('click', ..., true)`) to intercept "Log in" and "Sign up" clicks, stopping propagation before client routers execute, and safely opening the official login page in a native browser tab.

---

## 3. WebRTC Signaling and NAT Traversal Lessons

### Direct Peer Mesh with Zero Signaling Server Maintenance
Rather than maintaining a standalone Node.js Socket.IO server, the application uses **Supabase Realtime Broadcast Channels**.
- Channel namespace: `study-room:${roomCode}`.
- Payload footprint: Lightweight SDP strings and ICE candidates.
- Automated cleanup: Supabase automatically discards channels when all subscribers disconnect.

### The Symmetric NAT Gotcha
Public STUN servers (`stun.l.google.com:19302`) resolve IP endpoints across ~85% of standard home broadband connections. However, university campus Wi-Fi networks frequently enforce Symmetric NATs or Carrier-Grade NAT (CGNAT).
- **Rule:** If both peers reside behind symmetric NATs, STUN cannot punch a hole.
- **Fix:** Provide fallback TURN credentials via `NEXT_PUBLIC_TURN_URL`, `NEXT_PUBLIC_TURN_USERNAME`, and `NEXT_PUBLIC_TURN_CREDENTIAL`.

---

## 4. UI Layering & Spatial Glassmorphism Guidelines

### Stacking Context Hierarchy
```
z-index: -20  ->  BackgroundLayer (Fixed ambient wallpaper)
z-index: -10  ->  Dark Dimming & Glass Blur Filters
z-index: 0    ->  DashboardGrid Canvas & Draggable Widgets
z-index: 10   ->  Widget Headers, Active Resize Handles
z-index: 20   ->  Widget Dropdown Overlays (Search Suggestions)
z-index: 40   ->  Right-Click Context Menus & Catalog Popover
z-index: 50   ->  Expanded Study Call Modal & Background Art Studio Dialog
```

### Glassmorphism Token Architecture (`app/globals.css`)
- **`glass-card`:** `background: rgba(255, 255, 255, 0.04)`, `backdrop-filter: blur(24px)`, `border: 1px solid rgba(255, 255, 255, 0.09)`.
- **`shadow-glow`:** Soft radial luminescence (`box-shadow: 0 0 24px rgba(232, 168, 85, 0.18)`) accenting focused dials and active states.
