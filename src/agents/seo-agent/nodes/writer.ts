// src/agents/seo-agent/nodes/writer.ts
import OpenAI from "openai";
import { SEOAgentState } from "../state";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function writeDraftNode(state: SEOAgentState): Promise<Partial<SEOAgentState>> {
  console.log(`--> [Node: Writer] Drafting. Iteration: ${state.iterationCount + 1}`);

  const systemPrompt = `You are an expert SEO copywriter. Write a comprehensive, markdown-formatted blog post targeting the keyword: "${state.targetKeyword}". 
  Use the provided research data. 
  ${state.seoFeedback ? `\nCRITICAL FEEDBACK FROM EDITOR TO FIX: ${state.seoFeedback}` : ""}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Research Data:\n${state.researchData}` }
    ],
    temperature: 0.7,
  });

  const draft = response.choices[0].message.content || "";

  return {
    currentDraft: draft,
    iterationCount: state.iterationCount + 1,
  };
}