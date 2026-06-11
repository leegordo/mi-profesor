const MAX_INPUT_CHARS = 500

// Byte-stable schema: the Anthropic API compiles and caches it server-side,
// so don't construct it dynamically.
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    translation: { type: 'string' },
    note: { type: 'string' },
  },
  required: ['translation'],
  additionalProperties: false,
} as const

function systemPrompt(direction: 'en-es' | 'es-en'): string {
  const par =
    direction === 'en-es' ? 'del inglés al español' : 'del español al inglés'
  return `Eres un motor de traducción para una app de aprendizaje de español. Traduce el texto del usuario ${par}.

Reglas:
- El español es SIEMPRE español latinoamericano: "carro" no "coche", "computadora" no "ordenador", "celular" no "móvil", "jugo" no "zumo", "ustedes" no "vosotros".
- Entiende y traduce jerga y modismos coloquiales latinoamericanos (p. ej. "riño", "chévere", "qué onda").
- Maneja palabras sueltas, frases y oraciones completas. Conserva el registro, la puntuación y las mayúsculas del original.
- Devuelve SOLO la traducción en el campo "translation" — sin preámbulos, sin comillas, sin explicaciones.
- Solo si el texto es UNA palabra suelta y ambigua (varios significados comunes), agrega el campo "note" con hasta 3 alternativas breves, p. ej. "también: banco (asiento), banca (finanzas)". En cualquier otro caso omite "note".`
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Abuse floor: the client always has a Supabase session, so require a
  // JWT-shaped bearer token. (Full JWKS verification across all /api/*
  // endpoints is a documented follow-up.)
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (token.split('.').length !== 3) {
    return new Response('Unauthorized', { status: 401 })
  }

  let text: string
  let direction: 'en-es' | 'es-en'
  try {
    const body = await req.json()
    text = body.text
    direction = body.direction
    if (typeof text !== 'string' || !text.trim()) throw new Error('empty')
    if (direction !== 'en-es' && direction !== 'es-en') throw new Error('dir')
  } catch {
    return new Response('text and direction are required', { status: 400 })
  }
  if (text.length > MAX_INPUT_CHARS) {
    return new Response(`text must be <= ${MAX_INPUT_CHARS} chars`, {
      status: 400,
    })
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return new Response('ANTHROPIC_API_KEY not configured', { status: 500 })
  }

  const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt(direction),
      output_config: {
        format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
      },
      messages: [{ role: 'user', content: text }],
    }),
  })

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text()
    return new Response(`Claude API error: ${errorText}`, { status: 502 })
  }

  try {
    const data = await apiResponse.json()
    const block = data.content?.find(
      (b: { type: string }) => b.type === 'text',
    )
    const parsed = JSON.parse(block.text)
    if (typeof parsed.translation !== 'string') throw new Error('shape')
    return new Response(
      JSON.stringify({
        translation: parsed.translation,
        ...(typeof parsed.note === 'string' && parsed.note
          ? { note: parsed.note }
          : {}),
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch {
    return new Response('Malformed model response', { status: 502 })
  }
}

export const config = {
  path: '/api/translate',
}
