// src/agents/seo-agent/nodes/critic.ts
import OpenAI from "openai";
import { z } from "zod/v3";
import { zodToJsonSchema } from "zod-to-json-schema";
import { SEOAgentState } from "../state";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 1. Define the exact shape we want back using Zod
const SEOCritiqueSchema = z.object({
  seoScore: z.number().min(0).max(100).describe("Score out of 100 based on keyword density and structure"),
  isApproved: z.boolean().describe("True if score > 85 and no major issues exist"),
  seoFeedback: z.string().describe("Specific instructions for the writer on what to fix if not approved"),
});

// 2. Convert to JSON Schema for OpenAI
const jsonSchema = zodToJsonSchema(SEOCritiqueSchema, "SEOCritique");

export async function seoCritiqueNode(state: SEOAgentState): Promise<Partial<SEOAgentState>> {
  console.log("--> [Node: Critic] Analyzing draft for SEO...");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { 
        role: "system", 
        content: `Analyze this blog post for the keyword: "${state.targetKeyword}". Check H2/H3 structure, keyword density, and readability.` 
      },
      { role: "user", content: state.currentDraft || "" }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "seo_critique",
        schema: jsonSchema.definitions!.SEOCritique,
        strict: true // Forces OpenAI to adhere 100% to the schema
      }
    },
    temperature: 0.1, // Keep it analytical, not creative
  });

  const outputRaw = response.choices[0].message.content;
  if (!outputRaw) throw new Error("No output from critic.");

  // Parse the guaranteed JSON string back into our TS types
  const parsedCritique = JSON.parse(outputRaw) as z.infer<typeof SEOCritiqueSchema>;

  console.log(`[Critic Score]: ${parsedCritique.seoScore} - Approved: ${parsedCritique.isApproved}`);

  return {
    seoScore: parsedCritique.seoScore,
    isApproved: parsedCritique.isApproved,
    seoFeedback: parsedCritique.seoFeedback,
  };
}