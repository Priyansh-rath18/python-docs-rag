"use client";

import CodeRunner from "./components/CodeRunner";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";


type Source = {
  page_title: string;
  section_path: string;
};

type Message = {
  id: string;
  question: string;
  answer: string;
  version_used: string;
  sources: Source[];
  isLoading: boolean;
  error: string | null;
};

const FONT = { fontFamily: "'JetBrains Mono', monospace" };

export default function Home() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showPlayground, setShowPlayground] = useState(false);
  const [spin, setSpin] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAsk = async () => {
    const q = question.trim();
    if (!q) return;

    const id = crypto.randomUUID();
    const newMessage: Message = {
      id,
      question: q,
      answer: "",
      version_used: "",
      sources: [],
      isLoading: true,
      error: null,
    };

    setMessages((prev) => [...prev, newMessage]);
    setQuestion("");

    try {
      const res = await fetch("http://localhost:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();

      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                answer: data.answer,
                version_used: data.version_used,
                sources: data.sources,
                isLoading: false,
              }
            : m
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                isLoading: false,
                error: err instanceof Error ? err.message : "Something went wrong",
              }
            : m
        )
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAsk();
  };

  const isAsking = messages.some((m) => m.isLoading);

  return (
    <main
      
      className="min-h-screen flex flex-col"
      style={{ ...FONT, backgroundColor: "#0F1117", color: "#E8E8E8" }}
    >
      {/* Header — terminal window chrome */}
      <header
        className="px-6 py-3 flex items-center gap-2"
        style={{ borderBottom: "1px solid #262A36" }}>
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#4B8BBE" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FFD43B" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#3A3F4E" }} />
        </div>
        <span className="text-sm ml-2" style={{ color: "#7D8590" }}>
          python-docs — zsh
        </span>
        <button
  onClick={() => {
    setShowPlayground((v) => !v);
    setSpin(true);
    setTimeout(() => setSpin(false), 600);
  }}
  className="ml-auto text-xs px-3 py-1.5 rounded flex items-center gap-2"
  style={{
    background: "#12141C",
    color: "#C9CDD6",
    fontWeight: 500,
    border: "2px solid transparent",
    backgroundImage:
      "linear-gradient(#12141C, #12141C), linear-gradient(135deg, #4B8BBE, #FFD43B)",
    backgroundOrigin: "border-box",
    backgroundClip: "padding-box, border-box",
  }}
>
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    style={{
      transform: spin ? "rotate(360deg)" : "rotate(0deg)",
      transition: "transform 0.6s ease",
    }}
  >
    <path
      d="M12 2c-1.5 0-3 .3-3 2v2h6v1H6c-1.5 0-3 1.3-3 3v4c0 1.7 1.5 3 3 3h1v-3c0-1.5 1.3-3 3-3h4c1.5 0 3-1.3 3-3V4c0-1.7-1.5-2-3-2h-2z"
      fill="#4B8BBE"
    />
    <path
      d="M12 22c1.5 0 3-.3 3-2v-2H9v-1h9c1.5 0 3-1.3 3-3v-4c0-1.7-1.5-3-3-3h-1v3c0 1.5-1.3 3-3 3H10c-1.5 0-3 1.3-3 3v3c0 1.7 1.5 2 3 2h2z"
      fill="#FFD43B"
    />
  </svg>
  {showPlayground ? "hide" : "playground"}
          
        </button>
      </header>
      {showPlayground && (
        <div className="max-w-3xl mx-auto w-full px-6 pt-4">
          <CodeRunner />
        </div>
      )}
      {/* Message area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl mx-auto w-full space-y-8">
        {messages.length === 0 && (
          <div className="text-sm mt-16" style={{ color: "#7D8590" }}>
            <span style={{ color: "#FFD43B" }}>&gt;&gt;&gt;</span> Ask about Python syntax, errors,
            or the standard library.
            <br />
            <span style={{ color: "#4B8BBE" }}>Tip:</span> mention a version, e.g. &quot;in
            python 3.12&quot; — defaults to 3.14 otherwise.
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id}>
            {/* question, echoed like a terminal prompt */}
            <div className="text-sm mb-2">
              <span style={{ color: "#FFD43B" }}>&gt;&gt;&gt;</span>{" "}
              <span style={{ color: "#E8E8E8" }}>{m.question}</span>
            </div>

            {/* answer panel */}
            <div
              className="rounded-md p-4"
              style={{ background: "#1A1D26", border: "1px solid #262A36" }}
            >
              {m.isLoading && (
                <div className="text-sm flex items-center gap-2" style={{ color: "#7D8590" }}>
                  <span
                    className="inline-block w-2 h-4 animate-pulse"
                    style={{ background: "#4B8BBE" }}
                  />
                  running query...
                </div>
              )}

              {m.error && (
                <div className="text-sm" style={{ color: "#E24B4A" }}>
                  error: {m.error}
                </div>
              )}

              {!m.isLoading && !m.error && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        background: "#2A2410",
                        color: "#FFD43B",
                        border: "1px solid #4A3F1A",
                      }}
                    >
                      [python {m.version_used}]
                    </span>
                  </div>
                  <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{m.answer}</ReactMarkdown>
                  </div>
                  {m.sources.length > 0 && (
                    <div
                      className="text-xs mt-4 pt-3"
                      style={{ color: "#5A5F6B", borderTop: "1px solid #262A36" }}
                    >
                      <div className="mb-1" style={{ color: "#7D8590" }}>
                        # sources
                      </div>
                      <ul className="space-y-1">
                        {m.sources.map((s, i) => (
                          <li key={i}>
                            {s.page_title} → {s.section_path.replace(/¶/g, "")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar — styled as a live prompt */}
      <div className="px-6 py-4" style={{ borderTop: "1px solid #262A36" }}>
        <div
          className="flex items-center gap-2 max-w-3xl mx-auto rounded-md px-3"
          style={{ background: "#1A1D26", border: "1px solid #262A36" }}
          onClick={() => inputRef.current?.focus()}
        >
          <span style={{ color: "#FFD43B" }}>&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ask a question..."
            className="flex-1 bg-transparent outline-none py-2.5 text-sm"
            style={{ color: "#E8E8E8" }}
          />
          <button
            onClick={handleAsk}
            disabled={isAsking}
            className="text-sm px-3 py-1.5 rounded disabled:opacity-40"
            style={{ background: "#4B8BBE", color: "#0F1117", fontWeight: 500 }}
          >
            {isAsking ? "..." : "run"}
          </button>
        </div>
      </div>
    </main>
  );
}