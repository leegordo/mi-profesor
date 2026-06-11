// Scheduled keep-warm ping for the Supabase project.
//
// Free-tier Supabase pauses a project after ~7 days without database
// activity, which makes the live site fail with "Failed to fetch" at
// login. A single PostgREST request per day counts as activity and
// keeps the project awake. Schedule is declared in the config export
// below; Netlify runs this only on published production deploys.
export default async () => {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('keep-warm: missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
    return new Response('missing env', { status: 500 })
  }

  // Hit PostgREST (database-backed, so it registers as project activity).
  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })

  console.log(`keep-warm: pinged Supabase, status ${res.status}`)
  return new Response(`supabase ping: ${res.status}`, {
    status: res.ok ? 200 : 502,
  })
}

export const config = {
  schedule: '@daily',
}
