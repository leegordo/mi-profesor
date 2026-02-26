import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'

type SessionRecord = {
  id: string
  started_at: string
  ended_at: string | null
  exercise_count: number
  mistake_count: number
}

type MistakeRecord = {
  id: string
  session_id: string
  concept: string
  user_response: string
  correct_response: string
  logged_at: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return '—'
  const mins = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000
  )
  return `${mins}m`
}

export default function Progress() {
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [allMistakes, setAllMistakes] = useState<MistakeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sessionMistakes, setSessionMistakes] = useState<Record<string, MistakeRecord[]>>({})

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: sessionsData }, { data: mistakesData }] = await Promise.all([
          supabase
            .from('sessions')
            .select('*')
            .not('ended_at', 'is', null)
            .order('started_at', { ascending: false }),
          supabase
            .from('mistakes')
            .select('*')
            .order('logged_at', { ascending: true }),
        ])
        setSessions((sessionsData as SessionRecord[]) ?? [])
        setAllMistakes((mistakesData as MistakeRecord[]) ?? [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggleSession = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (!sessionMistakes[id]) {
      const { data } = await supabase
        .from('mistakes')
        .select('*')
        .eq('session_id', id)
        .order('logged_at', { ascending: true })
      setSessionMistakes((prev) => ({ ...prev, [id]: (data as MistakeRecord[]) ?? [] }))
    }
  }

  // ─── Derived stats ───────────────────────────────────────────────────────

  const totalSessions = sessions.length
  const totalMistakes = allMistakes.length
  const avgMistakes =
    totalSessions > 0 ? (totalMistakes / totalSessions).toFixed(1) : '—'

  // Top 5 concepts by frequency
  const conceptCounts = allMistakes.reduce<Record<string, number>>((acc, m) => {
    acc[m.concept] = (acc[m.concept] || 0) + 1
    return acc
  }, {})
  const weakSpots = Object.entries(conceptCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
  const maxConceptCount = weakSpots[0]?.[1] ?? 1

  // Last 10 sessions in chronological order for the chart
  const chartSessions = sessions.slice(0, 10).reverse()
  const maxMistakes = Math.max(...chartSessions.map((s) => s.mistake_count), 1)

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  // ─── Empty state ─────────────────────────────────────────────────────────

  if (sessions.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-24 px-4 text-center space-y-4">
        <h1 className="text-2xl font-bold">Progress</h1>
        <p className="text-muted-foreground">
          No sessions yet. Complete a session to start tracking your progress.
        </p>
        <Button asChild>
          <Link to="/session">Start your first session</Link>
        </Button>
      </div>
    )
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
      <h1 className="text-2xl font-bold">Progress</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{totalSessions}</p>
            <p className="text-sm text-muted-foreground mt-1">sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{totalMistakes}</p>
            <p className="text-sm text-muted-foreground mt-1">total mistakes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{avgMistakes}</p>
            <p className="text-sm text-muted-foreground mt-1">avg per session</p>
          </CardContent>
        </Card>
      </div>

      {/* Weak spots */}
      {weakSpots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weak Spots</CardTitle>
            <CardDescription>Concepts you've struggled with most</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {weakSpots.map(([concept, count]) => (
              <div key={concept} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>{concept}</span>
                  <span className="text-muted-foreground tabular-nums">{count}×</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(count / maxConceptCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Mistakes per session chart */}
      {chartSessions.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mistakes per Session</CardTitle>
            <CardDescription>
              Last {chartSessions.length} sessions — lower is better
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 h-20">
              {chartSessions.map((s, i) => {
                const heightPct =
                  maxMistakes === 0 ? 4 : (s.mistake_count / maxMistakes) * 100
                const isLatest = i === chartSessions.length - 1
                return (
                  <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground leading-none">
                      {s.mistake_count}
                    </span>
                    <div className="w-full flex items-end" style={{ height: 56 }}>
                      <div
                        className={`w-full rounded-t transition-all ${
                          isLatest ? 'bg-primary' : 'bg-primary/35'
                        }`}
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Oldest → Most recent</p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Session history */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Session History</h2>
        {sessions.map((s) => {
          const isExpanded = expandedId === s.id
          const mistakes = sessionMistakes[s.id]

          return (
            <Card key={s.id} className="overflow-hidden">
              <button className="w-full text-left" onClick={() => toggleSession(s.id)}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{formatDate(s.started_at)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDuration(s.started_at, s.ended_at)} · {s.exercise_count}{' '}
                          exchanges
                        </p>
                      </div>
                    </div>
                    <Badge variant={s.mistake_count === 0 ? 'secondary' : 'outline'}>
                      {s.mistake_count === 0
                        ? 'No mistakes'
                        : `${s.mistake_count} mistake${s.mistake_count !== 1 ? 's' : ''}`}
                    </Badge>
                  </div>
                </CardContent>
              </button>

              {isExpanded && (
                <>
                  <Separator />
                  <CardContent className="py-4">
                    {!mistakes ? (
                      <p className="text-sm text-muted-foreground">Loading…</p>
                    ) : mistakes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No mistakes this session.</p>
                    ) : (
                      <div className="space-y-4">
                        {mistakes.map((m, i) => (
                          <div key={m.id} className="text-sm space-y-1.5">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              {m.concept}
                            </p>
                            <div className="flex gap-2">
                              <span className="text-muted-foreground w-16 shrink-0">
                                You said:
                              </span>
                              <span className="text-red-500 dark:text-red-400">
                                {m.user_response}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-muted-foreground w-16 shrink-0">
                                Correct:
                              </span>
                              <span className="text-green-600 dark:text-green-400">
                                {m.correct_response}
                              </span>
                            </div>
                            {i < mistakes.length - 1 && <Separator className="mt-2" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
