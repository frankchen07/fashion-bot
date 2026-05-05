/**
 * Embeds any rows in the articles table where embedding IS NULL.
 * Run this after fixing the vector format issue — no re-scraping needed.
 *
 * Run: node embed-missing.js
 */

import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import * as dotenv from "dotenv"

dotenv.config({ path: "../.env" })

const { OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY } = process.env
if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing env vars — check ../.env")
  process.exit(1)
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const BATCH = 20

async function main() {
  // Fetch all rows with no embedding
  const { data: rows, error } = await supabase
    .from("articles")
    .select("id, content")
    .is("embedding", null)

  if (error) { console.error("Fetch error:", error.message); process.exit(1) }
  console.log(`Found ${rows.length} rows needing embeddings`)

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    process.stdout.write(`[${i + 1}-${Math.min(i + BATCH, rows.length)}/${rows.length}] Embedding... `)

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch.map((r) => r.content),
    })

    for (let j = 0; j < batch.length; j++) {
      const { error: updateErr } = await supabase
        .from("articles")
        .update({ embedding: `[${response.data[j].embedding.join(",")}]` })
        .eq("id", batch[j].id)

      if (updateErr) console.error(`\n  Update error for id ${batch[j].id}:`, updateErr.message)
    }

    console.log("done")
  }

  console.log("\nAll embeddings updated.")
}

main().catch((e) => { console.error(e); process.exit(1) })
