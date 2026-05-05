import { createClient } from "@supabase/supabase-js"
import { SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY } from "@env"

let _supabase = null
const getSupabase = () => {
  if (!_supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return _supabase
}

const getEmbedding = async (text) => {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  })
  const data = await res.json()
  return data.data[0].embedding
}

const buildQuery = (analysisResult) => {
  const items = (analysisResult.outfitItems || [])
    .map((item) => `${item["garment type or name"]} (${item["styling and influence"]})`)
    .join(", ")
  return `${items}. ${analysisResult.styleDescription || ""}`.trim()
}

// Returns context grouped by source: { [source]: formattedChunksString }
// Only includes top 4 sources ranked by their best similarity score.
export const getSourceGroupedContext = async (analysisResult) => {
  const supabase = getSupabase()
  if (!supabase) return null

  try {
    const query = buildQuery(analysisResult)
    const embedding = await getEmbedding(query)

    const { data, error } = await supabase.rpc("match_articles", {
      query_embedding: embedding,
      match_count: 12,
    })
    if (error) throw error

    // Filter low-similarity results in JS (match_threshold param requires updated RPC SQL)
    const rows = (data || []).filter((row) => row.similarity > 0.2)

    // Group chunks by source, tracking best similarity per source
    const sourceMap = {}
    for (const row of rows) {
      const src = row.source || "unknown"
      if (!sourceMap[src]) {
        sourceMap[src] = { bestSimilarity: 0, chunks: [] }
      }
      if (row.similarity > sourceMap[src].bestSimilarity) {
        sourceMap[src].bestSimilarity = row.similarity
      }
      sourceMap[src].chunks.push(`[From "${row.title}"]\n${row.content}`)
    }

    // Sort by best similarity, keep top 4
    const topSources = Object.entries(sourceMap)
      .sort(([, a], [, b]) => b.bestSimilarity - a.bestSimilarity)
      .slice(0, 4)

    const grouped = {}
    for (const [src, { chunks }] of topSources) {
      grouped[src] = chunks.join("\n\n---\n\n")
    }

    console.log("RAG sources found:", Object.keys(grouped))
    return grouped
  } catch (e) {
    console.error("RAG retrieval failed:", e)
    return null
  }
}
