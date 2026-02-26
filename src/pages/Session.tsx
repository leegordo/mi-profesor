import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

const SESSION_DURATION = 15 * 60 // seconds
const WARNING_AT = 3 * 60 // show warning when 3 minutes remain

type MessageRole = 'user' | 'assistant' | 'system'

interface Message {
  role: MessageRole
  content: string
  hidden?: boolean
}

type Phase = 'idle' | 'active' | 'review'

// Strip <mistake_data>...</mistake_data> blocks before displaying
function stripMistakeData(text: string): string {
  return text.replace(/<mistake_data>[\s\S]*?<\/mistake_data>/g, '').trim()
}

// Extract mistake JSON for Phase 4
export function extractMistakeData(text: string): Record<string, unknown> | null {
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

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sessionEndedRef = useRef(false)

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when streaming stops
  useEffect(() => {
    if (!isStreaming && phase === 'active') {
      inputRef.current?.focus()
    }
  }, [isStreaming, phase])

  // Countdown timer
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

    if (sessionId) {
      await supabase
        .from('sessions')
        .update({
          ended_at: new Date().toISOString(),
          exercise_count: exchangeCount,
          mistake_count: 0,
        })
        .eq('id', sessionId)
    }

    setPhase('review')
  }, [sessionId, exchangeCount])

  // Auto-end when timer hits zero
  useEffect(() => {
    if (timeRemaining === 0 && phase === 'active') {
      endSession()
    }
  }, [timeRemaining, phase, endSession])

  const streamResponse = async (
    apiMessages: { role: 'user' | 'assistant'; content: string }[],
    notes: string
  ) => {
    setIsStreaming(true)
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    const res = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: apiMessages, notes }),
    })

    if (!res.ok || !res.body) {
      setIsStreaming(false)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      fullContent += decoder.decode(value, { stream: true })
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: stripMistakeData(fullContent),
        }
        return updated
      })
    }

    setExchangeCount((c) => c + 1)
    setIsStreaming(false)
  }

  const startSession = async () => {
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

    if (sessionData?.id) setSessionId(sessionData.id)

    sessionEndedRef.current = false
    setTimeRemaining(SESSION_DURATION)
    setWarningShown(false)
    setExchangeCount(0)
    setMessages([{ role: 'user', content: '¡Hola! I\'m ready to practice.', hidden: true }])
    setPhase('active')

    await streamResponse(
      [{ role: 'user', content: '¡Hola! I\'m ready to practice.' }],
      notes
    )
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput('')

    const userMessage: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])

    // Only send user/assistant messages to the API (exclude system + hidden)
    const apiMessages = [...messages, userMessage]
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && !m.hidden)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    await streamResponse(apiMessages, activeNotes)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const timerColor =
    timeRemaining > 5 * 60
      ? 'text-foreground'
      : timeRemaining > WARNING_AT
        ? 'text-yellow-500'
        : 'text-red-500'

  // ─── Idle ────────────────────────────────────────────────────────────────────

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
          <Button size="lg" className="px-12" onClick={startSession}>
            Begin Session
          </Button>
        )}
      </div>
    )
  }

  // ─── Review ──────────────────────────────────────────────────────────────────

  if (phase === 'review') {
    const minutesPracticed = Math.round((SESSION_DURATION - timeRemaining) / 60)

    return (
      <div className="max-w-lg mx-auto py-24 px-4 space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold">Session complete!</h1>
          <p className="text-muted-foreground mt-2">Great work.</p>
        </div>

        <div className="flex justify-center gap-10">
          <div>
            <p className="text-3xl font-bold">{exchangeCount}</p>
            <p className="text-sm text-muted-foreground mt-1">exchanges</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{minutesPracticed}m</p>
            <p className="text-sm text-muted-foreground mt-1">practiced</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Mistake review coming in Phase 4.
        </p>

        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => {
              setPhase('idle')
              setMessages([])
              setExchangeCount(0)
              setActiveNotes('')
              setSessionId(null)
            }}
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

  // ─── Active session ───────────────────────────────────────────────────────────

  const visibleMessages = messages.filter((m) => !m.hidden)

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="border-b px-4 py-2 flex items-center justify-between shrink-0">
        <span className="text-sm text-muted-foreground">Mi Profesor</span>
        <span className={`text-sm font-mono font-medium tabular-nums ${timerColor}`}>
          {formatTime(timeRemaining)}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={endSession}
          disabled={isStreaming}
        >
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
        <Button
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          size="sm"
        >
          Send
        </Button>
      </div>
    </div>
  )
}
