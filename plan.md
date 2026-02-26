# Mi Profesor — Development Plan

Based on `prd.md`. Scoped for solo development, single user, no auth in this build.

---

## Guiding Principles

- Build in phases — each phase ships something working
- No auth until a later build
- Keep AI prompts well-structured from the start (easier to improve later)
- Voice is a feature layer on top of a working text UI — build text first
- Supabase from Phase 1 so data doesn't need to be migrated later

---

## Phase 1 — Project Foundation

**Goal:** Repo, tooling, and blank app running on Netlify.

### Tasks
- [ ] Create GitHub repo (`mi-profesor`) and push initial commit
- [ ] Init React app (Vite) with TypeScript
- [ ] Install and configure shadcn/ui
- [ ] Connect Netlify deployment (auto-deploy from `main`)
- [ ] Set up Supabase project — create tables (see schema below)
- [ ] Add environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ANTHROPIC_API_KEY`
- [ ] Basic app shell: header, nav placeholder, home screen

### Supabase Schema (Initial)

```sql
-- Session history
sessions (
  id uuid primary key,
  started_at timestamptz,
  ended_at timestamptz,
  exercise_count int,
  mistake_count int
)

-- Individual mistakes logged during a session
mistakes (
  id uuid primary key,
  session_id uuid references sessions(id),
  concept text,         -- e.g. "ser vs estar"
  prompt text,          -- what was asked
  user_response text,   -- what the user said/typed
  correct_response text,
  logged_at timestamptz
)

-- Parsed notes content (one row per ingestion)
notes (
  id uuid primary key,
  raw_text text,
  structured_md text,
  uploaded_at timestamptz
)
```

**Deliverable:** App loads at Netlify URL, Supabase connected, env vars working.

---

## Phase 2 — Notes Ingestion

**Goal:** Upload plain text class notes → structured Markdown the AI teacher reads from.

### Tasks
- [ ] File upload UI — drag and drop or file picker (plain `.txt`)
- [ ] Send raw text to Claude API with a structuring prompt
- [ ] Claude returns structured `.md` (vocabulary lists, grammar patterns, phrases, scenarios)
- [ ] Preview structured output in-app before saving
- [ ] Save structured MD + raw text to `notes` table in Supabase
- [ ] Notes management page — view past uploads, set active notes

### Structuring Prompt (starting point)
```
You are a Spanish language learning assistant. Convert the following raw class notes into a structured Markdown file with clear sections:
- Vocabulary (word, translation, example sentence)
- Grammar Patterns (rule, examples)
- Phrases & Expressions
- Scenarios & Topics Covered

Raw notes:
[USER_NOTES]
```

**Deliverable:** Can upload notes, see structured output, save it. AI teacher can pull from this in Phase 3.

---

## Phase 3 — AI Teacher Core (Text Mode)

**Goal:** A working back-and-forth practice session driven by Claude, using the stored notes as context.

### Tasks
- [ ] Session start screen — "Begin Session" button
- [ ] Load active notes from Supabase and inject into system prompt
- [ ] Build system prompt (see below)
- [ ] Chat UI — message thread, user input field, send button
- [ ] Stream Claude responses into the chat UI
- [ ] Session timer — 15-minute countdown, soft end warning at 12 min
- [ ] Randomized exercise selection — Claude picks from: translation, sentence construction, role-play, grammar drill, free conversation
- [ ] End session manually or on timer expiry → transitions to Phase 4 review

### System Prompt Structure
```
You are Mi Profesor, a warm and encouraging Spanish tutor for a single student.

Your student's notes from real lessons are below. Use them as your knowledge base — generate exercises, prompts, and corrections based on these specific vocabulary words, grammar patterns, and topics.

[STRUCTURED NOTES MD]

