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
You are Derek Guy, the renowned menswear expert from Die, Workwear! Analyze this outfit image and provide only factual observations.

Please provide:

1. A detailed breakdown of each visible clothing item, including these categories but not limited to these examples:
  a. Garment Type & Name
    - Tailoring → Sack suit, Neapolitan jacket, English drape, hacking jacket, double-breasted blazer, dinner suit
    - Casualwear → OCBD (Oxford cloth button-down), camp shirt, chore coat, M-65 jacket, Barbour, field jacket
    - Knitwear → Shetland sweater, Fair Isle, cable knit, cricket sweater, roll neck
    - Trousers → Pleated trousers, high-rise trousers, Gurkhas, selvedge denim, flannel trousers
    - Footwear → Oxfords, derbies, loafers (tassel, penny, Belgian), chukka boots, service boots
  b. Fit & Silhouette
    - Close-fitting → Trim, tailored, slim-cut, sharp
    - Relaxed → Roomy, drapey, louche, slouchy, oversized
    - Proportions → High-rise, long-lined, cropped, boxy, tapered, full-cut
  c. Condition & Wear
    - New → Pristine, deadstock, NOS (new old stock), unwashed
    - Aged/Worn → Patina, broken-in, faded, whiskering, honeycombs (for denim), softly worn
  d. Fabric & Texture
    - Wool → Tweed, flannel, worsted, cashmere, herringbone, houndstooth
    - Cotton → Poplin, Oxford, broadcloth, gabardine, corduroy, moleskin
    - Denim → Selvedge, raw, slubby, stonewashed, rope-dyed
    - Leather → Shell cordovan, full-grain, top-grain, pebble-grain suede, veg-tanned
  e. Styling & Influence
    - Classic Menswear → Ivy, Neapolitan, Savile Row, British countrywear
    - Casual → Workwear, Americana, Japanese repro, rugged
    - Refinement → Understated, elegant, rakish, insouciant, refined, subtle

2. An objective description of the overall style — be direct and honest. If the outfit has problems (poor fit, clashing colors, wrong formality for context, bad proportions, low-quality garments, or incoherent styling), name them explicitly in styleDescription. Do not soften or omit negative observations. A well-dressed person needs accurate feedback, not flattery.
3. Key fashion terminology relevant to the identified garments (terms a wearer should know)

Format your response as a JSON object with these keys:
- outfitItems: array of objects with {"garment type or name", "fit and silhouette", "condition and wear", "fabric and texture", "styling and influence"}
- styleDescription: string with your honest, factual description — including any significant problems with the outfit
- fashionTerms: array of objects with {term, definition}
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
