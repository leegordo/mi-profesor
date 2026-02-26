import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
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

// Detect Web Speech API support
const hasSpeechRecognition =
  typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

const hasSpeechSynthesis =
  typeof window !== 'undefined' && 'speechSynthesis' in window

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
  const [isStarting, setIsStarting] = useState(false)

  // Voice state
  const [voiceMode, setVoiceMode] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // DOM refs
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  // Stable value refs (avoid stale closures in async functions)
  const sessionEndedRef = useRef(false)
  const sessionIdRef = useRef<string | null>(null)
  const exchangeCountRef = useRef(0)
  const mistakeCountRef = useRef(0)
  const voiceModeRef = useRef(false)
  const isStreamingRef = useRef(false)
  const activeNotesRef = useRef('')
  const messagesRef = useRef<Message[]>([])

  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])
  useEffect(() => { exchangeCountRef.current = exchangeCount }, [exchangeCount])
  useEffect(() => { mistakeCountRef.current = mistakeCount }, [mistakeCount])
  useEffect(() => { voiceModeRef.current = voiceMode }, [voiceMode])
  useEffect(() => { isStreamingRef.current = isStreaming }, [isStreaming])
  useEffect(() => { activeNotesRef.current = activeNotes }, [activeNotes])
  useEffect(() => { messagesRef.current = messages }, [messages])

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus text input when Claude finishes (text mode only)
  useEffect(() => {
    if (!isStreaming && phase === 'active' && !voiceMode) {
      inputRef.current?.focus()
    }
  }, [isStreaming, phase, voiceMode])

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

  // ─── TTS ────────────────────────────────────────────────────────────────────

  const speak = useCallback((text: string) => {
    if (!hasSpeechSynthesis || !voiceModeRef.current) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.92

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => {
      setIsSpeaking(false)
      // Auto-activate mic after Claude finishes speaking
      if (voiceModeRef.current && !isStreamingRef.current) {
        setTimeout(() => {
          if (voiceModeRef.current && !isStreamingRef.current) {
            startListeningFn()
          }
        }, 400)
      }
    }
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── STT ────────────────────────────────────────────────────────────────────

  const startListeningFn = useCallback(() => {
    if (!hasSpeechRecognition || isStreamingRef.current) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SpeechRecognitionAPI()
    recognition.lang = 'es-ES'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim()
      if (transcript) sendMessageFn(transcript)
    }

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setMessages((m) => [
          ...m,
          { role: 'system', content: 'Microphone access was denied. Check your browser settings and reload.' },
        ])
      }
      setIsListening(false)
    }
    recognition.onend = () => setIsListening(false)

    recognition.start()
    recognitionRef.current = recognition
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const toggleVoiceMode = () => {
    if (voiceMode) {
      window.speechSynthesis?.cancel()
      recognitionRef.current?.abort()
      setIsListening(false)
      setIsSpeaking(false)
    }
    setVoiceMode((v) => !v)
  }

  // ─── Session logic ────────────────────────────────────────────────────────

  const endSession = useCallback(async () => {
    if (sessionEndedRef.current) return
    sessionEndedRef.current = true

    window.speechSynthesis?.cancel()
    recognitionRef.current?.abort()
    setIsListening(false)
    setIsSpeaking(false)

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
    isStreamingRef.current = true
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    const res = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: apiMessages, notes, retryContext }),
    })

    if (!res.ok || !res.body) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'system', content: 'Something went wrong connecting to the AI. Please try again.' },
      ])
      setIsStreaming(false)
      isStreamingRef.current = false
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

    // Save mistake if present
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
    isStreamingRef.current = false

    // Speak Claude's response if voice mode is on
    if (voiceModeRef.current) {
      speak(stripMistakeData(rawContent))
    }
  }

  // Shared send logic — used by text input and STT
  const sendMessageFn = useCallback(async (text: string) => {
    if (!text.trim() || isStreamingRef.current) return

    setInput('')
    window.speechSynthesis?.cancel()
    recognitionRef.current?.stop()
    setIsListening(false)

    const userMessage: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])

    const currentMessages = messagesRef.current
    const apiMessages = [...currentMessages, userMessage]
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && !m.hidden)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    await streamResponse(apiMessages, activeNotesRef.current, text)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = () => sendMessageFn(input)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const beginSession = async (retryContext?: string) => {
    setHasNoNotes(false)
    setIsStarting(true)

    const { data } = await supabase
      .from('notes')
      .select('structured_md')
      .eq('is_active', true)
      .single()

    if (!data?.structured_md) {
      setHasNoNotes(true)
      setIsStarting(false)
      return
    }

    const notes = data.structured_md
    setActiveNotes(notes)
    activeNotesRef.current = notes

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
    setIsStarting(false)
    setPhase('active')

    await streamResponse(
      [{ role: 'user', content: '¡Hola! I\'m ready to practice.' }],
      notes,
      '',
      retryContext
    )
  }

  const resetToIdle = () => {
    window.speechSynthesis?.cancel()
    recognitionRef.current?.abort()
    setIsListening(false)
    setIsSpeaking(false)
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

  const voiceSupported = hasSpeechRecognition && hasSpeechSynthesis

  // ─── Idle ──────────────────────────────────────────────────────────────────

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
          <Button size="lg" className="px-12" onClick={() => beginSession()} disabled={isStarting}>
            {isStarting ? 'Starting…' : 'Begin Session'}
          </Button>
        )}
      </div>
    )
  }

  // ─── Review ────────────────────────────────────────────────────────────────

  if (phase === 'review') {
    const minutesPracticed = Math.round((SESSION_DURATION - timeRemaining) / 60)

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

        <div className="flex gap-3 justify-center flex-wrap">
          {sessionMistakes.length > 0 && (
            <Button onClick={startRetry}>Retry Weak Spots</Button>
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
  const micDisabled = isStreaming || isSpeaking

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="border-b px-4 py-2 flex items-center justify-between shrink-0">
        <span className="text-sm text-muted-foreground">Mi Profesor</span>
        <span className={`text-sm font-mono font-medium tabular-nums ${timerColor}`}>
          {formatTime(timeRemaining)}
        </span>
        <div className="flex items-center gap-2">
          {voiceSupported && (
            <Button
              size="sm"
              variant={voiceMode ? 'default' : 'ghost'}
              onClick={toggleVoiceMode}
              title={voiceMode ? 'Turn off voice mode' : 'Turn on voice mode'}
            >
              {voiceMode ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={endSession} disabled={isStreaming}>
            End Session
          </Button>
        </div>
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

      {/* Input area */}
      <div className="border-t px-4 py-3 space-y-3 shrink-0">
        {/* Voice mic button */}
        {voiceMode && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={isListening ? stopListening : startListeningFn}
              disabled={micDisabled}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all disabled:opacity-40 ${
                isListening
                  ? 'bg-red-500 text-white scale-110 ring-4 ring-red-500/30'
                  : isSpeaking
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-primary text-primary-foreground hover:scale-105'
              }`}
            >
              {isListening ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </button>
            <p className="text-sm text-muted-foreground w-32">
              {isListening
                ? 'Listening…'
                : isSpeaking
                  ? 'Claude is speaking…'
                  : isStreaming
                    ? 'Thinking…'
                    : 'Tap to speak'}
            </p>
          </div>
        )}

        {/* Text input (always available) */}
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder={
              voiceMode
                ? 'Or type your response…'
                : 'Type your response… (Enter to send, Shift+Enter for newline)'
            }
            rows={1}
            className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 min-h-[40px] max-h-32"
          />
          <Button onClick={handleSend} disabled={isStreaming || !input.trim()} size="sm">
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
