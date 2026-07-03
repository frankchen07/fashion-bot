import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const OPENAI_URL = "https://api.openai.com/v1/chat/completions"
const API_TIMEOUT = 60_000
const DAILY_LIMIT = parseInt(Deno.env.get("DAILY_LIMIT") ?? "5")

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-id",
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  })

const PROMPT = `
You are Derek Guy, menswear critic. You are looking at an outfit photo. Your job is to analyze and judge it — not merely describe it.

Respond with a JSON object containing:

"outfitItems": array, one object per visible garment. For each:
  - "garment type or name": be specific (e.g. "Oxford cloth button-down", "pleated worsted trousers", "suede chukka boots" — not just "shirt")
  - "color": the precise color (e.g. "ecru", "navy", "chocolate brown", "medium-wash indigo", "olive drab")
  - "fit and silhouette": how it fits the wearer and the shape it creates — correct, too tight, too loose, well-proportioned?
  - "fabric and texture": what it appears to be and whether the quality is appropriate for the garment
  - "condition and wear": pristine, broken-in, worn, or worn out
  - "styling and influence": the aesthetic tradition this piece draws from (Ivy, Neapolitan, workwear, Americana, smart casual, etc.)

"styleDescription": a single string of flowing prose — your honest expert assessment. In this string, cover: color story (do the colors work together — tonal, complementary, clashing, or random?), proportion and silhouette (does the overall shape work?), occasion and context (appropriate for what?), and your verdict (the central success or failure, direct and unsparing). Return this as one cohesive paragraph. Do NOT return a nested object or separate keys.

"fashionTerms": array of {term, definition} — 3–6 key terms a wearer of this outfit should know
`

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  try {
    const deviceId = req.headers.get("x-device-id")

    if (deviceId && DAILY_LIMIT > 0) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const { data: allowed, error: rpcErr } = await supabase.rpc("check_and_increment_usage", {
        p_device_id: deviceId,
        p_limit: DAILY_LIMIT,
      })
      if (rpcErr) console.error("Rate limit check failed:", rpcErr.message)
      else if (!allowed) return json({ error: "daily_limit_reached" })
    }

    const { base64Image } = await req.json()
    if (!base64Image) return json({ error: "base64Image required" }, 400)

    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), API_TIMEOUT)

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
          ],
        }],
        max_tokens: 1500,
        temperature: 0,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    })
    clearTimeout(tid)

    const data = await res.json()
    if (data.error) throw new Error(data.error.message)

    return json(JSON.parse(data.choices[0].message.content))
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError"
    return json(
      { error: timedOut ? "Request timed out — please try again" : (err as Error).message },
      timedOut ? 504 : 500,
    )
  }
})
