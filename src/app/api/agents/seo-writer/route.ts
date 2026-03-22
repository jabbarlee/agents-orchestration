import { NextResponse } from "next/server";
import { seoAgentApp } from "@/agents/seo-agent/graph";

export async function POST(req: Request) {
  try {
    const { targetKeyword, sourceUrls } = await req.json();

    if (!targetKeyword || !sourceUrls || sourceUrls.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // .invoke() runs the entire graph to completion
    const finalState = await seoAgentApp.invoke({
      targetKeyword,
      sourceUrls,
      iterationCount: 0,
    });

    return NextResponse.json({
      success: true,
      draft: finalState.currentDraft,
      score: finalState.seoScore,
      iterations: finalState.iterationCount
    });

  } catch (error) {
    console.error("Agent execution failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}