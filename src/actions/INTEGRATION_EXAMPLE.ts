/**
 * Example Integration: Using Knowledge Base in Chat API Route
 *
 * This is a reference example showing how to integrate the knowledge base
 * search into your chat API route. Copy and adapt this to your needs.
 *
 * Location: src/app/api/agents/aria/chat/route.ts (or your chat endpoint)
 */

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getKnowledgeContext } from "@/actions/search-knowledge-base";

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

    // Extract the user's latest message for knowledge base search
    const userMessage = messages[messages.length - 1];
    const userQuery = userMessage?.role === "user" ? userMessage.content : "";

    // INTEGRATION POINT 1: Search the knowledge base
    // Get up to 5 most relevant documents (with 0.3 similarity threshold)
    // Set tenantId if using multi-tenant isolation
    const knowledgeContext = await getKnowledgeContext(
      userQuery,
      5, // number of results
      0.3, // similarity threshold
      null, // tenantId (optional)
    );

    // INTEGRATION POINT 2: Build enhanced system prompt
    // Include both the agent's original system prompt AND the knowledge context
    const baseSystemPrompt =
      "You are Aria, a luxury real estate intelligence agent. Help users find their dream home.";

    const enhancedSystemPrompt = knowledgeContext
      ? `${baseSystemPrompt}\n\n${knowledgeContext}`
      : baseSystemPrompt;

    // INTEGRATION POINT 3: Make OpenAI call with knowledge-augmented context
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: enhancedSystemPrompt },
        ...messages.map((msg) => ({
          role: msg.role as "system" | "user" | "assistant",
          content: msg.content,
        })),
      ],
    });

    const finalText =
      completion.choices[0]?.message?.content ??
      "I could not generate a response.";

    // Return the response (with optional properties field for tool-based responses)
    return NextResponse.json({
      text: finalText,
      properties: [], // if using property search tools
      knowledgeUsed: knowledgeContext.length > 0, // optional flag indicating KB was used
    });
  } catch (error) {
    console.error("Chat route failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * ADVANCED EXAMPLE: Multi-step RAG with Tool Calling
 *
 * If you want to combine tool calling (for property search) with RAG
 * (retrieval-augmented generation from the knowledge base), here's the flow:
 *
 * 1. User asks: "What's in the Beverly Hills guide?"
 * 2. First OpenAI call with tools → determines it needs knowledge base search
 * 3. Retrieve relevant docs from knowledge base
 * 4. Second OpenAI call with knowledge context → generates response
 *
 * See below for complex example with both property search AND knowledge base:
 */

/*
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getKnowledgeContext, searchKnowledgeBase } from "@/actions/search-knowledge-base";

type RequestMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAIMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body?.messages as RequestMessage[] | undefined;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    // Get user query
    const userMessage = messages[messages.length - 1];
    const userQuery =
      userMessage?.role === "user" ? userMessage.content : "";

    // Step 1: Initial call with system prompt and knowledge context
    const knowledgeContext = await getKnowledgeContext(
      userQuery,
      5,
      0.3,
      null
    );

    const systemPrompt = `You are Aria, a luxury real estate intelligence agent.
${knowledgeContext ? `\n\nYou have access to the following reference materials:\n${knowledgeContext}` : ""}

Use this information to enrich your responses about properties, neighborhoods, and real estate guidance.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((msg) => ({
          role: msg.role as "system" | "user" | "assistant",
          content: msg.content,
        })),
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "search_properties",
            description:
              "Search for luxury real estate listings by location and criteria",
            strict: true,
            parameters: {
              type: "object",
              properties: {
                location: { type: "string" },
                min_bedrooms: { type: "integer" },
                min_budget: { type: "number" },
                max_budget: { type: "number" },
                features: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: [
                "location",
                "min_bedrooms",
                "min_budget",
                "max_budget",
                "features",
              ],
              additionalProperties: false,
            },
          },
        },
        {
          type: "function",
          function: {
            name: "search_knowledge",
            description:
              "Search your knowledge base for information about neighborhoods, properties, or real estate guides",
            strict: true,
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "What to search for in the knowledge base",
                },
                num_results: {
                  type: "integer",
                  description: "Number of results (1-10)",
                  default: 3,
                },
              },
              required: ["query"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: "auto",
    });

    // Step 2: Handle tool calls if any
    if (completion.choices[0]?.finish_reason === "tool_calls") {
      const toolCalls = completion.choices[0]?.message?.tool_calls || [];
      
      // Handle multiple tool calls
      const toolResults: OpenAIMessage[] = [];

      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") continue;

        if (toolCall.function.name === "search_knowledge") {
          const args = JSON.parse(toolCall.function.arguments) as {
            query: string;
            num_results?: number;
          };

          const docs = await searchKnowledgeBase(
            args.query,
            args.num_results || 3,
            0.3
          );

          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(docs),
          } as OpenAIMessage);
        }
      }

      // Step 3: Second call with tool results
      const secondPass = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((msg) => ({
            role: msg.role as "system" | "user" | "assistant",
            content: msg.content,
          })),
          completion.choices[0]?.message as OpenAIMessage,
          ...toolResults,
        ],
      });

      const finalText =
        secondPass.choices[0]?.message?.content ||
        "I found relevant information but could not generate a response.";

      return NextResponse.json({
        text: finalText,
        knowledgeUsed: true,
      });
    }

    // No tool calls, just return the response
    const finalText =
      completion.choices[0]?.message?.content ??
      "I could not generate a response.";

    return NextResponse.json({
      text: finalText,
      knowledgeUsed: knowledgeContext.length > 0,
    });
  } catch (error) {
    console.error("Chat route failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
*/
