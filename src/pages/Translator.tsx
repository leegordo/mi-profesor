import { useRef, useState } from 'react'
import { Mic } from 'lucide-react'
import { type Direction } from '@/lib/vocabulary'
import { useTranslation, seedTranslation } from '@/lib/useTranslation'

// The two language "ends" of the translator. Spanish is Latin American
// (the reference screenshot's "Español (España)" becomes "Español
// (Latinoamérica)").
const LANGS = {
  es: { label: 'Español (Latinoamérica)', placeholder: 'Introducir texto' },
  en: { label: 'Inglés (EE. UU.)', placeholder: 'Enter text' },
} as const

type LangCode = keyof typeof LANGS

export default function Translator() {
  // `top` is the language shown in the upper panel. The screenshot has
  // Spanish on top, English on the bottom; the swap button flips them.
  const [top, setTop] = useState<LangCode>('es')
  const [text, setText] = useState('')
  // Which panel the user is typing in — drives translation direction.
  const [activeEnd, setActiveEnd] = useState<LangCode>('es')
  const inputRefs = useRef<Record<LangCode, HTMLTextAreaElement | null>>({
    es: null,
    en: null,
  })

  const bottom: LangCode = top === 'es' ? 'en' : 'es'

  const direction: Direction = activeEnd === 'en' ? 'en-es' : 'es-en'
  const { status, result } = useTranslation(text, direction)
  const translated = result?.translation ?? ''

  function valueFor(code: LangCode): string {
    return code === activeEnd ? text : translated
  }

  function handleInput(code: LangCode, value: string) {
    setActiveEnd(code)
    setText(value)
  }

  function swap() {
    // Flip the panels and carry the translation across so the result the
    // user was reading becomes the new input — same behavior as iOS.
    setTop(bottom)
    if (text.trim() && translated) {
      // Pre-seed the reverse pair so the swap renders instantly instead of
      // firing a duplicate API call for a translation we already have.
      const reverse: Direction = direction === 'en-es' ? 'es-en' : 'en-es'
      seedTranslation(reverse, translated, {
        translation: text.trim(),
        source: result?.source ?? 'llm',
      })
      setText(translated)
      setActiveEnd(activeEnd === 'es' ? 'en' : 'es')
    }
    inputRefs.current[bottom]?.focus()
  }

  return (
    <div className="bg-[#f2f2f7] min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto w-full max-w-md px-5 pb-16">
        <h1 className="pt-6 text-[2.6rem] font-bold tracking-tight text-[#1c1c1e]">
          Traducir
        </h1>

        {/* ── Translation card ─────────────────────────────────── */}
        <div className="mt-5 rounded-[28px] bg-white shadow-sm">
          <LanguagePanel
            code={top}
            value={valueFor(top)}
            accent={top === 'en'}
            loading={top !== activeEnd && status === 'loading'}
            note={top !== activeEnd ? result?.note : undefined}
            onInput={(v) => handleInput(top, v)}
            registerRef={(el) => (inputRefs.current[top] = el)}
          />

          {/* Divider with the swap control floating on it. */}
          <div className="relative">
            <div className="mx-6 border-t border-[#e5e5ea]" />
            <button
              type="button"
              onClick={swap}
              aria-label="Intercambiar idiomas"
              className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#f2f2f7] text-[#2bb3ad] shadow-sm active:scale-95 transition"
            >
              <SwapIcon className="h-5 w-5" />
            </button>
          </div>

          <LanguagePanel
            code={bottom}
            value={valueFor(bottom)}
            accent={bottom === 'en'}
            loading={bottom !== activeEnd && status === 'loading'}
            note={bottom !== activeEnd ? result?.note : undefined}
            onInput={(v) => handleInput(bottom, v)}
            registerRef={(el) => (inputRefs.current[bottom] = el)}
          />
        </div>

        <p className="mt-4 px-1 text-center text-xs text-[#8e8e93]">
          {status === 'error'
            ? 'sin conexión · diccionario local'
            : 'Traductor con IA · español latinoamericano'}
        </p>
      </div>
    </div>
  )
}

function LanguagePanel({
  code,
  value,
  accent,
  loading,
  note,
  onInput,
  registerRef,
}: {
  code: LangCode
  value: string
  accent: boolean
  loading: boolean
  note?: string
  onInput: (value: string) => void
  registerRef: (el: HTMLTextAreaElement | null) => void
}) {
  const { label, placeholder } = LANGS[code]
  const labelColor = accent ? 'text-[#2bb3ad]' : 'text-[#1c1c1e]'

  return (
    <div className="px-6 py-5">
      <div className={`flex items-center gap-1 text-[15px] font-semibold ${labelColor}`}>
        {label}
        <ChevronUpDown className="h-3.5 w-3.5 opacity-60" />
        {loading && (
          <span className="ml-1 inline-flex gap-0.5" aria-label="Traduciendo">
            <span className="h-1 w-1 rounded-full bg-current animate-pulse" />
            <span className="h-1 w-1 rounded-full bg-current animate-pulse [animation-delay:0.2s]" />
            <span className="h-1 w-1 rounded-full bg-current animate-pulse [animation-delay:0.4s]" />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <textarea
          ref={registerRef}
          value={value}
          onChange={(e) => onInput(e.target.value)}
          placeholder={placeholder}
          rows={1}
          aria-label={label}
          className={`min-h-[2.5rem] w-full resize-none bg-transparent text-[2rem] font-semibold leading-tight outline-none placeholder:font-semibold transition-opacity ${
            loading ? 'opacity-50' : ''
          } ${
            accent
              ? 'text-[#2bb3ad] placeholder:text-[#2bb3ad]/70'
              : 'text-[#1c1c1e] placeholder:text-[#b0b0b8]'
          }`}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = `${el.scrollHeight}px`
          }}
        />
        <button
          type="button"
          aria-label={`Dictar en ${label}`}
          className={`mt-2 shrink-0 ${accent ? 'text-[#2bb3ad]' : 'text-[#1c1c1e]'}`}
        >
          <Mic className="h-6 w-6" />
        </button>
      </div>
      {note && <p className="mt-1 text-sm text-[#8e8e93]">{note}</p>}
    </div>
  )
}

// ── Inline icons that match the iOS chrome ──────────────────────────

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M8 4v13m0 0l-3-3m3 3l3-3M16 20V7m0 0l-3 3m3-3l3 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronUpDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M8 9l4-4 4 4M8 15l4 4 4-4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
