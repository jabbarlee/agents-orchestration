"use client";

import { useState } from "react";

type PropertyListing = {
  id: string;
  address: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  priceLabel: string;
  features: string[];
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  properties?: PropertyListing[];
};

function PropertyCard({ property }: { property: PropertyListing }) {
  return (
    <article className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">
            {property.address}
          </h4>
          <p className="mt-0.5 text-xs text-gray-500">{property.location}</p>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          {property.priceLabel}
        </span>
      </div>

      <p className="mt-3 text-xs text-gray-700">
        {property.bedrooms} BD · {property.bathrooms} BA
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {property.features.map((feature) => (
          <span
            key={`${property.id}-${feature}`}
            className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600"
          >
            {feature}
          </span>
        ))}
      </div>
    </article>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! Ask me a question, and I will respond via the OpenAI API route.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
    };
    const nextMessages = [...messages, newUserMsg];

    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/agents/aria/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      const aiText: string = data?.text ?? "No response returned.";
      const properties: PropertyListing[] = Array.isArray(data?.properties)
        ? data.properties
        : [];

      const newAiMsg: Message = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: aiText,
        properties,
      };
      setMessages((prev) => [...prev, newAiMsg]);
    } catch (error) {
      console.error("Failed to fetch response:", error);
      const errorMsg: Message = {
        id: `${Date.now()}-error`,
        role: "assistant",
        content: "Sorry, I encountered an error connecting to the server.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4 bg-white">
      {/* Chat History Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className="max-w-[75%]">
              <div
                className={`rounded-2xl px-5 py-3 ${
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200"
                }`}
              >
                {m.content}
              </div>

              {m.role === "assistant" &&
              m.properties &&
              m.properties.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {m.properties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 rounded-2xl px-5 py-3 rounded-bl-none animate-pulse">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-black"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
