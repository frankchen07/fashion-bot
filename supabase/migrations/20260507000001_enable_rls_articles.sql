-- Enable RLS on articles table.
-- Anon key gets read-only access for RAG queries.
-- All writes (scraper upserts) require the service role key which bypasses RLS.

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select"
  ON articles
  FOR SELECT
  TO anon
  USING (true);
