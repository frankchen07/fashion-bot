CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE articles (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  source TEXT,
  embedding VECTOR(1536),
  UNIQUE (url, chunk_index)
);

CREATE INDEX ON articles USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE OR REPLACE FUNCTION match_articles(query_embedding VECTOR(1536), match_count INT)
RETURNS TABLE(id BIGINT, title TEXT, content TEXT, source TEXT, similarity FLOAT)
LANGUAGE sql STABLE
AS $$
  SELECT id, title, content, source,
    1 - (embedding <=> query_embedding) AS similarity
  FROM articles
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
