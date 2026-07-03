import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const OPENAI_URL = "https://api.openai.com/v1/chat/completions"
const EMBED_URL = "https://api.openai.com/v1/embeddings"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  })

const SOURCE_VOICES: Record<string, string> = {
  dieworkwear: "Derek Guy from Die, Workwear! (dieworkwear.com) — historically-informed, precise, draws on tailoring tradition and Ivy League menswear, intellectually serious but accessible",
  permanentstyle: "Permanent Style — focused on luxury craft, made-to-measure, bespoke tailoring, and quality materials; refined and authoritative",
  sartorialnotes: "Sartorial Notes — thoughtful, collector-minded, emphasis on classic Italian and English tailoring, details and provenance matter",
  gentlemansgazette: "Gentleman's Gazette — encyclopedic, formal, rooted in traditional dress codes and historical menswear etiquette",
  apetogentleman: "Ape to Gentleman — approachable, contemporary, bridges streetwear and smart-casual; practical for a modern audience",
  realmenrealstyle: "Real Men Real Style — direct, actionable, focused on building a versatile wardrobe; practical and encouraging",
  dappered: "Dappered — budget-conscious, value-focused, everyday style for regular guys; concrete and unpretentious",
  articlesofstyle: "Articles of Style — Chicago-based made-to-measure perspective; personal, story-driven, emphasis on fit and individuality",
}

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  })
  const data = await res.json()
  return data.data[0].embedding
}

function buildQuery(analysis: Record<string, unknown>): string {
  const items = ((analysis.outfitItems as Record<string, string>[] | undefined) || [])
    .map((item) => `${item["garment type or name"]} (${item["styling and influence"]})`)
    .join(", ")
  return `${items}. ${(analysis.styleDescription as string) || ""}`.trim()
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  try {
    const { analysis } = await req.json()
    if (!analysis) return json({ error: "analysis required" }, 400)

    // RAG: embed the outfit description and find relevant articles
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const query = buildQuery(analysis)
    const embedding = await getEmbedding(query)

    const { data: rows, error: rpcError } = await supabase.rpc("match_articles", {
      query_embedding: embedding,
      match_count: 12,
    })
    if (rpcError) throw new Error(rpcError.message)

    const filtered = (rows || []).filter((r: { similarity: number }) => r.similarity > 0.2)

    // Group chunks by source, rank by best similarity score
    const sourceMap: Record<string, { bestSimilarity: number; chunks: string[] }> = {}
    for (const row of filtered) {
      const src = (row.source as string) || "dieworkwear"
      if (!sourceMap[src]) sourceMap[src] = { bestSimilarity: 0, chunks: [] }
      if (row.similarity > sourceMap[src].bestSimilarity) sourceMap[src].bestSimilarity = row.similarity
      sourceMap[src].chunks.push(`[From "${row.title}"]\n${row.content}`)
    }

    const topSources = Object.entries(sourceMap)
      .sort(([, a], [, b]) => b.bestSimilarity - a.bestSimilarity)
      .slice(0, 4)

    let sourceList: string[]
    let prompt: string

    if (topSources.length > 0) {
      const grouped: Record<string, string> = {}
      for (const [src, { chunks }] of topSources) grouped[src] = chunks.join("\n\n---\n\n")
      sourceList = Object.keys(grouped)
      const sourceSections = sourceList.map((src) => {
        const voice = SOURCE_VOICES[src] || src
        return `--- SOURCE: ${src} ---\nVoice: ${voice}\nRelevant excerpts:\n${grouped[src]}`
      }).join("\n\n")
      const allowedSources = sourceList.join(", ")
      prompt = `You are a fashion recommendation engine. For each menswear publication below, write a style assessment and specific recommendations IN THAT PUBLICATION'S CHARACTERISTIC VOICE, grounded in the provided excerpts.

Outfit:
${JSON.stringify(analysis)}

${sourceSections}

Return a JSON object with exactly one key "sources" — an array where each object has:
- "source": MUST be exactly one of these identifiers: ${allowedSources}
- "styleAssessment": 2-3 sentences in that publication's voice. If the outfit has significant problems, lead with them — be candid and direct in the publication's voice. Do not be sycophantic.
- "recommendations": array of 2-4 specific suggestion strings

IMPORTANT: Only include sources from this list: ${allowedSources}. Do not invent or add any other source names. Do not include fashionTerms.`
    } else {
      sourceList = ["general"]
      prompt = `You are a menswear expert. Analyze this outfit and give practical recommendations.

Outfit:
${JSON.stringify(analysis)}

Return a JSON object with exactly one key "sources" containing exactly one object:
{ "source": "general", "styleAssessment": "...", "recommendations": ["...", "..."] }

Do not use any other source name besides "general". Do not include fashionTerms.`
    }

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    })

    const data = await res.json()
    if (data.error) throw new Error(data.error.message)

    return json(JSON.parse(data.choices[0].message.content))
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
