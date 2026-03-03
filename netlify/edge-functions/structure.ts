const STRUCTURING_PROMPT = `Eres un asistente de aprendizaje de español. Convierte los siguientes apuntes de clase en un documento Markdown estructurado.

Usa exactamente estas secciones (omite cualquier sección si no hay contenido relevante):

## Vocabulario
| Palabra/Frase | Traducción | Oración de ejemplo |
|---------------|------------|-------------------|
| ... | ... | ... |

## Patrones gramaticales
Para cada patrón, incluye: la regla, la estructura y 2-3 ejemplos.

## Frases y expresiones
Frases comunes, modismos o expresiones fijas de los apuntes.

## Escenarios y temas tratados
Temas discutidos en la lección (por ejemplo, pedir comida, dar indicaciones, hablar del pasado).

Sé exhaustivo — extrae cada palabra de vocabulario, regla gramatical, frase y tema. No agregues nada que no esté en los apuntes.

Apuntes originales:
`

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let rawText: string
  try {
    const body = await req.json()
    rawText = body.rawText
    if (!rawText?.trim()) throw new Error('empty')
  } catch {
    return new Response('rawText is required', { status: 400 })
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
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      stream: true,
      messages: [{ role: 'user', content: STRUCTURING_PROMPT + rawText }],
    }),
  })

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text()
    return new Response(`Claude API error: ${errorText}`, { status: 502 })
  }

  const reader = apiResponse.body!.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

        for (const eventBlock of events) {
          for (const line of eventBlock.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data)
              if (
                parsed.type === 'content_block_delta' &&
                parsed.delta?.type === 'text_delta'
              ) {
                controller.enqueue(encoder.encode(parsed.delta.text))
              }
            } catch {
              // skip non-JSON lines
            }
          }
        }
      }

      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}

export const config = {
  path: '/api/structure',
}
