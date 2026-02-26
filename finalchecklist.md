# Mi Profesor — Setup Checklist

Complete these in order. Everything in the codebase is built — this is purely external service setup.

---

## ✅ Already Done

- GitHub repo created at `github.com/leegordo/mi-profesor`
- All code built and pushed (Phases 1–7 + Auth)

---

## 1. Anthropic API Key

- Go to [console.anthropic.com](https://console.anthropic.com)
- Create an API key
- Copy it — looks like `sk-ant-api03-...`
- Keep it handy for steps 3 and 4

---

## 2. Supabase

### 2a. Create project

- Go to [supabase.com](https://supabase.com) → sign up with GitHub
- Click **New project**
- Name: `mi-profesor`, choose a region, set a database password
- Wait ~2 minutes for it to spin up

### 2b. Run the database schema

- In the left sidebar click **SQL Editor**
- Paste and run this:

```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz default now(),
  ended_at timestamptz,
  exercise_count int default 0,
  mistake_count int default 0
);

create table mistakes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  concept text,
  prompt text,
  user_response text,
  correct_response text,
  logged_at timestamptz default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  raw_text text,
  structured_md text,
  is_active boolean default false,
  uploaded_at timestamptz default now()
);
```

### 2c. Enable Row Level Security

- In the SQL Editor, paste and run this:

```sql
alter table sessions enable row level security;
alter table mistakes enable row level security;
alter table notes enable row level security;

create policy "auth users can access sessions"
  on sessions for all to authenticated using (true) with check (true);

create policy "auth users can access mistakes"
  on mistakes for all to authenticated using (true) with check (true);

create policy "auth users can access notes"
  on notes for all to authenticated using (true) with check (true);
```

### 2d. Enable Email auth

- Left sidebar → **Authentication** → **Providers**
- Make sure **Email** is enabled (it usually is by default)

### 2e. Create your user account

- Left sidebar → **Authentication** → **Users**
- Click **Add user** → **Create new user**
- Enter your email and a strong password
- This is the account you'll use to log in to the app

### 2f. Copy your API keys

- Left sidebar → **Settings** → **API**
- Copy **Project URL** — looks like `https://xxxxxxxxxxxx.supabase.co`
- Copy **anon / public** key — the long `eyJ...` string

---

## 3. Local Environment

- Open `/Users/leegordon/spanish-teacher/.env.local`
- Fill in the three values:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

### Optional: test locally with Netlify CLI

The Netlify Functions (AI chat, note structuring) require `netlify dev` to work locally — plain `npm run dev` won't run them.

- `npm install -g netlify-cli`
- `netlify login`
- `netlify link` (link to your Netlify site — set up Netlify first in step 4)
- `netlify dev` — runs the full app including functions at `localhost:8888`

---

## 4. Netlify

### 4a. Create site

- Go to [netlify.com](https://netlify.com) → sign up
- Click **Add new site** → **Import an existing project** → **GitHub**
- Authorize GitHub and select **mi-profesor**
- Build settings:
  - Build command: `npm run build`
  - Publish directory: `dist`
- Click **Deploy site**

### 4b. Add environment variables

- Go to **Site configuration** → **Environment variables**
- Add all three:


| Key                      | Value                                 |
| ------------------------ | ------------------------------------- |
| `VITE_SUPABASE_URL`      | your Supabase project URL             |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon key                |
| `ANTHROPIC_API_KEY`      | your Anthropic API key (`sk-ant-...`) |


- After adding, go to **Deploys** → **Trigger deploy** → **Deploy site**

### 4c. Note your live URL

- Copy your Netlify URL (e.g. `https://mi-profesor-abc123.netlify.app`)

---

## 5. Supabase Auth — add your site URL

Supabase needs to know your deployed URL to allow auth redirects.

- Supabase → **Authentication** → **URL Configuration**
- Set **Site URL** to your Netlify URL (e.g. `https://mi-profesor-abc123.netlify.app`)

---

## 6. Smoke Test

Walk through the full flow once:

- Visit your Netlify URL
- **Sign in** with the credentials you created in step 2e
- Go to **Notes** → upload a `.txt` file of class notes → click **Structure with AI** → save it → set it as Active
- Go to **Session** → click **Begin Session** → have a short conversation → end the session
- Check the **end-of-session review** appears correctly
- Go to **Progress** → confirm the session shows up

---

## Optional: Git identity fix

You may have seen warnings about git identity. Fix with:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

---

## Summary


| Service   | What you need                                      |
| --------- | -------------------------------------------------- |
| Anthropic | API key from console.anthropic.com                 |
| Supabase  | Project + schema + RLS + email auth + user account |
| Netlify   | Site connected to GitHub + 3 env vars + redeploy   |


