import Anthropic from '@anthropic-ai/sdk'

/**
 * Optional AI layer for Bella (Vercel serverless function).
 * - The key lives only in the server env (ANTHROPIC_API_KEY); it never reaches the browser.
 * - The model may only re-order item IDs the client already deemed eligible and fill intent gaps.
 *   The client re-validates everything and recomputes all prices, fees, ETAs and eligibility locally.
 * - Any failure returns a non-200 so the browser silently keeps the deterministic rules engine.
 */

const MODEL = 'claude-opus-5-5'
const MAX_ITEMS = 60

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['parsed', 'picks'],
  properties: {
    parsed: {
      type: 'object',
      additionalProperties: false,
      properties: {
        budget: { type: 'number' },
        maxMinutes: { type: 'number' },
        people: { type: 'number' },
        area: { type: 'string' },
        cravings: { type: 'array', items: { type: 'string' } },
        dietaryRestrictions: { type: 'array', items: { type: 'string' } },
      },
    },
    picks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['item_id', 'reason'],
        properties: { item_id: { type: 'string' }, reason: { type: 'string' } },
      },
    },
  },
}

const SYSTEM = `You help rank food options for a Lagos food-ordering demo.
You receive a user's message, the locally parsed intent, and a list of ELIGIBLE items (already filtered for budget, hours, distance and diet).
Return JSON only: "parsed" with any intent fields you can infer that the local parse missed (areas must be one of: yaba, lekki, ikeja, surulere, vi, ikoyi, ajah, gbagada, ogudu, maryland, oregun, opebi, ikotun), and "picks": up to 6 item_ids from the list, best first, each with a short reason grounded only in the item name, tags and price given.
Never invent items, prices, ingredients, nutrition or dietary claims.`

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

export function GET() {
  return json({ ai: !!process.env.ANTHROPIC_API_KEY })
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'ai_disabled' }, 503)
  let body: { message?: unknown; intent?: unknown; items?: unknown }
  try {
    const raw = await request.text()
    if (raw.length > 20_000) return json({ error: 'too_large' }, 413)
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'bad_json' }, 400)
  }
  const message = typeof body.message === 'string' ? body.message.slice(0, 500) : ''
  const items = Array.isArray(body.items) ? body.items.slice(0, MAX_ITEMS) : []
  if (!message || !items.length) return json({ error: 'bad_input' }, 400)

  const client = new Anthropic({ timeout: 3500, maxRetries: 0 })
  try {
    const params = {
      model: MODEL,
      max_tokens: 1024,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user' as const,
          content: JSON.stringify({ message, local_intent: body.intent ?? {}, eligible_items: items }),
        },
      ],
    }
    // `fallbacks` / `output_config.format` are passed through as-is; cast keeps older SDK typings happy.
    const res = (await client.beta.messages.create(params as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming)) as Anthropic.Beta.BetaMessage
    if (res.stop_reason === 'refusal') return json({ error: 'refused' }, 502)
    const text = res.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text
    if (!text) return json({ error: 'empty' }, 502)
    return json(JSON.parse(text))
  } catch (err) {
    // Log only the error class — never the key or the user's message.
    console.error('bella_ai_error', err instanceof Anthropic.APIError ? err.status : (err as Error)?.name)
    return json({ error: 'upstream' }, 502)
  }
}
