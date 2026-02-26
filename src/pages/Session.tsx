import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'

const SESSION_DURATION = 15 * 60
const WARNING_AT = 3 * 60

type MessageRole = 'user' | 'assistant' | 'system'

interface Message {
  role: MessageRole
  content: string
  hidden?: boolean
}

type Phase = 'idle' | 'active' | 'review'

type MistakeRecord = {
  id: string
  concept: string
  prompt: string
  user_response: string
  correct_response: string
}

function stripMistakeData(text: string): string {
  return text.replace(/<mistake_data>[\s\S]*?<\/mistake_data>/g, '').trim()
}

function extractMistakeData(text: string): Record<string, unknown> | null {
  const match = text.match(/<mistake_data>([\s\S]*?)<\/mistake_data>/)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function Session() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeNotes, setActiveNotes] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(SESSION_DURATION)
  const [hasNoNotes, setHasNoNotes] = useState(false)
  const [warningShown, setWarningShown] = useState(false)
  const [exchangeCount, setExchangeCount] = useState(0)
  const [mistakeCount, setMistakeCount] = useState(0)
  const [sessionMistakes, setSessionMistakes] = useState<MistakeRecord[]>([])
  const [isLoadingReview, setIsLoadingReview] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sessionEndedRef = useRef(false)

  // Refs that mirror state so async functions always see current values
  const sessionIdRef = useRef<string | null>(null)
  const exchangeCountRef = useRef(0)
  const mistakeCountRef = useRef(0)

  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])
  useEffect(() => { exchangeCountRef.current = exchangeCount }, [exchangeCount])
  useEffect(() => { mistakeCountRef.current = mistakeCount }, [mistakeCount])

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when Claude finishes
  useEffect(() => {
    if (!isStreaming && phase === 'active') inputRef.current?.focus()
  }, [isStreaming, phase])

  // Countdown
  useEffect(() => {
    if (phase !== 'active') return
    const interval = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  // 3-minute warning
  useEffect(() => {
    if (phase === 'active' && timeRemaining === WARNING_AT && !warningShown) {
      setWarningShown(true)
      setMessages((m) => [
        ...m,
        { role: 'system', content: '3 minutes remaining in this session.' },
      ])
    }
  }, [timeRemaining, phase, warningShown])

  const endSession = useCallback(async () => {
    if (sessionEndedRef.current) return
    sessionEndedRef.current = true

    const sid = sessionIdRef.current
    if (sid) {
      await supabase
        .from('sessions')
        .update({
          ended_at: new Date().toISOString(),
          exercise_count: exchangeCountRef.current,
          mistake_count: mistakeCountRef.current,
        })
        .eq('id', sid)
    }

    setIsLoadingReview(true)
    if (sid) {
      const { data } = await supabase
        .from('mistakes')
        .select('*')
        .eq('session_id', sid)
        .order('logged_at', { ascending: true })
      setSessionMistakes((data as MistakeRecord[]) ?? [])
    }
    setIsLoadingReview(false)
    setPhase('review')
  }, [])

  // Auto-end when timer hits zero
  useEffect(() => {
    if (timeRemaining === 0 && phase === 'active') endSession()
  }, [timeRemaining, phase, endSession])

  const streamResponse = async (
    apiMessages: { role: 'user' | 'assistant'; content: string }[],
    notes: string,
    userInput: string,
    retryContext?: string
  ) => {
    setIsStreaming(true)
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    const res = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: apiMessages, notes, retryContext }),
    })

    if (!res.ok || !res.body) {
      setIsStreaming(false)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let rawContent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      rawContent += decoder.decode(value, { stream: true })
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: stripMistakeData(rawContent),
        }
        return updated
      })
    }

    // Extract and save mistake if present
    const mistakeData = extractMistakeData(rawContent)
    if (mistakeData && sessionIdRef.current) {
      await supabase.from('mistakes').insert({
        session_id: sessionIdRef.current,
        concept: mistakeData.concept as string,
        prompt: userInput,
        user_response: mistakeData.user_response as string,
        correct_response: mistakeData.correct_response as string,
      })
      setMistakeCount((c) => c + 1)
    }

    setExchangeCount((c) => c + 1)
    setIsStreaming(false)
  }

  const beginSession = async (retryContext?: string) => {
    setHasNoNotes(false)

    const { data } = await supabase
      .from('notes')
      .select('structured_md')
      .eq('is_active', true)
      .single()

    if (!data?.structured_md) {
      setHasNoNotes(true)
      return
    }

    const notes = data.structured_md
    setActiveNotes(notes)

    const { data: sessionData } = await supabase
      .from('sessions')
      .insert({ started_at: new Date().toISOString() })
      .select('id')
      .single()

    const sid = sessionData?.id ?? null
    setSessionId(sid)
    sessionIdRef.current = sid

    sessionEndedRef.current = false
    setTimeRemaining(SESSION_DURATION)
    setWarningShown(false)
    setExchangeCount(0)
    setMistakeCount(0)
    exchangeCountRef.current = 0
    mistakeCountRef.current = 0
    setMessages([{ role: 'user', content: '¡Hola! I\'m ready to practice.', hidden: true }])
    setPhase('active')

    await streamResponse(
      [{ role: 'user', content: '¡Hola! I\'m ready to practice.' }],
      notes,
      '',
      retryContext
    )
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput('')

    const userMessage: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])

    const apiMessages = [...messages, userMessage]
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && !m.hidden)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    await streamResponse(apiMessages, activeNotes, text)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const resetToIdle = () => {
    setPhase('idle')
    setMessages([])
    setExchangeCount(0)
    setMistakeCount(0)
    setSessionMistakes([])
    setActiveNotes('')
    setSessionId(null)
    sessionIdRef.current = null
  }

  const startRetry = async () => {
    const retryContext = sessionMistakes
      .map((m) => `- ${m.concept}: student said "${m.user_response}", correct is "${m.correct_response}"`)
      .join('\n')

    setMessages([])
    setSessionMistakes([])
    setSessionId(null)
    sessionIdRef.current = null
    sessionEndedRef.current = false

    await beginSession(retryContext)
  }

  const timerColor =
    timeRemaining > 5 * 60
      ? 'text-foreground'
      : timeRemaining > WARNING_AT
        ? 'text-yellow-500'
        : 'text-red-500'

  // ─── Idle ─────────────────────────────────────────────────────────────────

  if (phase === 'idle') {
    return (
      <div className="max-w-lg mx-auto py-24 px-4 space-y-6 text-center">
        <div>
          <h1 className="text-3xl font-bold">Ready to practice?</h1>
          <p className="text-muted-foreground mt-2">
            A 15-minute session tailored to your class notes.
          </p>
        </div>

        {hasNoNotes ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              No active notes found. Upload and activate your class notes first.
            </p>
            <Button asChild variant="outline">
              <Link to="/notes">Go to Notes</Link>
            </Button>
          </div>
        ) : (
          <Button size="lg" className="px-12" onClick={() => beginSession()}>
            Begin Session
          </Button>
        )}
      </div>
    )
  }

  // ─── Review ───────────────────────────────────────────────────────────────

  if (phase === 'review') {
    const minutesPracticed = Math.round((SESSION_DURATION - timeRemaining) / 60)

    // Group mistakes by concept
    const mistakesByConcept = sessionMistakes.reduce<Record<string, MistakeRecord[]>>(
      (acc, m) => {
        if (!acc[m.concept]) acc[m.concept] = []
        acc[m.concept].push(m)
        return acc
      },
      {}
    )

    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
        {/* Stats */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Session complete!</h1>
          <p className="text-muted-foreground">Great work.</p>
        </div>

        <div className="flex justify-center gap-10">
          <div className="text-center">
            <p className="text-3xl font-bold">{exchangeCount}</p>
            <p className="text-sm text-muted-foreground mt-1">exchanges</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{mistakeCount}</p>
            <p className="text-sm text-muted-foreground mt-1">mistakes</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{minutesPracticed}m</p>
            <p className="text-sm text-muted-foreground mt-1">practiced</p>
          </div>
        </div>

        <Separator />

        {/* Mistake review */}
        {isLoadingReview ? (
          <p className="text-center text-sm text-muted-foreground">Loading review…</p>
        ) : sessionMistakes.length === 0 ? (
          <div className="text-center py-4 space-y-1">
            <p className="text-lg font-semibold">No mistakes this session!</p>
            <p className="text-sm text-muted-foreground">Excellent work.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review</h2>
            {Object.entries(mistakesByConcept).map(([concept, mistakes]) => (
              <Card key={concept}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">{concept}</CardTitle>
                    {mistakes.length > 1 && (
                      <Badge variant="secondary">{mistakes.length}×</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mistakes.map((m, i) => (
                    <div key={i} className="text-sm space-y-1.5">
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-20 shrink-0">You said:</span>
                        <span className="text-red-500 dark:text-red-400">{m.user_response}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-20 shrink-0">Correct:</span>
                        <span className="text-green-600 dark:text-green-400">{m.correct_response}</span>
                      </div>
                      {i < mistakes.length - 1 && <Separator className="mt-2" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center flex-wrap">
          {sessionMistakes.length > 0 && (
            <Button onClick={startRetry}>
              Retry Weak Spots
            </Button>
          )}
          <Button
            variant={sessionMistakes.length > 0 ? 'outline' : 'default'}
            onClick={resetToIdle}
          >
            New Session
          </Button>
          <Button variant="outline" asChild>
            <Link to="/progress">View Progress</Link>
          </Button>
        </div>
      </div>
    )
  }

  // ─── Active session ────────────────────────────────────────────────────────

  const visibleMessages = messages.filter((m) => !m.hidden)

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="border-b px-4 py-2 flex items-center justify-between shrink-0">
        <span className="text-sm text-muted-foreground">Mi Profesor</span>
        <span className={`text-sm font-mono font-medium tabular-nums ${timerColor}`}>
          {formatTime(timeRemaining)}
        </span>
        <Button size="sm" variant="outline" onClick={endSession} disabled={isStreaming}>
          End Session
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {visibleMessages.map((msg, i) => {
          if (msg.role === 'system') {
            return (
              <div key={i} className="flex justify-center">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {msg.content}
                </span>
              </div>
            )
          }

          const isUser = msg.role === 'user'
          return (
            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted rounded-bl-sm'
                }`}
              >
                {msg.content || (
                  <span className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0.3s]" />
                  </span>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3 flex gap-2 items-end shrink-0">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          placeholder="Type your response… (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 min-h-[40px] max-h-32"
        />
        <Button onClick={handleSend} disabled={isStreaming || !input.trim()} size="sm">
          Send
        </Button>
      </div>
    </div>
  )
}
