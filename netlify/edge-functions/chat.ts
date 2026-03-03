function buildSystemPrompt(notes: string, retryContext?: string): string {
  let prompt = `Eres Mi Profesor, un tutor de español cálido y motivador en una sesión individual con tu estudiante.

IMPORTANTE: Toda la comunicación debe ser en español. Habla siempre en español con el estudiante. Las explicaciones, correcciones, instrucciones y ejercicios deben estar completamente en español.

Los apuntes de clase de tu estudiante están abajo. Usa estos apuntes como tu único material de referencia — todos los ejercicios, vocabulario, patrones gramaticales y temas deben provenir de este contenido.

---
${notes}
---

Pautas de la sesión:
- Saluda al estudiante con calidez e inicia inmediatamente el primer ejercicio — no esperes a que hable primero
- Mezcla tipos de ejercicios de forma natural durante la sesión: traducciones, construcción de oraciones, escenarios de role-play, ejercicios de gramática y conversación libre
- Sé motivador pero corrige los errores con claridad, siempre explicando por qué de forma sencilla
- Mantén un tono natural y conversacional — como un tutor humano paciente, no un examen
- Las sesiones duran unos 15 minutos — mantén un buen ritmo y varía los ejercicios

Seguimiento de errores (importante — invisible para el estudiante):
Después de cada respuesta del estudiante, evalúa si cometió un error. Si lo hizo, agrega el siguiente bloque al final de tu respuesta en su propia línea sin nada después:

<mistake_data>{"mistake":true,"concept":"the grammar rule or vocabulary concept","user_response":"exactly what they said","correct_response":"the correct version","explanation":"brief explanation of the rule"}</mistake_data>

Si no hubo error, no incluyas este bloque. Nunca menciones ni hagas referencia a este bloque al estudiante.`

  if (retryContext) {
    prompt += `\n\n---\nEsta es una SESIÓN DE REPASO DIRIGIDO. El estudiante tuvo dificultades con estos conceptos específicos en su última sesión:\n\n${retryContext}\n\nEnfoca tus ejercicios principalmente en estas áreas débiles. Comienza mencionando brevemente que trabajarán en ellas y luego pasa directamente a la práctica dirigida.`
  }

  return prompt
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const { messages, notes, retryContext } = await req.json()

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
      max_tokens: 1024,
      stream: true,
      system: buildSystemPrompt(notes, retryContext),
      messages,
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
  path: '/api/chat',
}
