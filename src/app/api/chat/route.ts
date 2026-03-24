import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Index } from '@upstash/vector';

// 1. Initialize Upstash Vector (The Semantic Cache)
const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

console.log("Checking API Key:", process.env.OPENAI_API_KEY ? "Loaded successfully" : "MISSING!");

// 2. Initialize OpenAI through Cloudflare AI Gateway (Analytics & Fallback)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // This single line routes all traffic through Cloudflare's edge network
  baseURL: "https://gateway.ai.cloudflare.com/v1/dd493f953a448a7b714ca0a605825183/jabbarlee-personal/openai",
  defaultHeaders: {
    "cf-aig-authorization": `Bearer ${process.env.CF_API_TOKEN}`,
  },
});

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // STEP 1: Turn the user's prompt into a mathematical vector
    // This uses OpenAI's cheapest embedding model.
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: prompt,
    });
    const promptVector = embeddingResponse.data[0].embedding;

    // STEP 2: Query Upstash to see if we've answered this before
    const cacheResults = await index.query({
      vector: promptVector,
      topK: 1, 
      includeMetadata: true,
    });

    // STEP 3: The 95% Threshold Check
    if (cacheResults.length > 0 && cacheResults[0].score > 0.95) {
      console.log("💰 SEMANTIC CACHE HIT!");
      
      // We return the EXACT payload your frontend is expecting
      return NextResponse.json({ 
        text: cacheResults[0].metadata?.response as string,
        source: 'Upstash Semantic Cache (Cost: $0.00)'
      });
    }

    // STEP 4: Cache Miss. Generate the answer using GPT-4o via Cloudflare
    console.log("🧠 CACHE MISS. Routing to OpenAI via Cloudflare...");
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Or gpt-4o-mini for even better margins
      messages: [{ role: 'user', content: prompt }],
    });
    
    const llmResponse = completion.choices[0].message.content;

    // STEP 5: Save this new answer to Upstash so we never pay for it again
    await index.upsert({
      id: crypto.randomUUID(), 
      vector: promptVector,
      metadata: { 
        original_prompt: prompt,
        response: llmResponse 
      }
    });

    // Return the newly generated response to the frontend
    return NextResponse.json({ 
      text: llmResponse,
      source: 'OpenAI via Cloudflare Gateway'
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}