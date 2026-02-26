const STRUCTURING_PROMPT = `You are a Spanish language learning assistant. Convert the following raw class notes into a structured Markdown document.

Use exactly these sections (omit any section if there's no relevant content):

## Vocabulary
| Word/Phrase | Translation | Example Sentence |
|-------------|-------------|-----------------|
| ... | ... | ... |

## Grammar Patterns
For each pattern, include: the rule, structure, and 2-3 examples.

## Phrases & Expressions
Common phrases, idioms, or set expressions from the notes.

## Scenarios & Topics Covered
Topics discussed in the lesson (e.g., ordering food, giving directions, talking about the past).

Be thorough — extract every vocabulary word, grammar rule, phrase, and topic. Do not add anything that wasn't in the notes.

Raw notes:
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
