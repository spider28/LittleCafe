"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { BotMessageSquare, Loader2, Send, X } from "lucide-react";
import { clsx } from "clsx";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const starterMessages: ChatMessage[] = [
  {
    role: "assistant",
    content: "Hi, I can help with LittleCafe hours, menu highlights, events, and contact details."
  }
];

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages })
      });
      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok || !data.reply) {
        throw new Error(data.error ?? "The chatbot could not answer right now.");
      }

      setMessages((current) => [...current, { role: "assistant", content: data.reply ?? "" }]);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "The chatbot could not answer right now.");
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {open ? (
        <section
          aria-label="LittleCafe chatbot"
          className="mb-3 flex h-[min(34rem,calc(100vh-7rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-md border border-black/10 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between border-b border-black/10 bg-crema px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-roast text-white">
                <BotMessageSquare size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-ink">LittleCafe chat</h2>
                <p className="truncate text-xs text-ink/65">V1 assistant</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink/70 transition hover:bg-white"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-crema/30 px-4 py-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={clsx("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={clsx(
                    "max-w-[82%] rounded-md px-3 py-2 text-sm leading-6",
                    message.role === "user" ? "bg-roast text-white" : "border border-black/10 bg-white text-ink"
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {loading ? (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-ink/70">
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                  Thinking
                </div>
              </div>
            ) : null}
          </div>

          {error ? <p className="border-t border-black/10 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p> : null}

          <form onSubmit={submitMessage} className="flex gap-2 border-t border-black/10 bg-white p-3">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={1200}
              placeholder="Ask about LittleCafe"
              className="min-w-0 flex-1 rounded-md border border-black/15 px-3 py-2 text-sm outline-none transition focus:border-roast focus:ring-2 focus:ring-roast/20"
            />
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send message"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-roast text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/25"
            >
              <Send size={17} aria-hidden="true" />
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        aria-label={open ? "Close LittleCafe chat" : "Open LittleCafe chat"}
        onClick={() => {
          setOpen((value) => !value);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-md bg-roast text-white shadow-xl transition hover:bg-ink"
      >
        {open ? <X size={23} aria-hidden="true" /> : <BotMessageSquare size={25} aria-hidden="true" />}
      </button>
    </div>
  );
}
