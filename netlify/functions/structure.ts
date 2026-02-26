import Anthropic from '@anthropic-ai/sdk'
import { stream } from '@netlify/functions'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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

export default stream(async (req: Request) => {
  let rawText: string
  try {
    const body = await req.json()
    rawText = body.rawText
    if (!rawText?.trim()) throw new Error('empty')
  } catch {
    return new Response('rawText is required', { status: 400 })
  }

  const anthropicStream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: STRUCTURING_PROMPT + rawText }],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of anthropicStream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(event.delta.text))
        }
      }
      controller.close()
    },
    cancel() {
      anthropicStream.abort()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
})
