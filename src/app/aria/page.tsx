"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Compass,
  Loader2,
  MapPin,
  SendHorizontal,
  Sparkles,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type ApiChatMessage = {
  role: ChatRole;
  content: string;
};

const STARTER_PROMPTS = [
  "Find me a 3-bed house under $500k in Austin.",
  "Show condos in walkable neighborhoods.",
  "What should I ask before making an offer?",
] as const;

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "aria-welcome",
    role: "assistant",
    content:
      "Hi, I am Aria. Tell me your budget, bedrooms, and location, and I can search listings and summarize your best options.",
  },
];

export default function AriaPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isLoading]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !isLoading,
    [input, isLoading],
  );

  const submitMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    const apiMessages: ApiChatMessage[] = nextMessages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    try {
      const response = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok || !data.reply) {
        throw new Error(data.error || "Failed to get assistant response.");
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const fallback: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          error instanceof Error
            ? `Sorry, something went wrong: ${error.message}`
            : "Sorry, something went wrong while contacting the API.",
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitMessage(input);
  };

  return (
    <main className="min-h-screen bg-black">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
        <section
          aria-label="Luxury home exterior"
          className="relative min-h-[44vh] overflow-hidden bg-cover bg-center md:min-h-screen"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1773407377322-fb2721bb99a5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-black/65" />

          <div className="relative flex h-full flex-col justify-end gap-4 px-7 py-8 text-white sm:px-10 sm:py-10">
            <Badge className="w-fit border border-white/35 bg-white/15 text-white backdrop-blur">
              <Sparkles className="size-3.5" />
              Real Estate AI
            </Badge>

            <div className="space-y-2">
              <h1 className="max-w-md text-3xl font-semibold leading-tight sm:text-4xl">
                Aria Finds Homes That Match Real Life
              </h1>
              <p className="max-w-lg text-sm text-white/85 sm:text-base">
                Search by budget, bedrooms, and neighborhood priorities in one chat.
              </p>
            </div>

            <div className="grid max-w-lg grid-cols-1 gap-2 text-xs text-white/95 sm:grid-cols-3 sm:text-sm">
              <Card className="border-white/30 bg-black/25 text-white shadow-none backdrop-blur-sm">
                <CardContent className="flex items-center gap-2 p-3">
                  <MapPin className="size-4" />
                  Location smart
                </CardContent>
              </Card>
              <Card className="border-white/30 bg-black/25 text-white shadow-none backdrop-blur-sm">
                <CardContent className="flex items-center gap-2 p-3">
                  <Compass className="size-4" />
                  Market aware
                </CardContent>
              </Card>
              <Card className="border-white/30 bg-black/25 text-white shadow-none backdrop-blur-sm">
                <CardContent className="flex items-center gap-2 p-3">
                  <Sparkles className="size-4" />
                  Instant shortlist
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen flex-col bg-[#F2F5F0]">
          <header className="flex h-20 items-center justify-between border-b border-[#2D5A3D20] bg-white px-6 sm:px-8">
            <div className="space-y-0.5">
              <p className="text-xl font-semibold text-[#1D3927]">Aria</p>
              <p className="text-xs text-[#3E5A46]">Real Estate AI Chat</p>
            </div>
            <Badge className="border-0 bg-[#E8F1E8] text-[#2D5A3D]">Online</Badge>
          </header>

          <ScrollArea className="h-[calc(100vh-172px)] px-6 py-7 sm:px-8">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <Card
                    className={`max-w-[84%] rounded-2xl shadow-sm ${
                      message.role === "user"
                        ? "border-[#2D5A3D20] bg-[#DBE9DB]"
                        : "border-[#DAE3D8] bg-white"
                    }`}
                  >
                    <CardContent className="space-y-2 p-3">
                      <Badge
                        className={`inline-flex rounded-full border-0 text-[11px] ${
                          message.role === "user"
                            ? "bg-[#2D5A3D] text-white"
                            : "bg-[#EEF2EC] text-[#2D5A3D]"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <>
                            <Bot className="size-3.5" />
                            Agent
                          </>
                        ) : (
                          <>
                            <UserRound className="size-3.5" />
                            You
                          </>
                        )}
                      </Badge>
                      <p className="text-sm leading-relaxed text-[#1F3327]">{message.content}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}

              {isLoading && (
                <Card className="max-w-[84%] rounded-2xl border-[#DAE3D8] bg-white shadow-sm">
                  <CardContent className="flex items-center gap-2 p-3 text-sm text-[#49604E]">
                    <Bot className="size-4" />
                    <Loader2 className="size-4 animate-spin" />
                    Aria is searching listings...
                  </CardContent>
                </Card>
              )}

              <div ref={scrollBottomRef} />
            </div>
          </ScrollArea>

          <form
            onSubmit={handleSubmit}
            className="space-y-3 border-t border-[#2D5A3D30] bg-[#F8FAF6] px-6 py-4 sm:px-8"
          >
            <div className="flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="rounded-full border border-[#D8E4D7] bg-white text-[#2D5A3D] hover:bg-[#EEF5EC]"
                  onClick={() => void submitMessage(prompt)}
                  disabled={isLoading}
                >
                  {prompt}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-[#CFDACD] bg-white p-2">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask Aria for homes, neighborhoods, or offer strategy..."
                disabled={isLoading}
                autoComplete="off"
                className="h-10 border-0 bg-transparent text-[#1F3327] shadow-none placeholder:text-[#6A7E71] focus-visible:ring-0"
              />
              <Button
                type="submit"
                disabled={!canSend}
                className="h-10 rounded-lg bg-[#2D5A3D] px-4 text-white hover:bg-[#21492F]"
              >
                <SendHorizontal className="size-4" />
                Send
              </Button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
