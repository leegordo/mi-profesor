import { useMemo, useRef, useState } from 'react'
import {
  Camera,
  Languages,
  ListChecks,
  Mic,
  MoreHorizontal,
  Users,
} from 'lucide-react'
import { translate, type Direction } from '@/lib/vocabulary'

// The two language "ends" of the translator. Spanish is Latin American
// (the screenshot's "Español (España)" becomes "Español (Latinoamérica)").
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
  const translated = useMemo(
    () => (text.trim() ? translate(text, direction) : ''),
    [text, direction],
  )

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
    if (text.trim()) {
      setText(translated)
      setActiveEnd(activeEnd === 'es' ? 'en' : 'es')
    }
    inputRefs.current[bottom]?.focus()
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] text-[#1c1c1e] flex flex-col">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col px-5">
        {/* ── Top bar ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            aria-label="Listas"
            className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-sm active:scale-95 transition"
          >
            <ListChecks className="h-5 w-5 text-[#1c1c1e]" />
          </button>
          <button
            type="button"
            aria-label="Más opciones"
            className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-sm active:scale-95 transition"
          >
            <MoreHorizontal className="h-5 w-5 text-[#1c1c1e]" />
          </button>
        </div>

        <h1 className="mt-3 text-[2.6rem] font-bold tracking-tight">Traducir</h1>

        {/* ── Translation card ─────────────────────────────────── */}
        <div className="mt-5 rounded-[28px] bg-white shadow-sm">
          <LanguagePanel
            code={top}
            value={valueFor(top)}
            isActive={top === activeEnd}
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
            isActive={bottom === activeEnd}
            accent
            onInput={(v) => handleInput(bottom, v)}
            registerRef={(el) => (inputRefs.current[bottom] = el)}
          />
        </div>
      </div>

      {/* ── Bottom tab bar ─────────────────────────────────────── */}
      <nav className="sticky bottom-0 mt-6 border-t border-[#d9d9de] bg-[#f7f7f9]/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-6 py-2 pb-6">
          <Tab icon={<Languages className="h-6 w-6" />} label="Traducir" active />
          <Tab icon={<Camera className="h-6 w-6" />} label="Cámara" />
          <Tab icon={<Users className="h-6 w-6" />} label="Conversación" />
        </div>
      </nav>
    </div>
  )
}

function LanguagePanel({
  code,
  value,
  isActive,
  accent = false,
  onInput,
  registerRef,
}: {
  code: LangCode
  value: string
  isActive: boolean
  accent?: boolean
  onInput: (value: string) => void
  registerRef: (el: HTMLTextAreaElement | null) => void
}) {
  const { label, placeholder } = LANGS[code]
  const accentColor = accent ? 'text-[#2bb3ad]' : 'text-[#1c1c1e]'

  return (
    <div className="px-6 py-5">
      <div className={`flex items-center gap-1 text-[15px] font-semibold ${accentColor}`}>
        {label}
        <ChevronUpDown className="h-3.5 w-3.5 opacity-60" />
      </div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <textarea
          ref={registerRef}
          value={value}
          onChange={(e) => onInput(e.target.value)}
          placeholder={placeholder}
          rows={1}
          aria-label={label}
          className={`min-h-[2.5rem] w-full resize-none bg-transparent text-[2rem] font-semibold leading-tight outline-none placeholder:font-semibold ${
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
          className={`mt-2 shrink-0 ${accent ? 'text-[#2bb3ad]' : 'text-[#1c1c1e]'} ${
            isActive ? 'opacity-100' : 'opacity-80'
          }`}
        >
          <Mic className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}

function Tab({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
}) {
  const color = active ? 'text-[#2bb3ad]' : 'text-[#8e8e93]'
  return (
    <button
      type="button"
      className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-1 ${color} ${
        active ? 'bg-[#2bb3ad]/10' : ''
      }`}
    >
      {icon}
      <span className="text-[11px] font-medium">{label}</span>
    </button>
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
