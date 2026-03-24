# Knowledge Base Setup & Ingestion Guide

This guide walks you through setting up the vector-based knowledge base in Supabase and ingesting PDF documents.

## Prerequisites

- Supabase project already created
- OpenAI API key with embeddings access (`text-embedding-3-small`)
- PostgreSQL with pgvector extension enabled (default on Supabase)

## Step 1: Run Database Migration

### Option A: Using Supabase Dashboard

1. Go to your Supabase project → **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/migrations/001_create_knowledge_base.sql`
4. Paste into the SQL editor
5. Click **Run**

This will:

- Enable the `pgvector` extension
- Create the `knowledge_base` table with vector column
- Create indexes for efficient cosine similarity search
- Create RPC functions `match_documents` and `insert_knowledge_document`
- Enable Row Level Security (RLS) for tenant isolation

### Option B: Using Supabase CLI (if installed)

```bash
supabase db push
```

## Step 2: Get Your Supabase Service Role Key

The ingestion script needs elevated permissions to insert documents. Follow these steps:

1. Go to your Supabase project settings → **API**
2. Under "Project API Keys", copy the **Service Role** key (not the anon key)
3. Add to your `.env` file:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

## Step 3: Prepare Your PDFs

Create a directory with your PDF files. For example:

```
./docs/
  ├── guide.pdf
  ├── neighborhoods.pdf
  └── listings.pdf
```

## Step 4: Run the Ingestion Script

### Ingest a Single PDF

```bash
npx ts-node src/actions/ingest-documents.ts ./docs/guide.pdf
```

### Ingest All PDFs from a Directory

```bash
npx ts-node src/actions/ingest-documents.ts directory ./docs
```

### Ingest with Multi-Tenant Support

If you have a tenant ID (UUID), you can isolate documents to a specific tenant:

```bash
npx ts-node src/actions/ingest-documents.ts ./docs/guide.pdf 550e8400-e29b-41d4-a716-446655440000
```

### With Directory

```bash
npx ts-node src/actions/ingest-documents.ts directory ./docs 550e8400-e29b-41d4-a716-446655440000
```

## Script Behavior

The ingestion script:

1. **Extracts text** from PDF files
2. **Splits into chunks** of approximately 500 words with 50-word overlaps
3. **Creates embeddings** using OpenAI's `text-embedding-3-small` model
4. **Inserts into Supabase** in batches of 10 documents
5. **Tracks progress** with console output

### Expected Output

```
📚 Found 3 PDF files to process

📄 Processing: ./docs/guide.pdf
✓ Extracted 45230 characters from PDF
✓ Split into 12 chunks

📊 Processing batch 1...
✓ Inserted 10 documents (10/12)

📊 Processing batch 2...
✓ Inserted 2 documents (12/12)

✅ Ingestion complete!
```

## Step 5: Use the Knowledge Base in Your App

### Search with the Utility Function

```typescript
import {
  searchKnowledgeBase,
  getKnowledgeContext,
} from "@/actions/search-knowledge-base";

// Option 1: Get raw documents with similarity scores
const documents = await searchKnowledgeBase(
  "What neighborhoods have pools?",
  5, // number of results
  0.3, // similarity threshold
  null, // tenant_id (optional)
);

// Option 2: Get formatted context for LLM
const context = await getKnowledgeContext(
  "What neighborhoods have pools?",
  3, // number of results
  0.3, // similarity threshold
);
```

### Add to Your API Route

In your chat API route, augment the system prompt with knowledge:

```typescript
import { getKnowledgeContext } from "@/actions/search-knowledge-base";

// In your POST handler:
const userQuery = messages[messages.length - 1]?.content || "";
const knowledgeContext = await getKnowledgeContext(userQuery, 3, 0.3);

const systemPrompt = `You are a helpful assistant. 
${knowledgeContext ? `\n\nRelevant information from your knowledge base:\n${knowledgeContext}` : ""}`;

const completion = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "system", content: systemPrompt }, ...messages],
});
```

## Troubleshooting

### Error: "extension pgvector not found"

The pgvector extension isn't enabled. Go to Supabase Dashboard → Extensions and enable **pgvector**.

### Error: "permission denied for schema public"

Make sure you're using the **Service Role** key, not the anon key, for the ingestion script.

### Error: "RPC function not found"

Re-run the SQL migration to create the RPC functions.

### High API Costs

Ingesting large PDFs will use many embeddings API calls:

- At ~$0.02 per 1M tokens with `text-embedding-3-small`
- A 10,000-word PDF costs roughly $0.10

Batch ingestion and reuse embeddings wisely.

## Database Schema

### knowledge_base Table

| Column       | Type         | Description                             |
| ------------ | ------------ | --------------------------------------- |
| `id`         | BIGSERIAL    | Primary key                             |
| `tenant_id`  | UUID         | Owner/tenant (optional, null = public)  |
| `content`    | TEXT         | The actual text chunk                   |
| `embedding`  | VECTOR(1536) | OpenAI embedding (1536 dimensions)      |
| `created_at` | TIMESTAMP    | When inserted                           |
| `updated_at` | TIMESTAMP    | Last updated                            |
| `source`     | TEXT         | Source file name                        |
| `metadata`   | JSONB        | Additional metadata (chunk index, etc.) |

### Indexes

- `knowledge_base_embedding_idx`: IVFFlat index on embedding (cosine distance)
- `knowledge_base_tenant_id_idx`: B-tree index on tenant_id

### RPC Functions

#### `match_documents(query_embedding, match_count, match_threshold, p_tenant_id)`

Returns the top N most similar documents.

```sql
SELECT id, content, similarity FROM match_documents(
  '[1.2, -0.5, ...]'::vector,
  5,
  0.3,
  NULL
);
```

#### `insert_knowledge_document(p_content, p_embedding, p_tenant_id, p_source, p_metadata)`

Insert a single document (used internally by the ingestion script).

```sql
SELECT id, created_at FROM insert_knowledge_document(
  'Document text...',
  '[1.2, -0.5, ...]'::vector,
  NULL,
  'source.pdf',
  '{"chunkIndex": 0}'
);
```

## Next Steps

1. Ingest your PDF documents using the script above
2. Test the knowledge base with sample queries
3. Integrate into your chat API route
4. Monitor embedding API usage and costs
5. Consider pre-filtering queries by tenant if using multi-tenancy
