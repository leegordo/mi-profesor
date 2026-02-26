import Anthropic from '@anthropic-ai/sdk'

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
    return new Response(JSON.stringify({ error: 'rawText is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content: STRUCTURING_PROMPT + rawText }],
    })

    const structuredMd =
      message.content.length > 0 && message.content[0].type === 'text'
        ? message.content[0].text
        : ''

    return new Response(structuredMd, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: `Claude API error: ${msg}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
