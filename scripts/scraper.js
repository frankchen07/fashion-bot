/**
 * Scrapes all posts from dieworkwear.com (WordPress), chunks them, embeds
 * with OpenAI text-embedding-3-small, and upserts into Supabase pgvector.
 *
 * Setup: cd scripts && npm install
 * Run:   node scraper.js
 *
 * Reads env from ../.env — needs OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
 */

import { load } from "cheerio"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import * as dotenv from "dotenv"

dotenv.config({ path: "../.env" })

const { OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY } = process.env
if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing env vars — check ../.env for OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY")
  process.exit(1)
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const CHUNK_WORDS = 400
const FETCH_DELAY_MS = 1000  // 1s between article fetches — respectful to a personal blog
const EMBED_BATCH = 20       // chunks per OpenAI embeddings call

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Sitemap ──────────────────────────────────────────────────────────────────

async function fetchPostUrls() {
  console.log("Fetching post sitemap...")

  // dieworkwear.com is WordPress — sitemap index points to post-sitemap.xml
  const res = await fetch("https://dieworkwear.com/post-sitemap.xml", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; fashion-bot-scraper/1.0)" },
  })
  if (!res.ok) throw new Error(`Sitemap fetch failed: ${res.status}`)

  const xml = await res.text()

  // WordPress date-based URL format: /YYYY/MM/DD/slug/
  const urls = [...xml.matchAll(/<loc>(https:\/\/dieworkwear\.com\/\d{4}\/[^<]+)<\/loc>/g)]
    .map((m) => m[1])

  console.log(`Found ${urls.length} post URLs`)
  return urls
}

// ── Article extraction ────────────────────────────────────────────────────────

async function fetchArticle(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; fashion-bot-scraper/1.0)" },
    })
    if (!res.ok) return null

    const html = await res.text()
    const $ = load(html)

    const title =
      $("h1.entry-title").first().text().trim() ||
      $("h1").first().text().trim() ||
      $("title").text().replace(/\s*[|\-].*$/, "").trim()

    // WordPress theme uses .entry-content for post body
    const contentEl = $(".entry-content").first()
    contentEl.find("script, style, .sharedaddy, .jp-relatedposts, figure").remove()

    const text = contentEl.text().replace(/\s+/g, " ").trim()

    if (!text || text.length < 200) return null
    return { title, text, url }
  } catch (e) {
    console.warn(`  Failed to fetch ${url}: ${e.message}`)
    return null
  }
}

// ── Chunking ──────────────────────────────────────────────────────────────────

function chunkText(text, wordsPerChunk = CHUNK_WORDS) {
  const words = text.split(" ")
  const chunks = []
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(" "))
  }
  return chunks.filter((c) => c.trim().length > 50)
}

// ── Embedding + upsert ────────────────────────────────────────────────────────

async function flushRows(rows) {
  process.stdout.write(`  Embedding ${rows.length} chunks... `)
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: rows.map((r) => r.content),
  })
  // pgvector requires the vector as a formatted string, not a raw JS array
  const rowsWithEmbeddings = rows.map((r, i) => ({
    ...r,
    embedding: `[${response.data[i].embedding.join(",")}]`,
  }))

  const { error } = await supabase.from("articles").upsert(rowsWithEmbeddings, {
    onConflict: "url,chunk_index",
    ignoreDuplicates: false,
  })
  if (error) console.error("\n  Upsert error:", error.message)
  else process.stdout.write("saved.\n")
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const urls = await fetchPostUrls()
  if (urls.length === 0) {
    console.error("No post URLs found — check sitemap structure")
    process.exit(1)
  }

  console.log(`\nStarting scrape of ${urls.length} posts (1s delay between requests)...\n`)

  let processed = 0
  let skipped = 0
  const pendingRows = []

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    const label = url.replace("https://dieworkwear.com/", "").slice(0, 60)
    process.stdout.write(`[${i + 1}/${urls.length}] ${label}... `)

    const article = await fetchArticle(url)
    if (!article) {
      console.log("skipped")
      skipped++
      await sleep(FETCH_DELAY_MS)
      continue
    }

    const chunks = chunkText(article.text)
    for (let j = 0; j < chunks.length; j++) {
      pendingRows.push({ title: article.title, url, chunk_index: j, content: chunks[j] })
    }
    console.log(`${chunks.length} chunks`)
    processed++

    // Flush to Supabase in batches to avoid holding too much in memory
    if (pendingRows.length >= EMBED_BATCH) {
      await flushRows(pendingRows.splice(0, EMBED_BATCH))
    }

    await sleep(FETCH_DELAY_MS)
  }

  // Flush remainder
  if (pendingRows.length > 0) {
    await flushRows(pendingRows)
  }

  console.log(`\nDone. ${processed} articles processed, ${skipped} skipped.`)
}

main().catch((e) => {
  console.error("Fatal error:", e)
  process.exit(1)
})
