import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// pdf-parse doesn't have proper ES6 exports, use require
// @ts-ignore
const pdfParse = require("pdf-parse");

dotenv.config({ path: ".env.local" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!,
);

interface ChunkMetadata {
  source: string;
  chunkIndex: number;
  totalChunks: number;
}

/**
 * Split text into chunks of approximately 500 words
 * Respects sentence boundaries to avoid cutting mid-sentence
 */
function splitTextIntoChunks(
  text: string,
  wordsPerChunk: number = 500,
  overlapWords: number = 50,
): string[] {
  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentWordCount = 0;

  for (const sentence of sentences) {
    const sentenceWordCount = sentence.trim().split(/\s+/).length;
    const totalWords = currentWordCount + sentenceWordCount;

    if (totalWords > wordsPerChunk && currentChunk.length > 0) {
      // Save current chunk
      chunks.push(currentChunk.join(" ").trim());

      // Start new chunk with overlap
      const overlapSentences = Math.ceil(overlapWords / 15); // Approx 15 words per sentence
      currentChunk = currentChunk.slice(-overlapSentences);
      currentWordCount = currentChunk.join(" ").split(/\s+/).length;
    }

    currentChunk.push(sentence.trim());
    currentWordCount += sentenceWordCount;
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" ").trim());
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

/**
 * Extract text from PDF file
 */
async function extractTextFromPdf(filePath: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(fileBuffer);
  return data.text;
}

/**
 * Create embedding for a text chunk using OpenAI
 */
async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  return response.data[0].embedding;
}

/**
 * Ingest a PDF file into the knowledge base
 */
async function ingestPdfFile(
  filePath: string,
  tenantId: string | null = null,
  batchSize: number = 10,
): Promise<void> {
  console.log(`\n📄 Processing: ${filePath}`);

  // Extract text from PDF
  const text = await extractTextFromPdf(filePath);
  console.log(`✓ Extracted ${text.length} characters from PDF`);

  // Split into chunks
  const chunks = splitTextIntoChunks(text, 500, 50);
  console.log(`✓ Split into ${chunks.length} chunks`);

  // Process chunks in batches
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    console.log(`\n📊 Processing batch ${Math.floor(i / batchSize) + 1}...`);

    const embeddingRequests = batch.map((chunk) => createEmbedding(chunk));
    const embeddings = await Promise.all(embeddingRequests);

    // Insert into Supabase
    const documents = batch.map((chunk, index) => ({
      content: chunk,
      embedding: embeddings[index],
      tenant_id: tenantId,
      source: path.basename(filePath),
      metadata: {
        chunkIndex: Math.floor(i / batchSize) * batchSize + index,
        totalChunks: chunks.length,
      } as ChunkMetadata,
    }));

    const { data, error } = await supabase
      .from("knowledge_base")
      .insert(documents)
      .select("id");

    if (error) {
      console.error(
        `✗ Error inserting batch ${Math.floor(i / batchSize) + 1}:`,
        error,
      );
      throw error;
    }

    console.log(
      `✓ Inserted ${data?.length || 0} documents (${i + batch.length}/${chunks.length})`,
    );

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/**
 * Ingest all PDF files from a directory
 */
async function ingestDirectory(
  dirPath: string,
  tenantId: string | null = null,
): Promise<void> {
  if (!fs.existsSync(dirPath)) {
    console.error(`❌ Directory not found: ${dirPath}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(dirPath)
    .filter((file) => file.toLowerCase().endsWith(".pdf"))
    .map((file) => path.join(dirPath, file));

  console.log(`📚 Found ${files.length} PDF files to process`);

  for (const filePath of files) {
    try {
      await ingestPdfFile(filePath, tenantId);
    } catch (error) {
      console.error(`❌ Failed to ingest ${filePath}:`, error);
      // Continue with next file instead of stopping
    }
  }

  console.log("\n✅ Ingestion complete!");
}

// CLI argument parsing
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log("Usage:");
  console.log(
    "  npx ts-node src/actions/ingest-documents.ts <pdf-path> [tenant-id]",
  );
  console.log(
    "  npx ts-node src/actions/ingest-documents.ts directory <dir-path> [tenant-id]",
  );
  console.log("\nExamples:");
  console.log("  npx ts-node src/actions/ingest-documents.ts ./docs/guide.pdf");
  console.log("  npx ts-node src/actions/ingest-documents.ts directory ./docs");
  console.log(
    "  npx ts-node src/actions/ingest-documents.ts ./docs/guide.pdf 550e8400-e29b-41d4-a716-446655440000",
  );
  process.exit(0);
}

async function main() {
  if (command === "directory") {
    const dirPath = args[1];
    const tenantId = args[2] || null;

    if (!dirPath) {
      console.error("❌ Directory path is required for directory mode");
      process.exit(1);
    }

    await ingestDirectory(dirPath, tenantId);
  } else {
    const filePath = command;
    const tenantId = args[1] || null;

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    try {
      await ingestPdfFile(filePath, tenantId);
      console.log("\n✅ Ingestion complete!");
    } catch (error) {
      console.error("❌ Ingestion failed:", error);
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
