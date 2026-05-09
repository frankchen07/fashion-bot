/**
 * Multi-site scraper — extends the dieworkwear pipeline to 8 additional menswear sites.
 *
 * Setup:  cd scripts && npm install
 * Run all: node scrape-multi.js
 * Run one: node scrape-multi.js sartorialnotes
 *
 * Reads env from ../.env — needs OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Before first run, apply schema migration in Supabase SQL editor:
 *   ALTER TABLE articles ADD COLUMN IF NOT EXISTS source text;
 *   UPDATE articles SET source = 'dieworkwear' WHERE source IS NULL;
 */

import { load } from "cheerio"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import * as dotenv from "dotenv"

dotenv.config({ path: "../.env" })

const { OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env vars — check ../.env for OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const CHUNK_WORDS = 400
const EMBED_BATCH = 20
const UA = "Mozilla/5.0 (compatible; fashion-bot-scraper/1.0)"

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Site configs ──────────────────────────────────────────────────────────────

const SITES = [
  {
    name: "permanentstyle",
    // Sitemap blocked (403) — paginate WordPress RSS feed instead
    discoveryType: "rss",
    rssUrl: "https://www.permanentstyle.com/feed/",
    titleSelector: "h1.entry-title, h1",
    contentSelector: ".entry-content, .post-content",
    fetchDelay: 2000,
  },
  {
    name: "sartorialnotes",
    discoveryType: "sitemap-index",
    sitemapIndexUrl: "https://sartorialnotes.com/wp-sitemap.xml",
    postSitemapPattern: /wp-sitemap-posts-post/,
    titleSelector: "h1.entry-title, h1",
    contentSelector: ".entry-content",
    fetchDelay: 1500,
  },
  {
    name: "gentlemansgazette",
    discoveryType: "sitemap-index",
    sitemapIndexUrl: "https://www.gentlemansgazette.com/sitemap_index.xml",
    postSitemapPattern: /post-sitemap/,
    titleSelector: "h1.entry-title, h1",
    contentSelector: ".entry-content, .post-content",
    fetchDelay: 2000,
  },
  // hespokestyle: blocked by Cloudflare WAF + NitroPack JS rendering — needs headless browser
  // {
  //   name: "hespokestyle",
  //   discoveryType: "sitemap-index",
  //   sitemapIndexUrl: "https://hespokestyle.com/sitemap_index.xml",
  //   postSitemapPattern: /post-sitemap/,
  //   titleSelector: "h1.entry-title, h1",
  //   contentSelector: ".entry-content, .post-content",
  //   fetchDelay: 2000,
  // },
  {
    name: "apetogentleman",
    discoveryType: "sitemap-index",
    sitemapIndexUrl: "https://www.apetogentleman.com/sitemap_index.xml",
    postSitemapPattern: /post-sitemap/,
    titleSelector: "h1.entry-title, h1",
    contentSelector: ".entry-content, .post-content",
    fetchDelay: 2000,
  },
  {
    name: "realmenrealstyle",
    discoveryType: "sitemap-index",
    sitemapIndexUrl: "http://www.realmenrealstyle.com/sitemap_index.xml/",
    postSitemapPattern: /post-sitemap/,
    titleSelector: "h1.entry-title, h1",
    contentSelector: ".entry-content, .post-content",
    fetchDelay: 2000,
  },
  {
    name: "dappered",
    discoveryType: "sitemap-index",
    sitemapIndexUrl: "https://dappered.com/sitemap.xml",
    postSitemapPattern: /post-sitemap/,
    titleSelector: "h1.entry-title, h1",
    contentSelector: ".entry-content, .post-content",
    fetchDelay: 2000,
  },
  {
    name: "articlesofstyle",
    // Shopify blog — uses a blog sitemap directly, not a sitemap index
    discoveryType: "sitemap-direct",
    postSitemapUrl: "https://articlesofstyle.com/sitemap_blogs_1.xml",
    titleSelector: "h1.article__title, h1.post-title, h1",
    contentSelector: ".blog-content, .article__body, .rte",
    fetchDelay: 2000,
  },
]

// ── URL discovery ─────────────────────────────────────────────────────────────

async function fetchXml(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return res.text()
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map((m) => m[1].trim())
}

async function fetchSitemapUrls(site) {
  if (site.discoveryType === "sitemap-index") {
    console.log(`  Fetching sitemap index: ${site.sitemapIndexUrl}`)
    const indexXml = await fetchXml(site.sitemapIndexUrl)
    const postSitemaps = extractLocs(indexXml).filter((u) => site.postSitemapPattern.test(u))
    console.log(`  Found ${postSitemaps.length} post sitemap(s)`)

    const urls = []
    for (const sitemapUrl of postSitemaps) {
      try {
        const xml = await fetchXml(sitemapUrl)
        urls.push(...extractLocs(xml))
        await sleep(500)
      } catch (e) {
        console.warn(`  Failed to fetch post sitemap ${sitemapUrl}: ${e.message}`)
      }
    }
    return urls
  }

  if (site.discoveryType === "sitemap-direct") {
    console.log(`  Fetching blog sitemap: ${site.postSitemapUrl}`)
    const xml = await fetchXml(site.postSitemapUrl)
    return extractLocs(xml)
  }

  if (site.discoveryType === "rss") {
    console.log(`  Paginating RSS feed: ${site.rssUrl}`)
    const urls = []
    const seen = new Set()
    for (let page = 1; page <= 200; page++) {
      const pageUrl = page === 1 ? site.rssUrl : `${site.rssUrl}?paged=${page}`
      try {
        const xml = await fetchXml(pageUrl)
        // RSS <link> tags contain article URLs (avoid <atom:link> self-reference)
        const links = [...xml.matchAll(/<item>[\s\S]*?<link>\s*([^<]+)\s*<\/link>[\s\S]*?<\/item>/g)]
          .map((m) => m[1].trim())
        if (links.length === 0) break
        const newLinks = links.filter((u) => !seen.has(u))
        if (newLinks.length === 0) break
        newLinks.forEach((u) => seen.add(u))
        urls.push(...newLinks)
        process.stdout.write(`  Page ${page}: ${urls.length} URLs so far...\r`)
        await sleep(1000)
      } catch (e) {
        console.warn(`\n  RSS page ${page} failed: ${e.message}`)
        break
      }
    }
    console.log(`\n  Found ${urls.length} URLs via RSS`)
    return urls
  }

  throw new Error(`Unknown discoveryType: ${site.discoveryType}`)
}

// ── Article extraction ────────────────────────────────────────────────────────

async function fetchArticle(url, site) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } })
    if (!res.ok) return null

    const html = await res.text()
    const $ = load(html)

    // Try each comma-separated selector in order, take first match with content
    const titleSelectors = site.titleSelector.split(",").map((s) => s.trim())
    let title = ""
    for (const sel of titleSelectors) {
      title = $(sel).first().text().trim()
      if (title) break
    }
    if (!title) title = $("title").text().replace(/\s*[|\-–—].*$/, "").trim()

    const contentSelectors = site.contentSelector.split(",").map((s) => s.trim())
    let contentEl = null
    for (const sel of contentSelectors) {
      const el = $(sel).first()
      if (el.length && el.text().trim().length > 100) {
        contentEl = el
        break
      }
    }
    if (!contentEl) return null

    contentEl.find("script, style, nav, footer, aside, figure, .sharedaddy, .jp-relatedposts, .wp-block-buttons, .post-tags, .author-box").remove()
    const text = contentEl.text().replace(/\s+/g, " ").trim()

    if (!text || text.length < 200) return null
    return { title, text, url }
  } catch (e) {
    console.warn(`  Failed ${url}: ${e.message}`)
    return null
  }
}

