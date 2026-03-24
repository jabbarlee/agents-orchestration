import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
);

export interface KnowledgeDocument {
  id: number;
  content: string;
  similarity: number;
}

/**
 * Search the knowledge base for documents similar to a query
 * @param query - The search query
 * @param matchCount - Number of results to return (default: 5)
 * @param matchThreshold - Minimum similarity score (default: 0.3)
 * @param tenantId - Optional tenant ID for multi-tenant isolation
 * @returns Array of matching documents with similarity scores
 */
export async function searchKnowledgeBase(
  query: string,
  matchCount: number = 5,
  matchThreshold: number = 0.3,
  tenantId: string | null = null,
): Promise<KnowledgeDocument[]> {
  try {
    // Create embedding for the query
    const queryEmbedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
      encoding_format: "float",
    });

    const embedding = queryEmbedding.data[0].embedding;

    // Call the RPC function
    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: embedding,
      match_count: matchCount,
      match_threshold: matchThreshold,
      p_tenant_id: tenantId,
    });

    if (error) {
      console.error("Error calling match_documents RPC:", error);
      return [];
    }

    return (data as KnowledgeDocument[]) || [];
  } catch (error) {
    console.error("Error searching knowledge base:", error);
    return [];
  }
}

/**
 * Format knowledge documents as context for the LLM
 * @param documents - Array of knowledge documents
 * @returns Formatted context string
 */
export function formatKnowledgeContext(documents: KnowledgeDocument[]): string {
  if (documents.length === 0) {
    return "";
  }

  const header = "**Relevant information from knowledge base:**\n";
  const context = documents
    .map((doc, index) => `[Source ${index + 1}] ${doc.content}`)
    .join("\n\n");

  return header + context;
}

/**
 * Search knowledge base and return formatted context for inclusion in LLM prompt
 * @param query - The search query
 * @param matchCount - Number of results to return
 * @param matchThreshold - Minimum similarity score
 * @param tenantId - Optional tenant ID
 * @returns Formatted context string ready for LLM use
 */
export async function getKnowledgeContext(
  query: string,
  matchCount: number = 3,
  matchThreshold: number = 0.3,
  tenantId: string | null = null,
): Promise<string> {
  const documents = await searchKnowledgeBase(
    query,
    matchCount,
    matchThreshold,
    tenantId,
  );

  return formatKnowledgeContext(documents);
}
