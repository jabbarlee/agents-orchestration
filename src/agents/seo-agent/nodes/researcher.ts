// src/agents/seo-agent/nodes/researcher.ts
import { SEOAgentState } from "../state";

export async function scrapeUrlsNode(state: SEOAgentState): Promise<Partial<SEOAgentState>> {
  console.log("--> [Node: Researcher] Scraping URLs...");
  
  // Example using Jina Reader API (turns URLs to Markdown)
  const fetchPromises = state.sourceUrls.map(async (url) => {
    try {
      const response = await fetch(`https://r.jina.ai/${url}`);
      return await response.text();
    } catch (e) {
      return `Failed to scrape ${url}`;
    }
  });

  const results = await Promise.all(fetchPromises);
  const combinedResearch = results.join("\n\n---\n\n");

  // We return ONLY the parts of the state we want to update
  return {
    researchData: combinedResearch,
  };
}