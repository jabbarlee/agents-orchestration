import { NextResponse } from "next/server";
import OpenAI from "openai";

type RequestMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAIMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

type SearchPropertiesInput = {
  location: string;
  min_bedrooms: number;
  min_budget: number;
  max_budget: number;
  features: string[];
};

type PropertyListing = {
  id: string;
  address: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  price: number;
  priceLabel: string;
  features: string[];
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MOCK_LISTINGS: PropertyListing[] = [
  {
    id: "prop-1",
    address: "1240 Laurel Way",
    location: "Beverly Hills",
    bedrooms: 5,
    bathrooms: 6,
    price: 9800000,
    priceLabel: "$9.8M",
    features: ["pool", "mountain views", "modern", "smart home"],
  },
  {
    id: "prop-2",
    address: "720 N Rexford Dr",
    location: "Beverly Hills",
    bedrooms: 4,
    bathrooms: 5,
    price: 11200000,
    priceLabel: "$11.2M",
    features: ["pool", "city views", "modern", "gated"],
  },
  {
    id: "prop-3",
    address: "9955 Hidden Valley Rd",
    location: "Beverly Hills",
    bedrooms: 4,
    bathrooms: 4,
    price: 8500000,
    priceLabel: "$8.5M",
    features: ["pool", "mountain views", "modern", "outdoor kitchen"],
  },
  {
    id: "prop-4",
    address: "1016 Bel Air Rd",
    location: "Bel Air",
    bedrooms: 6,
    bathrooms: 7,
    price: 14500000,
    priceLabel: "$14.5M",
    features: ["pool", "mountain views", "modern", "home theater"],
  },
];

function normalizeBudget(value: number) {
  // Treat small numbers as millions (e.g., 8 => 8,000,000).
  return value < 1000 ? value * 1_000_000 : value;
}

function searchProperties(input: SearchPropertiesInput): PropertyListing[] {
  const normalizedMinBudget = normalizeBudget(input.min_budget);
  const normalizedMaxBudget = normalizeBudget(input.max_budget);
  const wantedLocation = input.location.toLowerCase();
  const wantedFeatures = input.features.map((feature) => feature.toLowerCase());

  return MOCK_LISTINGS.filter((listing) => {
    const locationMatches = listing.location
      .toLowerCase()
      .includes(wantedLocation);
    const bedroomsMatch = listing.bedrooms >= input.min_bedrooms;
    const minBudgetMatch = listing.price >= normalizedMinBudget;
    const maxBudgetMatch = listing.price <= normalizedMaxBudget;
    const featuresMatch = wantedFeatures.every((feature) =>
      listing.features.some((listingFeature) =>
        listingFeature.toLowerCase().includes(feature),
      ),
    );

    return (
      locationMatches &&
      bedroomsMatch &&
      minBudgetMatch &&
      maxBudgetMatch &&
      featuresMatch
    );
  }).slice(0, 3);
}

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

    const model = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
    const systemMessage: OpenAIMessage = {
      role: "system",
      content:
        "You are Aria, a luxury real estate intelligence agent. For property search requests, call the search_properties tool before responding. Once tool results are available, provide a short polished summary.",
    };

    const baseMessages: OpenAIMessage[] = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const firstPass = await openai.chat.completions.create({
      model,
      messages: [systemMessage, ...baseMessages],
      tools: [
        {
          type: "function",
          function: {
            name: "search_properties",
            description:
              "Search luxury listings by location, bedrooms, budget range, and desired features.",
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
      ],
      tool_choice: "auto",
    });

    const firstMessage = firstPass.choices[0]?.message;
    const toolCalls = firstMessage?.tool_calls ?? [];

    if (
      firstPass.choices[0]?.finish_reason === "tool_calls" &&
      toolCalls.length > 0
    ) {
      let matchedProperties: PropertyListing[] = [];
      const toolMessages: OpenAIMessage[] = [];

      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") {
          continue;
        }

        if (toolCall.function.name !== "search_properties") {
          continue;
        }

        const args = JSON.parse(
          toolCall.function.arguments,
        ) as SearchPropertiesInput;
        const properties = searchProperties(args);
        matchedProperties = properties;

        toolMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(properties),
        } as OpenAIMessage);
      }

      const secondPassMessages: OpenAIMessage[] = [
        systemMessage,
        ...baseMessages,
        {
          role: "assistant",
          content: firstMessage?.content ?? null,
          tool_calls: firstMessage?.tool_calls,
        } as OpenAIMessage,
        ...toolMessages,
      ];

      const secondPass = await openai.chat.completions.create({
        model,
        messages: secondPassMessages,
      });

      const finalText =
        secondPass.choices[0]?.message?.content ??
        "I found matching properties but could not generate a full summary.";

      return NextResponse.json({
        text: finalText,
        properties: matchedProperties,
      });
    }

    const fallbackText =
      firstMessage?.content ?? "I could not generate a response.";

    return NextResponse.json({ text: fallbackText, properties: [] });
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
