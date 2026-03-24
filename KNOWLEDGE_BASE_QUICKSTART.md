# Knowledge Base Quick Start

## What Was Created

### 1. **Database Schema & RPC Functions**

- **File:** `supabase/migrations/001_create_knowledge_base.sql`
- Creates `knowledge_base` table with pgvector support
- Creates `match_documents()` RPC for cosine similarity search
- Creates `insert_knowledge_document()` RPC for ingestion
- Enables Row Level Security for multi-tenant support

### 2. **Ingestion Script**

- **File:** `src/actions/ingest-documents.ts`
- Reads PDF files
- Splits text into ~500-word chunks with 50-word overlap
- Creates embeddings using OpenAI's `text-embedding-3-small`
- Inserts into Supabase with metadata
- Supports single files and directory batch processing

### 3. **Search Utility**

- **File:** `src/actions/search-knowledge-base.ts`
- `searchKnowledgeBase()` - Returns docs with similarity scores
- `getKnowledgeContext()` - Returns formatted context for LLM
- `formatKnowledgeContext()` - Helper to format docs as context

### 4. **Integration Examples**

- **File:** `src/actions/INTEGRATION_EXAMPLE.ts`
- Shows how to augment chat responses with knowledge base
- Simple example: add context to system prompt
- Advanced example: combine with tool calling

### 5. **Documentation**

- **File:** `KNOWLEDGE_BASE_SETUP.md` - Complete setup guide

## Quick Start (5 minutes)

### Step 1: Run the Database Migration

Go to your **Supabase Dashboard** → **SQL Editor** → paste the contents of:

```
supabase/migrations/001_create_knowledge_base.sql
```

Then click **Run**.

### Step 2: Get Your Service Role Key

1. Supabase Dashboard → **Settings** → **API**
2. Copy the **Service Role** secret key
3. Add to `.env`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_key_here
   ```

### Step 3: Prepare Your PDFs

Create a folder with your PDF documents:

```bash
mkdir -p ./docs/knowledge
# Add your PDFs to this folder
```

### Step 4: Run Ingestion

```bash
# Ingest a single PDF
npx ts-node src/actions/ingest-documents.ts ./docs/knowledge/guide.pdf

# Or ingest entire directory
npm run ingest:dir ./docs/knowledge
```

You'll see output like:

```
📚 Found 3 PDF files to process
📄 Processing: ./docs/knowledge/guide.pdf
✓ Extracted 45230 characters from PDF
✓ Split into 12 chunks
✓ Inserted 12 documents (12/12)
✅ Ingestion complete!
```

### Step 5: Use in Your Chat API

Update your chat route (`src/app/api/agents/aria/chat/route.ts`):

```typescript
import { getKnowledgeContext } from "@/actions/search-knowledge-base";

// In your POST handler, before calling OpenAI:
const userQuery = messages[messages.length - 1]?.content || "";
const knowledgeContext = await getKnowledgeContext(userQuery, 5, 0.3);

const systemPrompt = `You are helpful assistant.
${knowledgeContext ? `\n\n${knowledgeContext}` : ""}`;

const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "system", content: systemPrompt }, ...messages],
});
```

## Database Tables

### knowledge_base

```
id          BIGSERIAL PRIMARY KEY
tenant_id   UUID                    (optional, for multi-tenant)
content     TEXT                    (the text chunk)
embedding   VECTOR(1536)            (OpenAI embedding)
created_at  TIMESTAMP
updated_at  TIMESTAMP
source      TEXT                    (source filename)
metadata    JSONB                   (chunk index, etc.)
```

## RPC Functions

### `match_documents(query_embedding, match_count, match_threshold, p_tenant_id)`

Finds the top N most similar documents using cosine similarity.

```sql
SELECT id, content, similarity FROM match_documents(
  embedding_vector,
  5,      -- number of results
  0.3,    -- similarity threshold
  NULL    -- tenant_id (optional)
);
```

### `insert_knowledge_document(p_content, p_embedding, p_tenant_id, p_source, p_metadata)`

Inserts a single document into the knowledge base.

## Scripts

```bash
# Ingest a single PDF
npx ts-node src/actions/ingest-documents.ts ./path/to/file.pdf

# Ingest entire directory
npx ts-node src/actions/ingest-documents.ts directory ./path/to/dir

# With tenant ID (for multi-tenant)
npx ts-node src/actions/ingest-documents.ts ./file.pdf 550e8400-e29b-41d4-a716-446655440000

# Using npm scripts
npm run ingest ./path/to/file.pdf
npm run ingest:dir ./path/to/dir
```

## Costs

Using OpenAI embeddings with `text-embedding-3-small`:

- **Cost:** ~$0.02 per 1 million tokens
- **Example:** A 10,000-word PDF costs roughly **$0.10**
- Each 500-word chunk = ~750 tokens

## Troubleshooting

| Error                          | Solution                                               |
| ------------------------------ | ------------------------------------------------------ |
| "extension pgvector not found" | Enable pgvector in Supabase Extensions                 |
| "permission denied"            | Use Service Role key, not anon key                     |
| "RPC function not found"       | Re-run the SQL migration                               |
| "Cannot find module pdf-parse" | Run `npm install` to ensure dependencies are installed |
| High API costs                 | Consider batching ingestions or using cheaper models   |

## Next Steps

1. ✅ Create database schema
2. ✅ Ingest your PDFs
3. 🔄 Add knowledge context to your chat API
4. 🔄 Test retrieval with sample queries
5. 🔄 Monitor embedding API costs
6. 🔄 Fine-tune similarity threshold based on results

See `KNOWLEDGE_BASE_SETUP.md` for detailed documentation.
