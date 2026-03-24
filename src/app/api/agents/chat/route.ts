import { NextResponse } from "next/server";
import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type QueryListingsArgs = {
  max_price: number;
  bedrooms: number;
  location?: string;
  property_type?: "house" | "condo" | "townhome" | "any";
};

type Listing = {
  id: string;
  title: string;
  location: string;
  price: number;
  bedrooms: number;
  property_type: "house" | "condo" | "townhome";
  sqft: number;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "query_listings",
      description:
        "Search available real estate listings by budget and bedroom count, optionally filtered by location and property type.",
      parameters: {
        type: "object",
        properties: {
          max_price: {
            type: "number",
            description: "Maximum listing price in USD.",
          },
          bedrooms: {
            type: "integer",
            description: "Minimum number of bedrooms required.",
          },
          location: {
            type: "string",
            description: "Preferred city or neighborhood.",
          },
          property_type: {
            type: "string",
            enum: ["house", "condo", "townhome", "any"],
            description: "Desired property type.",
          },
        },
        required: ["max_price", "bedrooms"],
        additionalProperties: false,
      },
    },
  },
];

const MOCK_LISTINGS: Listing[] = [
  {
    id: "L-1001",
    title: "Sunset Ridge Family Home",
    location: "Austin",
    price: 445000,
    bedrooms: 3,
    property_type: "house",
    sqft: 1820,
  },
  {
    id: "L-1002",
    title: "Zilker Modern Condo",
    location: "Austin",
    price: 389000,
    bedrooms: 2,
    property_type: "condo",
    sqft: 1190,
  },
  {
    id: "L-1003",
    title: "Maple Grove Townhome",
    location: "Dallas",
    price: 410000,
    bedrooms: 3,
    property_type: "townhome",
    sqft: 1540,
  },
  {
    id: "L-1004",
    title: "Lakeside Starter House",
    location: "Dallas",
    price: 329000,
    bedrooms: 2,
    property_type: "house",
    sqft: 1280,
  },
  {
    id: "L-1005",
    title: "Downtown Skyline Condo",
    location: "Seattle",
    price: 520000,
    bedrooms: 2,
    property_type: "condo",
    sqft: 1085,
  },
];

function safeParseQueryArgs(raw: string): QueryListingsArgs {
  const parsed = JSON.parse(raw) as Partial<QueryListingsArgs>;

  if (typeof parsed.max_price !== "number" || Number.isNaN(parsed.max_price)) {
    throw new Error("query_listings.max_price must be a number.");
  }
  if (!Number.isInteger(parsed.bedrooms)) {
    throw new Error("query_listings.bedrooms must be an integer.");
  }

  const propertyType = parsed.property_type ?? "any";
  if (!["house", "condo", "townhome", "any"].includes(propertyType)) {
    throw new Error("query_listings.property_type is invalid.");
  }

  const maxPrice = parsed.max_price as number;
  const bedrooms = parsed.bedrooms as number;

  return {
    max_price: maxPrice,
    bedrooms,
    location: parsed.location,
    property_type: propertyType,
  };
}

function queryListings(args: QueryListingsArgs): Listing[] {
  return MOCK_LISTINGS.filter((listing) => {
    const withinBudget = listing.price <= args.max_price;
    const hasBedrooms = listing.bedrooms >= args.bedrooms;
    const locationMatch = args.location
      ? listing.location.toLowerCase().includes(args.location.toLowerCase())
      : true;
    const typeMatch =
      !args.property_type || args.property_type === "any"
        ? true
        : listing.property_type === args.property_type;

    return withinBudget && hasBedrooms && locationMatch && typeMatch;
  });
}

function toOpenAiMessages(
  incomingMessages: ChatMessage[],
): ChatCompletionMessageParam[] {
  return incomingMessages
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        Boolean(message.content?.trim()),
    )
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }));
}

async function runAgentLoop(
  baseMessages: ChatCompletionMessageParam[],
): Promise<string> {
  const conversation: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a real-estate assistant. When the user asks for homes/listings, call query_listings with concrete numeric filters before giving recommendations.",
    },
    ...baseMessages,
  ];

  for (let i = 0; i < 6; i += 1) {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: conversation,
      tools,
      tool_choice: "auto",
    });

    const choice = completion.choices[0];
    const assistantMessage = choice?.message;

    if (!assistantMessage) {
      throw new Error("OpenAI returned an empty completion.");
    }

    conversation.push({
      role: "assistant",
      content: assistantMessage.content ?? "",
      tool_calls: assistantMessage.tool_calls,
    });

    if (
      choice.finish_reason === "tool_calls" &&
      assistantMessage.tool_calls?.length
    ) {
      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== "function") {
          continue;
        }

        if (toolCall.function.name !== "query_listings") {
          conversation.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error: `Unknown tool: ${toolCall.function.name}`,
            }),
          });
          continue;
        }

        try {
          const parsedArgs = safeParseQueryArgs(toolCall.function.arguments);
          const matches = queryListings(parsedArgs);

          conversation.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              tool: "query_listings",
              args: parsedArgs,
              total_matches: matches.length,
              listings: matches,
              note: "This is a mock data source now and can be swapped with the scraper bot later.",
            }),
          });
        } catch (error) {
          conversation.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to execute query_listings",
            }),
          });
        }
      }

      continue;
    }

    const finalText = assistantMessage.content?.trim();
    if (finalText) {
      return finalText;
    }
  }

  throw new Error("Agent loop exceeded max tool iterations.");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: ChatMessage[] };
    const incomingMessages = body.messages;

    if (!Array.isArray(incomingMessages) || incomingMessages.length === 0) {
      return NextResponse.json(
        { error: "A non-empty messages array is required." },
        { status: 400 },
      );
    }

    const messages = toOpenAiMessages(incomingMessages);

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "No valid chat messages were provided." },
        { status: 400 },
      );
    }

    const reply = await runAgentLoop(messages);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error", error);
    return NextResponse.json(
      { error: "Failed to generate chat completion." },
      { status: 500 },
    );
  }
}
