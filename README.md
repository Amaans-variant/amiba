# Study Dashboard

A spatial, glassy productivity dashboard for focused studying — analog Pomodoro
timer, a to-do list, an AI assistant backed by Gemini, a PDF viewer that can
turn a syllabus into flashcards/quizzes/PYQ answers, a WebRTC study call room
with chat, a study-time tracker, and a YouTube music widget. Every widget
lives on one drag-and-resize grid that remembers your layout.

Built with Next.js 14 (App Router) + TypeScript, Tailwind, Framer Motion,
Zustand, Supabase (Postgres + Auth + Realtime), and the Gemini API — all on
free tiers.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. Open **SQL Editor** and run the entire contents of `supabase/schema.sql`.
   It creates every table, Row Level Security policy, and helper function —
   safe to re-run if you need to.
3. In **Project Settings → API**, copy the **Project URL** and **anon public**
   key.
4. By default new accounts are students. To make yourself an admin, sign up
   through the app once, then run in the SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
5. In **Authentication → URL Configuration**, add
   `http://localhost:3000/auth/callback` (and your production URL's
   equivalent later) as a redirect URL, or the confirmation/reset-password
   email links won't come back to the app correctly.

## 2. Get a Gemini API key (free tier)

Grab one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
Google renames/retires model versions fairly often — this project defaults to
`gemini-3.1-flash-lite` via the `GEMINI_MODEL` env var, so if the AI features
suddenly stop working, that's the first thing to check against
[the current model list](https://ai.google.dev/gemini-api/docs/models).

## 3. Configure and run

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, GEMINI_API_KEY

npm install
npm run dev
```

Open `http://localhost:3000`, sign up, confirm your email, and you're in.

## Feature tour

- **Pomodoro (left)** — analog dial, customizable focus/short/long durations,
  all sounds (tick, button press, session-complete "ting") synthesized live
  with the Web Audio API — no audio files shipped or missing.
- **To-do (left)** — add/check off/delete, completed items fade and
  strike through, list scrolls once it's full.
- **AI Assistant (middle)** — a real chat backed by Gemini (not an embedded
  ChatGPT/Gemini web page — those block iframing, see below). It's also where
  flashcards, quizzes, and PYQ analysis show up when you trigger them from the
  document viewer.
- **Document viewer (right, top)** — upload a PDF (syllabus, previous-year
  question paper, notes) and read it right there. The three circular tabs —
  **flash card**, **quiz**, **pyq ai** — send the extracted text straight to
  the AI Assistant, which generates flippable flashcards, a graded quiz, or a
  categorized PYQ breakdown with worked answers (tuned for AKTU-style
  papers, but works for any syllabus).
- **Study call (bottom left)** — create a room, share the 6-character code
  with a friend, and talk while you study. Click the expand icon and it
  fluidly grows into a centered glass modal (Framer Motion `layoutId`) with
  the full chat thread.
- **Study time (bottom right, top)** — a simple start/pause stopwatch that
  accumulates your total continuous study minutes.
- **Music (bottom right, bottom)** — paste any YouTube video or playlist
  link; shows what's playing with play/pause/skip, and expands into a bigger
  player to change tracks.

Drag any widget by its header, resize from the corner, and your layout
autosaves to Supabase (debounced). "Reset layout" puts everything back.

## Honest limitations

A project this size was written without being able to run `npm install` or
a live browser in the loop, so treat this as a strong, working first draft
rather than a guaranteed zero-bug build — a stray import or prop name is
plausible, and would be a quick fix. A few things are worth knowing about
regardless of that:

- **WebRTC calling needs a TURN server for full reliability.** The public
  STUN servers baked in get two peers connected on most home/office
  networks, but strict or symmetric NATs (common on college/hostel wifi)
  can block a direct peer-to-peer connection outright. Set
  `NEXT_PUBLIC_TURN_URL` / `_USERNAME` / `_CREDENTIAL` in `.env.local` — see
  the comments in `.env.example` for a couple of free options — if calls
  aren't connecting.
- **Not every website can be embedded in the document viewer's "Website"
  tab.** Most major sites (Google, most SaaS products, social media) send an
  `X-Frame-Options`/CSP header that explicitly blocks embedding — that's the
  site's own security policy, and no code in this app can override it. PDFs,
  docs, wikis, and most reference sites embed fine.
- **"YouTube Music" doesn't have a public embeddable widget** — that's a
  distinct, closed product. The music widget uses the real, official YouTube
  IFrame Player API instead, which plays any normal YouTube video or
  playlist (lofi/focus-music playlists work great). No default track ships
  bundled, deliberately: even the internet's most famous 24/7 lofi study
  stream has been taken down by copyright claims more than once, so hard-
  coding "the" default felt like setting you up to open the app to a dead
  player. Paste whatever you actually want to listen to.
- **The "AI apps in a browser-like box" idea from the original sketch became
  a native chat UI calling the Gemini API directly.** Embedding ChatGPT/
  Gemini's actual web app in an iframe was the other option, but those sites
  block iframing the same way most sites do above — a native integration is
  both the only thing that actually works and the more capable option (it's
  what makes the flashcard/quiz/PYQ handoff possible at all).

## Project structure

```
app/                  Routes (App Router): auth pages, dashboard, admin, API routes
components/
  dashboard/           The grid + admin/sign-out bits
  providers/            Auth context, the CLS-safe motion wrapper
  ui/                   Shared glass primitives (panel, button, widget chrome)
  widgets/               The seven dashboard widgets
hooks/                  usePdf (PDF read + extract), useStudyCall (WebRTC)
lib/                    Supabase clients, Gemini helper, audio synthesis, utils
store/                  Zustand stores (grid layout, tasks, AI context bridge)
supabase/schema.sql     Full DB schema + RLS policies + triggers
types/                  Shared TypeScript types
```
