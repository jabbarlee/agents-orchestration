"use client";

import {
  Building2,
  Calendar,
  ChevronRight,
  Ellipsis,
  MapPin,
  Search,
  Send,
  TrendingUp,
} from "lucide-react";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { FormEvent, useEffect, useRef, useState } from "react";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
});

const propertyItems = [
  {
    name: "1240 Laurel Way - $9.8M",
    details: "5 BD - 6 BA - Pool - Canyon Views",
  },
  {
    name: "720 N Rexford Dr - $11.2M",
    details: "4 BD - 5 BA - Infinity Pool - City Views",
  },
  {
    name: "9955 Hidden Valley Rd - $8.5M",
    details: "4 BD - 4 BA - Heated Pool - Mountain Views",
  },
];

const suggestions: Array<{ icon: typeof MapPin; label: string }> = [
  { icon: MapPin, label: "Show map view" },
  { icon: Calendar, label: "Schedule a tour" },
  { icon: TrendingUp, label: "Compare prices" },
];

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  time: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: "a1",
    role: "assistant",
    text: "Good morning! I'm Aria, your personal real estate intelligence agent. I have access to thousands of luxury listings across prime markets. How may I assist you today?",
    time: "9:41 AM",
  },
  {
    id: "u1",
    role: "user",
    text: "I'm looking for a 4-bedroom modern home in Beverly Hills with a pool and mountain views. Budget is around $8-12 million.",
    time: "9:43 AM",
  },
  {
    id: "a2",
    role: "assistant",
    text: "Excellent taste. I've found 3 exceptional properties matching your criteria in Beverly Hills and Bel Air. Here's a curated summary:",
    time: "9:44 AM",
  },
];

