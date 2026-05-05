-- Run this in Supabase SQL Editor before running the scraper

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Create articles table
create table if not exists articles (
  id bigserial primary key,
  title text,
  url text,
  chunk_index int,
  content text,
  embedding vector(1536),
  unique (url, chunk_index)
);

-- 3. Index for fast cosine similarity search
create index if not exists articles_embedding_idx
  on articles using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 4. Source column (run once after initial setup — safe to re-run)
alter table articles add column if not exists source text;
update articles set source = 'dieworkwear' where source is null;

-- 5. Similarity search RPC used by the app
create or replace function match_articles(
  query_embedding vector(1536),
  match_count int default 12
)
returns table (
  id bigint,
  title text,
  url text,
  content text,
  source text,
  similarity float
)
language sql stable
as $$
  select
    id,
    title,
    url,
    content,
    source,
    1 - (embedding <=> query_embedding) as similarity
  from articles
  order by embedding <=> query_embedding
  limit match_count;
$$;
