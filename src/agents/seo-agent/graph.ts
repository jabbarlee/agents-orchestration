// src/agents/seo-agent/graph.ts
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { SEOAgentState } from "./state";
import { scrapeUrlsNode } from "./nodes/researcher";
import { writeDraftNode } from "./nodes/writer";
import { seoCritiqueNode } from "./nodes/critic";

const SEOAgentStateAnnotation = Annotation.Root({
  targetKeyword: Annotation<string>({ reducer: (a, b) => b, default: () => "" }),
  sourceUrls: Annotation<string[]>({ reducer: (a, b) => b, default: () => [] }),
  researchData: Annotation<string>({ reducer: (a, b) => b, default: () => "" }),
  currentDraft: Annotation<string | null>({ reducer: (a, b) => b, default: () => null }),
  seoFeedback: Annotation<string | null>({ reducer: (a, b) => b, default: () => null }),
  seoScore: Annotation<number>({ reducer: (a, b) => b, default: () => 0 }),
  isApproved: Annotation<boolean>({ reducer: (a, b) => b, default: () => false }),
  iterationCount: Annotation<number>({ reducer: (a, b) => b, default: () => 0 }),
});

export const seoAgentApp = new StateGraph(SEOAgentStateAnnotation)
  .addNode("researcher", scrapeUrlsNode)
  .addNode("writer", writeDraftNode)
  .addNode("critic", seoCritiqueNode)
  .addEdge(START, "researcher")
  .addEdge("researcher", "writer")
  .addEdge("writer", "critic")
  .addConditionalEdges(
    "critic",
    (state: SEOAgentState) => {
      if (state.isApproved) return "approved";
      if (state.iterationCount >= 3) return "approved"; // Escape hatch
      return "needs_revision";
    },
    {
      approved: END,
      needs_revision: "writer", // Loops back to writer
    }
  )
  .compile();
