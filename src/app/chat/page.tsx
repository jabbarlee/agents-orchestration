'use client';

import { useState } from 'react';

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'ai', content: 'Hello! Ask me a question, and let\'s see if I hit the semantic cache.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // We will replace this with the real API call in Step 2
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // 1. Immediately show the user's message
    const userMessage = input;
    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: userMessage };
    setMessages((prev) => [...prev, newUserMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // 2. Call our Cloudflare + Upstash API Route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage }),
      });

      const data = await response.json();

      // 3. Optional: You can log this to see if you hit the cache or OpenAI!
      console.log(`Response generated via: ${data.source}`); 

      // 4. Show the AI's response in the UI
      const newAiMsg: Message = { id: Date.now().toString(), role: 'ai', content: data.text };
      setMessages((prev) => [...prev, newAiMsg]);

    } catch (error) {
      console.error("Failed to fetch response:", error);
      const errorMsg: Message = { id: Date.now().toString(), role: 'ai', content: 'Sorry, I encountered an error connecting to the server.' };
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
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[75%] rounded-2xl px-5 py-3 ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'
              }`}
            >
              {m.content}
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