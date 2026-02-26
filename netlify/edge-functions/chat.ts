function buildSystemPrompt(notes: string, retryContext?: string): string {
  let prompt = `You are Mi Profesor, a warm and encouraging Spanish tutor having a one-on-one session with your student.

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

  if (retryContext) {
    prompt += `\n\n---\nThis is a TARGETED RETRY SESSION. The student struggled with these specific concepts in their last session:\n\n${retryContext}\n\nFocus your exercises primarily on these weak areas. Begin by briefly noting you'll be working on them, then dive straight into targeted practice.`
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
