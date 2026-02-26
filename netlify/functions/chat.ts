import Anthropic from '@anthropic-ai/sdk'
import { stream } from '@netlify/functions'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function buildSystemPrompt(notes: string): string {
  return `You are Mi Profesor, a warm and encouraging Spanish tutor having a one-on-one session with your student.

Your student's notes from their real Spanish lessons are below. Use these notes as your only source material — all exercises, vocabulary, grammar patterns, and topics must come from this content.

---
${notes}
---

Session guidelines:
- Greet the student warmly and immediately dive into the first exercise — do not wait for them to speak first
- Mix exercise types naturally across the session: translations, sentence building, role-play scenarios, grammar drills, and free conversation
- Be encouraging but correct mistakes clearly, always explaining why in a simple way
- Keep a natural, conversational tone — like a patient human tutor, not a quiz
- Sessions last about 15 minutes — keep a good pace and vary the exercises

Mistake tracking (important — invisible to the student):
After each student response, assess whether they made a mistake. If they did, append the following block at the very end of your response on its own line with nothing after it:

<mistake_data>{"mistake":true,"concept":"the grammar rule or vocabulary concept","user_response":"exactly what they said","correct_response":"the correct version","explanation":"brief explanation of the rule"}</mistake_data>

If no mistake was made, do not include this block at all. Never mention or reference this block to the student.`
}

export default stream(async (req: Request) => {
  const { messages, notes } = await req.json()

  const anthropicStream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: buildSystemPrompt(notes),
    messages,
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