// ── Chunking ──────────────────────────────────────────────────────────────────

function chunkText(text) {
  const words = text.split(" ")
  const chunks = []
  for (let i = 0; i < words.length; i += CHUNK_WORDS) {
    chunks.push(words.slice(i, i + CHUNK_WORDS).join(" "))
  }
  return chunks.filter((c) => c.trim().length > 50)
}

// ── Embedding + upsert ────────────────────────────────────────────────────────

async function flushRows(rows) {
  // Deduplicate on (url, chunk_index) — some sitemaps list the same URL twice
  const seen = new Set()
  rows = rows.filter((r) => {
    const key = `${r.url}|${r.chunk_index}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  process.stdout.write(`  Embedding ${rows.length} chunks... `)
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: rows.map((r) => r.content),
  })
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

// ── Per-site scrape ───────────────────────────────────────────────────────────

async function scrapeSite(site) {
  console.log(`\n${"─".repeat(60)}`)
  console.log(`Site: ${site.name}`)
  console.log("─".repeat(60))

  let urls
  try {
    urls = await fetchSitemapUrls(site)
  } catch (e) {
    console.error(`  URL discovery failed for ${site.name}: ${e.message}`)
    return
  }

  if (urls.length === 0) {
    console.warn(`  No URLs found for ${site.name} — check sitemap/rss config`)
    return
  }

  console.log(`  Scraping ${urls.length} URLs (${site.fetchDelay}ms delay)...\n`)

  let processed = 0
  let skipped = 0
  const pendingRows = []

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    const label = url.replace(/^https?:\/\/[^/]+/, "").slice(0, 60)
    process.stdout.write(`  [${i + 1}/${urls.length}] ${label}... `)

    const article = await fetchArticle(url, site)
    if (!article) {
      console.log("skipped")
      skipped++
      await sleep(site.fetchDelay)
      continue
    }

    const chunks = chunkText(article.text)
    for (let j = 0; j < chunks.length; j++) {
      pendingRows.push({
        source: site.name,
        title: article.title,
        url,
        chunk_index: j,
        content: chunks[j],
      })
    }
    console.log(`${chunks.length} chunks`)
    processed++

    if (pendingRows.length >= EMBED_BATCH) {
      await flushRows(pendingRows.splice(0, EMBED_BATCH))
    }

    await sleep(site.fetchDelay)
  }

  if (pendingRows.length > 0) {
    await flushRows(pendingRows)
  }

  console.log(`\n  ${site.name}: ${processed} articles, ${skipped} skipped.`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const filter = process.argv[2]?.toLowerCase()
  const sites = filter ? SITES.filter((s) => s.name === filter) : SITES

  if (sites.length === 0) {
    console.error(`No site named "${filter}". Available: ${SITES.map((s) => s.name).join(", ")}`)
    process.exit(1)
  }

  console.log(`Running scraper for: ${sites.map((s) => s.name).join(", ")}`)

  for (const site of sites) {
    await scrapeSite(site)
  }

  console.log("\nAll done.")
}

main().catch((e) => {
  console.error("Fatal error:", e)
  process.exit(1)
})
