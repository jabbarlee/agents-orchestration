-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge_base table
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  source TEXT,
  metadata JSONB
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx ON public.knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create index for tenant_id
CREATE INDEX IF NOT EXISTS knowledge_base_tenant_id_idx ON public.knowledge_base(tenant_id);

-- Create RPC function for matching documents via cosine similarity
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.3,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  similarity FLOAT
) LANGUAGE SQL STABLE AS $$
  SELECT
    knowledge_base.id,
    knowledge_base.content,
    (1 - (knowledge_base.embedding <=> query_embedding)) AS similarity
  FROM knowledge_base
  WHERE 
    (p_tenant_id IS NULL OR knowledge_base.tenant_id = p_tenant_id)
    AND (1 - (knowledge_base.embedding <=> query_embedding)) > match_threshold
  ORDER BY knowledge_base.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Create RPC function for inserting documents with embedding
CREATE OR REPLACE FUNCTION insert_knowledge_document(
  p_content TEXT,
  p_embedding VECTOR(1536),
  p_tenant_id UUID DEFAULT NULL,
  p_source TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE
) LANGUAGE SQL AS $$
  INSERT INTO knowledge_base (content, embedding, tenant_id, source, metadata)
  VALUES (p_content, p_embedding, p_tenant_id, p_source, p_metadata)
  RETURNING knowledge_base.id, knowledge_base.created_at;
$$;

-- Enable RLS (Row Level Security)
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for tenant isolation (optional)
-- Users can only see their own tenant's documents
CREATE POLICY "Users can read their tenant documents"
  ON public.knowledge_base
  FOR SELECT
  USING (
    auth.uid() = tenant_id OR tenant_id IS NULL
  );

CREATE POLICY "Users can insert into their tenant"
  ON public.knowledge_base
  FOR INSERT
  WITH CHECK (
    auth.uid() = tenant_id OR tenant_id IS NULL
  );
