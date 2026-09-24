-- ================================================================
-- CIVICSHIELD AI - SCHEMA MIGRATION 003
-- Fix Embeddings Dimension & Add Telegram Chat ID for Reports
-- ================================================================

-- 1. Fix the Embeddings Table Dimension
-- The Gemini embedding model `gemini-embedding-001` returns 3072 dimensions, 
-- but the original schema was created for `text-embedding-004` (768).
-- We must drop the vector index and alter the column type.
-- Note: pgvector's ivfflat index only supports up to 2000 dimensions, 
-- so for 3072 dimensions, we will rely on Exact Nearest Neighbor (Sequential Scan) 
-- which is perfectly fast for datasets under 100,000 rows.

DROP INDEX IF EXISTS idx_embeddings_vector;

ALTER TABLE public.embeddings
ALTER COLUMN embedding TYPE vector(3072);

-- 2. Add Telegram Chat ID for native Citizen Pingback Support
-- This allows us to send push notifications to citizens when cases are resolved.
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
