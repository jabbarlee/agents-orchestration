import { NextResponse } from "next/server";
import OpenAI from "openai";

type RequestMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body?.messages as RequestMessage[] | undefined;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 },
      );
    }

    const hasInvalidMessage = messages.some(
      (message) =>
        !message ||
        (message.role !== "system" &&
          message.role !== "user" &&
          message.role !== "assistant") ||
        typeof message.content !== "string",
    );

    if (hasInvalidMessage) {
      return NextResponse.json(
        { error: "Each message must have a valid role and string content" },
        { status: 400 },
      );
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
      messages,
    });

    return NextResponse.json(completion);
  } catch (error) {
    console.error("aria chat route failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
