"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Loader2,
  RotateCcw,
  SendHorizontal,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

type ApiChatMessage = {
  role: ChatRole;
  content: string;
};

const STARTER_PROMPTS = [
  "Find me a 2-bedroom under $450k in a walkable area.",
  "What should I ask during an open house?",
  "How much down payment do I need to avoid PMI?",
] as const;

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Hi! I am your real estate assistant. Share your budget, preferred location, and must-haves, and I can suggest a shortlisting strategy and key questions for agents.",
    createdAt: Date.now(),
  },
];

export default function RealEstateAgentPage() {
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
      createdAt: Date.now(),
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

      const data = (await response.json()) as {
        reply?: string;
        error?: string;
      };

      if (!response.ok || !data.reply) {
        throw new Error(data.error || "Failed to get assistant response.");
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const fallbackMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          error instanceof Error
            ? `Sorry, something went wrong: ${error.message}`
            : "Sorry, something went wrong while contacting the API.",
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitMessage(input);
  };

  const handleStarterPrompt = async (prompt: string) => {
    await submitMessage(prompt);
  };

  const resetConversation = () => {
    setMessages(INITIAL_MESSAGES);
    setInput("");
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
        <section
          aria-label="Modern home exterior"
          className="min-h-[40vh] bg-cover bg-center md:min-h-screen"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=80')",
          }}
        />

        <section className="flex min-h-screen items-stretch bg-background p-0">
          <Card className="flex h-full w-full flex-col rounded-none border-y-0 border-r-0 bg-background/95 shadow-none backdrop-blur">
            <CardHeader className="space-y-4 border-b border-border/70 px-6 py-6 sm:px-8">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div>
                    <CardTitle className="text-xl">
                      Real Estate Agent Chat
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Advisory assistant for buying decisions
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={resetConversation}>
                  <RotateCcw className="size-4" />
                  New chat
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <Button
                    key={prompt}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-full border border-border/70 bg-muted/60"
                    onClick={() => void handleStarterPrompt(prompt)}
                    disabled={isLoading}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              <ScrollArea className="min-h-0 flex-1 px-6 py-5 sm:px-8">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <Card
                      key={message.id}
                      className={
                        message.role === "user"
                          ? "ml-auto w-[84%] border-primary/20 bg-primary/10 shadow-sm sm:w-[78%]"
                          : "mr-auto w-[84%] border-border/80 bg-card shadow-sm sm:w-[78%]"
                      }
                    >
                      <CardContent className="space-y-2 p-3">
                        <Badge
                          variant={
                            message.role === "assistant"
                              ? "secondary"
                              : "default"
                          }
                          className="inline-flex rounded-full px-2.5 py-1 text-[11px]"
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
                        <p className="text-[13px] leading-relaxed text-foreground sm:text-sm">
                          {message.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))}

                  {isLoading && (
                    <Card className="mr-auto w-[84%] border-border/80 bg-card shadow-sm sm:w-[78%]">
                      <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                        <Bot className="size-4" />
                        <Loader2 className="size-4 animate-spin" />
                        Agent is typing...
                      </CardContent>
                    </Card>
                  )}

                  <div ref={scrollBottomRef} />
                </div>
              </ScrollArea>

              <form
                onSubmit={handleSubmit}
                className="border-t border-border/70 bg-background/90 px-6 py-5 sm:px-8"
              >
                <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 p-2">
                  <Input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask about neighborhoods, budgets, offers, or closing costs..."
                    disabled={isLoading}
                    autoComplete="off"
                    className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
                  />
                  <Button
                    type="submit"
                    disabled={!canSend}
                    className="h-10 rounded-lg px-4"
                  >
                    <SendHorizontal className="size-4" />
                    Send
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