Session rules:
- Keep exercises varied: translations, sentence building, role-play, grammar drills, free conversation
- Be encouraging but correct mistakes clearly
- After each response, silently decide if the student made a mistake — if so, note it internally (you'll report at end of session)
- Sessions run ~15 minutes
- Speak mostly in English with Spanish embedded naturally; increase Spanish ratio as session progresses
```

**Deliverable:** Can start a session, have a back-and-forth practice conversation, end a session.

---

## Phase 4 — Mistake Tracking & End-of-Session Review

**Goal:** Mistakes logged silently during session; reviewed and retried at the end.

### Tasks
- [ ] After each AI turn, parse the response for mistake metadata (structured tool call or JSON block in response)
- [ ] Log mistakes to `mistakes` table (concept, prompt, user response, correct response)
- [ ] On session end → End-of-Session Review screen:
  - List all mistakes with explanations
  - Group by concept/pattern
- [ ] "Retry" button — generates a new mini-session targeting the weak concepts from this session
- [ ] Save session summary to `sessions` table

### Mistake Extraction Approach
Ask Claude to emit a structured JSON block at the end of each turn (hidden from UI) whenever a mistake is detected:

```json
{
  "mistake": true,
  "concept": "preterite vs imperfect",
  "user_response": "Yo comía la manzana ayer",
  "correct_response": "Yo comí la manzana ayer",
  "explanation": "Use preterite for completed actions with a specific time reference"
}
```

Parse this server-side or client-side, strip from displayed text.

**Deliverable:** Mistakes tracked, end-of-session review shown, retry session works.

---

## Phase 5 — Voice Mode

**Goal:** Full two-way audio — speak to the AI, hear it speak back. Text always available as fallback.

### Tasks
- [ ] STT: Web Speech API (`webkitSpeechRecognition`) for capturing user speech → text
- [ ] Voice toggle button in session UI — enables/disables mic input
- [ ] TTS: Evaluate options:
  - **Web Speech API** (`speechSynthesis`) — free, limited voice quality
  - **ElevenLabs** — high quality, requires API key and cost consideration
  - **OpenAI TTS** — solid quality, pay-per-use
  - Start with Web Speech API; upgrade to ElevenLabs if quality feels too robotic
- [ ] AI speaks each response automatically when voice mode is on
- [ ] Visual indicator — speaking animation or mic active state
- [ ] Pronunciation feedback — Claude flags mispronunciations in text (voice tone detection is out of scope)

**Deliverable:** Can run a full voice session with mic + speaker. Text fallback always works.

---

## Phase 6 — Progress Tracking

**Goal:** Session history and weak spot visibility over time.

### Tasks
- [ ] Progress dashboard page:
  - Sessions completed (count, dates)
  - Total mistakes by concept — sorted by frequency
  - Improvement over time — mistake rate per session (chart)
- [ ] "Weak spots" panel — top 5 recurring problem areas
- [ ] Per-session detail view — see full mistake log for any past session
- [ ] Simple chart library — Recharts or shadcn charts

**Deliverable:** Progress page shows history, weak spots, and trends.

---

## Phase 7 — Polish & Responsive Design

**Goal:** App feels good, works on mobile, ready for regular daily use.

### Tasks
- [ ] Apply design tokens from shadcn Figma file
- [ ] Warm, conversational visual language — not clinical/quiz-like
- [ ] Responsive layout — desktop and mobile
- [ ] Empty states — no notes uploaded yet, no sessions yet
- [ ] Loading states — AI response streaming, session starting
- [ ] Error states — API failures, no mic access
- [ ] Smooth session transitions (start → session → review → retry)
- [ ] Favicon, page title, basic SEO meta tags

**Deliverable:** App is polished, responsive, and pleasant to use daily.

---

## Deferred (Later Build)

- Auth / login (Supabase Auth + Netlify)
- Sharing progress with human tutor
- Video mode
- Multi-user support

---

## Summary of Phases

| Phase | Focus | Key Deliverable |
|---|---|---|
| 1 | Foundation | App + Supabase live on Netlify |
| 2 | Notes Ingestion | Upload → structured notes saved |
| 3 | AI Teacher (Text) | Working practice session |
| 4 | Mistake Tracking | End-of-session review + retry |
| 5 | Voice Mode | Full audio conversation |
| 6 | Progress Tracking | Dashboard with history + weak spots |
| 7 | Polish | Production-ready UI |
