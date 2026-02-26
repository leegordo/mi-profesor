# PRD: Personal Spanish Teacher App

## Working Title
**Mi Profesor** (or TBD)

---

## One-Sentence Description
An interactive, AI-powered Spanish tutor that converts your real class notes into personalized daily practice sessions with voice conversation, mistake tracking, and targeted review.

---

## Target User
Solo use — one learner (you) who takes online Spanish lessons with a human tutor and wants to reinforce learning between sessions, break out of default vocabulary patterns, and improve faster through daily practice.

---

## Problem Being Solved
- Hard to review and retain material between tutor sessions
- Vocabulary and phrases go stale quickly without repetition
- Naturally defaulting to the same go-to words and structures
- No consistent daily practice routine
- Lack of speaking/pronunciation practice outside of lessons

---

## User Journey

1. **Log in** (simple password auth — deferred to later build, deploy via Netlify)
2. **Start a session** — AI teacher greets you and begins a randomized 15-minute session
3. **Interactive back-and-forth** — mix of exercises drawn from your class notes:
   - Translate a phrase
   - Use a word in a sentence
   - Role-play a scenario (e.g., "you're at a restaurant")
   - Grammar drills based on lesson patterns
   - Free conversation in Spanish
4. **Mistakes are tracked silently** throughout the session
5. **End-of-session review** — AI reviews your mistakes with you
6. **Targeted retry** — new problems generated on the same concepts you struggled with
7. **Progress saved** — session history, weak spots, and improvement logged over time

---

## Core Features

### 1. Notes Ingestion
- Upload a large plain text file from your tutor sessions
- Convert to a structured `.md` file the AI teacher reads from
- AI uses this as its knowledge base for generating exercises

### 2. AI Teacher (Interactive Mode)
- Back-and-forth conversational interface (not a static quiz)
- Randomized exercise types each session:
  - Translation prompts
  - Sentence construction
  - Role-play scenarios
  - Grammar pattern drills
  - Free conversation
- Sessions capped at ~15 minutes

### 3. Voice / Speech Mode
- Full audio conversation support (speak → AI listens → AI responds with voice)
- Pronunciation feedback
- AI speaks back — full two-way audio interaction
- Text fallback always available

### 4. Mistake Tracking & Review
- Mistakes logged silently during the session
- End-of-session review presented clearly
- Option to retry with new problems on the same weak concepts

### 5. Progress Over Time
- Session history stored
- Tracks which vocabulary, grammar, and patterns you struggle with
- Visual progress indicators (frequency of mistakes, improvement over time)

---

## Platform
- **Web app** (browser-based, responsive for desktop and mobile)
- Deployed via **Netlify**

---

## Tech Stack (Suggested)
| Layer | Tool |
|---|---|
| Frontend | React + shadcn/ui (design tokens from your Figma file) |
| Design System | shadcn — tokens and components pulled from Figma via MCP |
| AI / Conversation | Claude API (claude-sonnet-4-6) |
| Voice I/O | Web Speech API or ElevenLabs / OpenAI TTS+STT |
| Database | Supabase (progress tracking, session history) |
| Auth | Supabase Auth — simple password login (deferred) |
| Deployment | Netlify |

---

## Design & Vibe
- Pulled directly from your existing **shadcn Figma file** and design tokens
- Inspired by: **Duolingo** (progression, structure), **HelloTalk** (conversational feel), **ChatGPT voice mode** (natural audio interaction)
- Warm and conversational — feels like a tutor, not a test
- Clean and focused — no clutter during a session

---

## Out of Scope (This Build)
- Multi-user support
- Auth / login (added later via Netlify)
- Sharing progress with your tutor
- Video mode
- Leaderboards or social features
- Mobile native app

---

## Future Ideas (Parked)
- TBD — cross that bridge when we get there
