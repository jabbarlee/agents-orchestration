import { NextResponse } from "next/server";
import { seoAgentApp } from "@/agents/seo-agent/graph";

export async function POST(req: Request) {
  try {
    const { targetKeyword, sourceUrls } = await req.json();

    if (!targetKeyword || typeof targetKeyword !== "string") {
      return NextResponse.json({ error: "targetKeyword is required" }, { status: 400 });
    }

    if (!Array.isArray(sourceUrls) || sourceUrls.length === 0) {
      return NextResponse.json({ error: "At least one source URL is required" }, { status: 400 });
    }

    const finalState = await seoAgentApp.invoke({
      targetKeyword: targetKeyword.trim(),
      sourceUrls,
      iterationCount: 0,
    });

    return NextResponse.json({
      draft: finalState.currentDraft ?? "",
      score: finalState.seoScore ?? 0,
      iterations: finalState.iterationCount ?? 0,
    });
  } catch (error) {
    console.error("generate-seo failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
