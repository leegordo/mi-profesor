import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { translate, type Direction } from '@/lib/vocabulary'

export type TranslationStatus = 'idle' | 'loading' | 'done' | 'error'

export interface TranslationResult {
  translation: string
  note?: string
  source: 'llm' | 'offline'
}

const DEBOUNCE_MS = 600
const CACHE_MAX = 200
// Inputs shorter than this skip the API: single letters/digraphs rarely
// benefit from an LLM call, and the dictionary answers instantly.
const MIN_API_CHARS = 3

const cache = new Map<string, TranslationResult>()

function cacheKey(direction: Direction, text: string): string {
  return `${direction}:${text.trim().toLowerCase()}`
}

/** Pre-seed the cache (used by the swap button so the reversed pair renders
 * without firing a duplicate API call). */
export function seedTranslation(
  direction: Direction,
  text: string,
  result: TranslationResult,
) {
  cacheSet(cacheKey(direction, text), result)
}

function cacheSet(key: string, value: TranslationResult) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, value)
}

export function useTranslation(
  text: string,
  direction: Direction,
): { status: TranslationStatus; result: TranslationResult | null } {
  const [status, setStatus] = useState<TranslationStatus>('idle')
  const [result, setResult] = useState<TranslationResult | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lastKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const trimmed = text.trim()

    if (!trimmed) {
      abortRef.current?.abort()
      lastKeyRef.current = null
      setStatus('idle')
      setResult(null)
      return
    }

    const key = cacheKey(direction, trimmed)
    if (key === lastKeyRef.current) return

    const cached = cache.get(key)
    if (cached) {
      abortRef.current?.abort()
      lastKeyRef.current = key
      setStatus('done')
      setResult(cached)
      return
    }

    if (trimmed.length < MIN_API_CHARS) {
      abortRef.current?.abort()
      lastKeyRef.current = key
      // Deliberate skip, not a failure — stay in 'done' so no offline hint.
      setStatus('done')
      setResult({ translation: translate(text, direction), source: 'offline' })
      return
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      lastKeyRef.current = key
      setStatus('loading')

      try {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token ?? ''
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: trimmed, direction }),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as { translation: string; note?: string }
        if (typeof json.translation !== 'string') throw new Error('shape')

        const value: TranslationResult = {
          translation: json.translation,
          ...(json.note ? { note: json.note } : {}),
          source: 'llm',
        }
        cacheSet(key, value)
        setStatus('done')
        setResult(value)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setStatus('error')
        setResult({
          translation: translate(text, direction),
          source: 'offline',
        })
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, direction])

  useEffect(() => () => abortRef.current?.abort(), [])

  return { status, result }
}
