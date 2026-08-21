"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { BotMessageSquare, Send, Sparkles, X } from "lucide-react";
import { clsx } from "clsx";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const starterMessages: ChatMessage[] = [
  {
    role: "assistant",
    content: "Hi, I can help with LittleCafe hours, menu highlights, events, contact details, and party planning."
  }
];
const suggestedPrompts = [
  "What are your hours this weekend?",
  "Menu picks for kids?",
  "Plan a party for 20 people",
  "Do I need to sign a waiver?"
];
const maxRequestMessages = 10;
const maxInputLength = 1200;
const maxInputHeight = 128;

function getChatbotSessionId() {
  const storageKey = "littlecafe-chat-session";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID();
  window.localStorage.setItem(storageKey, next);
  return next;
}

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const canSend = input.trim().length > 0 && !loading;
  const showSuggestions = messages.length === starterMessages.length && !loading;

  function resizeInput(element: HTMLTextAreaElement | null) {
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${Math.min(element.scrollHeight, maxInputHeight)}px`;
  }

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || loading) return;

      const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
      setMessages(nextMessages);
      setInput("");
      resizeInput(inputRef.current);
      setError("");
      setLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: getChatbotSessionId(), messages: nextMessages.slice(-maxRequestMessages) })
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
    },
    [loading, messages]
  );

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function toggleOpen() {
    setOpen((value) => !value);
    setEverOpened(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end sm:bottom-6 sm:right-6">
      {open ? (
        <section
          aria-label="LittleCafe chatbot"
          className="mb-4 flex h-[min(38rem,calc(100dvh-8rem))] w-[calc(100vw-2.5rem)] max-w-[24rem] animate-chat-panel flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_24px_60px_-15px_rgba(30,28,24,0.45)] sm:max-w-[26rem] lg:max-w-[28rem]"
        >
          <header className="flex items-center justify-between gap-3 bg-gradient-to-br from-roast via-[#7a5238] to-[#4a2f1f] px-5 py-4 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                <BotMessageSquare size={22} aria-hidden="true" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#5b3b28] bg-sage" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">LittleCafe chat</h2>
                <p className="truncate text-xs text-white/75">Hours · Menu · Events · Party planning</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <X size={19} aria-hidden="true" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-crema/40 px-4 py-5">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={`${message.role}-${index}`}
                  className={clsx("flex animate-chat-bubble items-end gap-2", isUser ? "justify-end" : "justify-start")}
                >
                  {!isUser ? (
                    <span className="mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-roast/10 text-roast">
                      <BotMessageSquare size={16} aria-hidden="true" />
                    </span>
                  ) : null}
                  <div
                    className={clsx(
                      "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[0.9375rem] leading-6 shadow-sm",
                      isUser ? "rounded-br-md bg-roast text-white" : "rounded-bl-md border border-black/5 bg-white text-ink"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              );
            })}

            {loading ? (
              <div className="flex animate-chat-bubble items-end gap-2">
                <span className="mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-roast/10 text-roast">
                  <BotMessageSquare size={16} aria-hidden="true" />
                </span>
                <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-black/5 bg-white px-4 py-3.5 shadow-sm">
                  <span className="sr-only">Thinking</span>
                  <span className="h-2 w-2 animate-chat-dot rounded-full bg-roast" aria-hidden="true" />
                  <span className="h-2 w-2 animate-chat-dot rounded-full bg-roast [animation-delay:150ms]" aria-hidden="true" />
                  <span className="h-2 w-2 animate-chat-dot rounded-full bg-roast [animation-delay:300ms]" aria-hidden="true" />
                </div>
              </div>
            ) : null}

            {showSuggestions ? (
              <div className="pt-1">
                <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-ink/45">
                  <Sparkles size={13} aria-hidden="true" />
                  Try asking
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="rounded-full border border-roast/25 bg-white px-3.5 py-2 text-left text-sm text-roast shadow-sm transition hover:-translate-y-0.5 hover:border-roast/50 hover:bg-roast hover:text-white"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {error ? <p className="border-t border-black/10 bg-red-50 px-5 py-2.5 text-xs leading-5 text-red-700">{error}</p> : null}

          <form onSubmit={submitMessage} className="border-t border-black/10 bg-white p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-black/15 bg-white px-3 py-2 transition focus-within:border-roast focus-within:ring-2 focus-within:ring-roast/20">
              <textarea
                ref={inputRef}
                value={input}
                rows={1}
                onChange={(event) => {
                  setInput(event.target.value);
                  resizeInput(event.target);
                }}
                onKeyDown={handleInputKeyDown}
                maxLength={maxInputLength}
                placeholder="Ask about LittleCafe"
                aria-label="Message"
                className="max-h-32 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[0.9375rem] leading-6 outline-none placeholder:text-ink/40"
              />
              <button
                type="submit"
                disabled={!canSend}
                aria-label="Send message"
                className="mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-roast text-white shadow-sm transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/20 disabled:shadow-none"
              >
                <Send size={17} aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 px-1 text-[0.6875rem] leading-4 text-ink/45">
              Enter to send · Shift + Enter for a new line. Staff confirm every booking.
            </p>
          </form>
        </section>
      ) : null}

      <div className="flex flex-col items-center gap-2">
        {!open ? (
          <span className="hidden whitespace-nowrap rounded-full border border-black/5 bg-white px-4 py-1.5 text-sm font-semibold text-ink shadow-lg sm:inline-block">
            Ask Me
          </span>
        ) : null}
        <button
          type="button"
          aria-label={open ? "Close LittleCafe chat" : "Open LittleCafe chat"}
          aria-expanded={open}
          onClick={toggleOpen}
          className="relative inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-roast to-[#4a2f1f] text-white shadow-[0_14px_34px_-8px_rgba(108,70,48,0.85)] transition hover:scale-105 hover:shadow-[0_18px_42px_-8px_rgba(108,70,48,0.95)] active:scale-95"
        >
          {!open && !everOpened ? (
            <span className="absolute inset-0 animate-ping rounded-full bg-roast/30" aria-hidden="true" />
          ) : null}
          <span className="relative">
            {open ? <X size={32} aria-hidden="true" /> : <BotMessageSquare size={38} aria-hidden="true" />}
          </span>
        </button>
      </div>
    </div>
  );
}