function formatTime() {
  return new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AriaPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setIsTyping(false), 1400);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        text: trimmed,
        time: formatTime(),
      },
    ]);
    setInput("");
    setIsTyping(true);

    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: `Great request. I can shortlist options for "${trimmed}". Would you like me to prioritize schools, commute time, or investment upside first?`,
          time: formatTime(),
        },
      ]);
      setIsTyping(false);
    }, 900);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (label: string) => {
    setInput(label);
    inputRef.current?.focus();
  };

  const handlePropertySelect = (name: string) => {
    setSelectedProperty(name);
    setInput(`Tell me more about ${name}.`);
    inputRef.current?.focus();
  };

  return (
    <main className={`${inter.className} h-dvh w-full bg-[#F2F5F0]`}>
      <div className="grid h-full w-full grid-cols-1 lg:grid-cols-2">
        <section
          aria-label="Luxury property image"
          className="relative hidden overflow-hidden lg:block"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1773407377322-fb2721bb99a5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3NzQzNjc0MjB8&ixlib=rb-4.1.0&q=80&w=1080')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-b from-transparent to-black/80 px-8 py-8 sm:px-12 sm:py-10">
            <div className="mb-6 inline-flex w-fit items-center gap-2 bg-[#C9A96240] px-3.5 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2D5A3D]" />
              <span className="text-[11px] font-medium uppercase tracking-[2px] text-[#C9A962]">
                AI-Powered Property Search
              </span>
            </div>

            <h1
              className={`${cormorant.className} max-w-[430px] whitespace-pre-line text-[44px] leading-[1.1] font-medium text-white sm:text-[52px]`}
            >
              {"Find Your\nDream Home"}
            </h1>

            <p className="mt-4 max-w-[460px] text-[14px] leading-[1.6] text-white/70">
              Intelligent real estate guidance tailored to your lifestyle and
              investment goals.
            </p>

            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/15 pt-6">
              <div className="flex flex-col gap-1">
                <span
                  className={`${cormorant.className} text-[28px] leading-none font-medium text-[#C9A962]`}
                >
                  2,400+
                </span>
                <span className="text-[11px] tracking-[1px] text-white/50 uppercase">
                  Properties Listed
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span
                  className={`${cormorant.className} text-[28px] leading-none font-medium text-[#C9A962]`}
                >
                  $4.2B
                </span>
                <span className="text-[11px] tracking-[1px] text-white/50 uppercase">
                  Assets Managed
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span
                  className={`${cormorant.className} text-[28px] leading-none font-medium text-[#C9A962]`}
                >
                  98%
                </span>
                <span className="text-[11px] tracking-[1px] text-white/50 uppercase">
                  Client Satisfaction
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex h-dvh min-h-0 w-full flex-col bg-[#F2F5F0]">
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-[#2D5A3D20] bg-white px-5 sm:px-8">
            <div className="flex items-center gap-3.5">
              <div className="flex h-[42px] w-[42px] items-center justify-center bg-[#2D5A3D] text-white">
                <Building2 size={20} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span
                  className={`${cormorant.className} text-[22px] leading-none font-medium text-[#1A2E1F]`}
                >
                  Aria
                </span>
                <span className="text-xs text-[#5A7A60]">
                  Real Estate Intelligence Agent
                </span>
              </div>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <span className="h-2 w-2 rounded-full bg-[#3A7D5C]" />
              <span className="text-xs text-[#5A7A60]">Online</span>
            </div>

            <Ellipsis size={20} className="text-[#6B8F73]" />
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-7">
            <div className="flex flex-col gap-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-end gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                >
                  {message.role === "assistant" ? (
                    <div className="flex h-8 w-8 items-center justify-center bg-[#2D5A3D] text-white">
                      <Building2 size={14} />
                    </div>
                  ) : null}

                  {message.role === "user" ? (
                    <span className="text-[10px] text-[#6B8F73]">
                      {message.time}
                    </span>
                  ) : null}

                  <div
                    className={
                      message.role === "assistant"
                        ? "max-w-[360px] rounded-[0_16px_16px_16px] border border-[#2D5A3D25] bg-white px-[18px] py-[14px]"
                        : "max-w-[300px] rounded-[16px_16px_0_16px] bg-[#2D5A3D] px-[18px] py-[14px]"
                    }
                  >
                    <p
                      className={
                        message.role === "assistant"
                          ? "text-[13px] leading-[1.6] text-[#243428]"
                          : "text-[13px] leading-[1.6] font-medium text-white"
                      }
                    >
                      {message.text}
                    </p>

                    {message.id === "a2" ? (
                      <div className="mt-2.5 flex flex-col gap-2">
                        {propertyItems.map((item) => (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => handlePropertySelect(item.name)}
                            className={`flex w-full items-center gap-2.5 rounded-[6px] border px-3 py-2.5 text-left transition ${selectedProperty === item.name ? "border-[#2D5A3D] bg-[#E7EFE4]" : "border-[#C8D9C2] bg-[#F2F5F0]"}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-[#2D5A3D]" />
                            <div className="flex-1">
                              <p className="text-xs font-medium text-[#1A2E1F]">
                                {item.name}
                              </p>
                              <p className="text-[11px] text-[#5A7A60]">
                                {item.details}
                              </p>
                            </div>
                            <ChevronRight
                              size={14}
                              className="text-[#2D5A3D]"
                            />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {message.role === "assistant" ? (
                    <span className="text-[10px] text-[#6B8F73]">
                      {message.time}
                    </span>
                  ) : null}
                </div>
              ))}

              {isTyping ? (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center bg-[#2D5A3D] text-white">
                    <Building2 size={14} />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-[0_16px_16px_16px] border border-[#2D5A3D25] bg-white px-4 py-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2D5A3D] opacity-90" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2D5A3D] opacity-50" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2D5A3D] opacity-20" />
                  </div>
                  <span className="text-[11px] text-[#6B8F73]">
                    Aria is analyzing listings...
                  </span>
                </div>
              ) : null}

              <div ref={endRef} />
            </div>
          </div>

          <footer className="shrink-0 border-t border-[#2D5A3D30] bg-[#F2F5F0] px-5 pt-4 pb-5 sm:px-8 sm:pb-6">
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestions.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleSuggestion(label)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#C8D9C2] bg-[#EBF0E8] px-3 py-1.5 text-[11px] text-[#5A7A60]"
                >
                  <Icon size={12} className="text-[#2D5A3D]" />
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <label className="sr-only" htmlFor="aria-chat-input">
                Message input
              </label>
              <div className="flex h-[52px] flex-1 items-center gap-2.5 rounded-full border border-[#C8D9C2] bg-white px-5">
                <Search size={16} className="text-[#5A7A60]" />
                <input
                  id="aria-chat-input"
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask about neighborhoods, prices, or schedule a tour..."
                  className="w-full bg-transparent text-[13px] text-[#243428] outline-none placeholder:text-[#6B8F73]"
                />
              </div>

              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#2D5A3D] text-white disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Send"
              >
                <Send size={20} />
              </button>
            </form>
          </footer>
        </section>
      </div>
    </main>
  );
}
