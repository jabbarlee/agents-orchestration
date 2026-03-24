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
import { set } from "zod/v3";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
});

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
  properties?: PropertyListing[];
};

type PropertyListing = {
  id: string;
  address: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  priceLabel: string;
  features: string[];
};

const initialMessages: ChatMessage[] = [
  {
    id: "a1",
    role: "assistant",
    text: "Good morning! I'm Aria, your personal real estate intelligence agent. I have access to thousands of luxury listings across prime markets. How may I assist you today?",
    time: "9:41 AM",
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
  const [isTyping, setIsTyping] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text, time: formatTime() },
    ]);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleSuggestion = (label: string) => {
    setInput(label);
    inputRef.current?.focus();
  };

  const handlePropertySelect = (propertyAddress: string) => {
    setSelectedProperty(propertyAddress);
    setInput(`Tell me more about ${propertyAddress}.`);
    inputRef.current?.focus();
  };

  return (
    <main className={`${inter.className} h-dvh w-full bg-white/80`}>
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
            <div className="mb-6 inline-flex w-fit items-center gap-2 bg-[#FFFFFF33] px-3.5 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#111111]" />
              <span className="text-[11px] font-medium uppercase tracking-[2px] text-[#D4D4D4]">
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
                  className={`${cormorant.className} text-[28px] leading-none font-medium text-[#D4D4D4]`}
                >
                  2,400+
                </span>
                <span className="text-[11px] tracking-[1px] text-white/50 uppercase">
                  Properties Listed
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span
                  className={`${cormorant.className} text-[28px] leading-none font-medium text-[#D4D4D4]`}
                >
                  $4.2B
                </span>
                <span className="text-[11px] tracking-[1px] text-white/50 uppercase">
                  Assets Managed
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span
                  className={`${cormorant.className} text-[28px] leading-none font-medium text-[#D4D4D4]`}
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

        <section className="relative flex h-dvh min-h-0 w-full flex-col bg-white/70">
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-[#00000020] bg-white px-5 sm:px-8">
            <div className="flex items-center gap-3.5">
              <div className="flex h-[42px] w-[42px] items-center justify-center bg-[#111111] text-white border border-[#111111] rounded-full">
                <Building2 size={20} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span
                  className={`text-[22px] leading-none font-medium text-[#111111]`}
                >
                  Aria
                </span>
                <span className="text-xs text-[#525252]">
                  Real Estate Intelligence Agent
                </span>
              </div>
            </div>

            <Ellipsis size={20} className="text-[#737373]" />
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-7">
            <div className="flex flex-col gap-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-end gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                >
                  {message.role === "assistant" ? (
                    <div className="flex h-8 w-8 items-center justify-center bg-[#111111] text-white border border-[#111111] rounded-full">
                      <Building2 size={14} />
                    </div>
                  ) : null}

                  {message.role === "user" ? (
                    <span className="text-[10px] text-[#737373]">
                      {message.time}
                    </span>
                  ) : null}

                  <div
                    className={
                      message.role === "assistant"
                        ? "max-w-[420px]"
                        : "max-w-[340px] rounded-[16px_16px_0_16px] bg-[#111111] px-[18px] py-[14px]"
                    }
                  >
                    <p
                      className={
                        message.role === "assistant"
                          ? "text-[15px] leading-[1.7] text-[#1f1f1f]"
                          : "text-[15px] leading-[1.7] font-medium text-white"
                      }
                    >
                      {message.text ||
                        (isTyping && message.role === "assistant"
                          ? "Aria is thinking"
                          : "")}
                    </p>

                    {!message.text &&
                    isTyping &&
                    message.role === "assistant" ? (
                      <div className="mt-2 inline-flex items-center gap-1.5 text-[#737373]">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#737373] [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#737373] [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#737373]" />
                      </div>
                    ) : null}

                    {message.role === "assistant" &&
                    message.properties?.length ? (
                      <div className="mt-2.5 flex flex-col gap-2">
                        {message.properties.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handlePropertySelect(item.address)}
                            className={`flex w-full items-center gap-2.5 rounded-[6px] border px-3 py-2.5 text-left transition ${selectedProperty === item.address ? "border-[#111111] bg-[#E8E8E8]" : "border-[#D4D4D4] bg-[#F5F5F5]"}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-[#111111]" />
                            <div className="flex-1">
                              <p className="text-[13px] font-medium text-[#111111]">
                                {item.address} - {item.priceLabel}
                              </p>
                              <p className="text-xs text-[#525252]">
                                {item.bedrooms} BD - {item.bathrooms} BA -{" "}
                                {item.features.slice(0, 2).join(" - ")}
                              </p>
                            </div>
                            <ChevronRight
                              size={14}
                              className="text-[#111111]"
                            />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {message.role === "assistant" ? (
                    <span className="text-[10px] text-[#737373]">
                      {message.time}
                    </span>
                  ) : null}
                </div>
              ))}

              {isTyping ? (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center bg-[#111111] text-white border border-[#111111] rounded-full animate-pulse">
                    <Building2 size={14} />
                  </div>
                  <span className="text-[13px] text-[#737373]">
                    Aria is analyzing listings...
                  </span>
                </div>
              ) : null}

              <div ref={endRef} />
            </div>
          </div>

          <footer className="shrink-0 border-t border-[#00000030] bg-[#F5F5F5] px-5 pt-4 pb-5 sm:px-8 sm:pb-6">
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestions.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleSuggestion(label)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#D4D4D4] bg-[#EFEFEF] px-3 py-1.5 text-[11px] text-[#525252]"
                >
                  <Icon size={12} className="text-[#111111]" />
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <label className="sr-only" htmlFor="aria-chat-input">
                Message input
              </label>
              <div className="flex h-[52px] flex-1 items-center gap-2.5 rounded-full border border-[#D4D4D4] bg-white px-5">
                <Search size={16} className="text-[#525252]" />
                <input
                  id="aria-chat-input"
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask about neighborhoods, prices, or schedule a tour..."
                  className="w-full bg-transparent text-[13px] text-[#1f1f1f] outline-none placeholder:text-[#737373]"
                />
              </div>

              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#111111] text-white disabled:cursor-not-allowed disabled:opacity-60"
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
