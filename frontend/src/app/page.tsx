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

const MONO = { fontFamily: "'JetBrains Mono', monospace" };
const SANS = { fontFamily: "'Inter', sans-serif" };

const VERSIONS = ["3.14", "3.13", "3.12", "3.11"];

const FEATURES = [
  { title: "Version-aware answers", body: "Mention a version like \"in python 3.12\" and answers come from that release's docs. Defaults to 3.14." },
  { title: "Cited sources", body: "Every answer lists the doc pages and sections it was built from, so you can verify it." },
  { title: "Run it in the browser", body: "A built-in Python playground powered by Pyodide. No install, no server round-trip." },
  { title: "Grounded in official docs", body: "Retrieval over the official Python documentation, not the open web." },
  { title: "Four releases indexed", body: "Python 3.11, 3.12, 3.13 and 3.14 are searchable side by side." },
  { title: "Keyboard first", body: "Type, hit Enter, read. The whole flow works without touching the mouse." },
];

const STEPS = [
  { n: "01", title: "Ask a question", body: "Syntax, errors, or anything in the standard library, in plain English." },
  { n: "02", title: "We search the docs", body: "The right Python version is picked and the most relevant doc sections are retrieved." },
  { n: "03", title: "Get a cited answer", body: "A concise markdown answer, tagged with its version and the sources it used." },
];

const FAQ = [
  { q: "Which Python versions are supported?", a: "Python 3.11, 3.12, 3.13 and 3.14. If you don't mention one, answers use 3.14." },
  { q: "How do I pick a version?", a: "Just say it in your question, e.g. \"how does match work in python 3.11?\"." },
  { q: "Where do the answers come from?", a: "From the official Python documentation. The sources under each answer show exactly which pages were used." },
  { q: "Does the playground run my code on a server?", a: "No. It runs locally in your browser via Pyodide, a WebAssembly build of CPython." },
];

function SectionLabel({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center gap-[10px] mb-3">
      <span className="text-[14px] font-medium" style={{ color: "#5A5F6B" }}>{n}.</span>
      <span style={{ color: "#3A3F4E" }}>&mdash;</span>
      <span className="text-[13px] font-medium tracking-[2px] uppercase" style={{ color: "#5A5F6B" }}>{label}</span>
    </div>
  );
}

function PythonLogo({ size = 14, spin = false }: { size?: number; spin?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
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
  );
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showPlayground, setShowPlayground] = useState(false);
  const [spin, setSpin] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // scroll only the chat panel, not the whole page
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const togglePlayground = () => {
    setShowPlayground((v) => !v);
    setSpin(true);
    setTimeout(() => setSpin(false), 600);
  };

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
      const res = await fetch("https://python-docs-rag-production.up.railway.app/ask", {
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
      className="min-h-screen relative overflow-x-hidden"
      style={{ ...SANS, backgroundColor: "#0F1117", color: "#E8E8E8" }}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1100px] overflow-hidden">
        <div
          className="absolute -top-48 left-1/2 -translate-x-1/2 w-[1000px] h-[640px] rounded-full blur-[140px]"
          style={{ background: "rgba(75,139,190,0.22)" }}
        />
        <div
          className="absolute top-[380px] right-[-10%] w-[480px] h-[480px] rounded-full blur-[140px]"
          style={{ background: "rgba(255,212,59,0.07)" }}
        />
      </div>

      {/* Nav */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{ background: "rgba(15,17,23,0.7)", borderBottom: "1px solid #262A36" }}
      >
        <div className="max-w-[1250px] mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 text-[18px] font-bold tracking-tight text-white">
            <PythonLogo size={22} />
            pythonicx
          </a>

          <div className="hidden md:flex items-center gap-9">
            {[["Ask", "#ask"], ["Features", "#features"], ["How it works", "#how"], ["FAQ", "#faq"]].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-[14px] font-medium transition-colors hover:text-white"
                style={{ color: "#7D8590" }}
              >
                {label}
              </a>
            ))}
          </div>

          <button
            onClick={togglePlayground}
            className="text-[13px] px-5 py-2 rounded-full flex items-center gap-2 transition-transform hover:scale-[1.03]"
            style={{
              ...MONO,
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
            <PythonLogo spin={spin} />
            {showPlayground ? "hide" : "playground"}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 md:px-12 pt-[90px] md:pt-[120px] text-center">
        <div className="max-w-[820px] mx-auto">
          <div
            className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full mb-8 backdrop-blur-sm"
            style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}
          >
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-tight"
              style={{ background: "#4B8BBE", color: "#0F1117" }}
            >
              New
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.15em]" style={{ color: "#7D8590" }}>
              Python 3.11 – 3.14 docs, indexed
            </span>
          </div>

          <h1 className="text-[40px] md:text-[68px] font-semibold text-white leading-[1.08] tracking-[-1.5px] mb-5">
            Ask the Python Docs.{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #4B8BBE, #FFD43B)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Get Cited Answers.
            </span>
          </h1>
          <p className="text-[17px] leading-[1.6] max-w-[580px] mx-auto mb-9" style={{ color: "#7D8590" }}>
            Version-aware answers straight from the official documentation, with sources, plus a
            Python playground that runs right in your browser.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <a
              href="#ask"
              onClick={() => setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 400)}
              className="w-full sm:w-auto h-14 px-8 rounded-full font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] hover:shadow-[0_10px_30px_-10px_rgba(75,139,190,0.7)]"
              style={{ background: "#4B8BBE", color: "#0F1117" }}
            >
              Start asking <span aria-hidden>→</span>
            </a>
            <a
              href="#ask"
              onClick={() => setShowPlayground(true)}
              className="w-full sm:w-auto h-14 px-8 rounded-full font-semibold flex items-center justify-center gap-3 backdrop-blur-md transition-all hover:bg-white/5"
              style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#E8E8E8" }}
            >
              <span aria-hidden style={{ color: "#FFD43B" }}>▶</span> Open playground
            </a>
          </div>
        </div>

        {/* Chat "dashboard" */}
        <div id="ask" className="relative max-w-[1150px] mx-auto mt-[80px] scroll-mt-24 text-left">
          <div
            className="absolute -inset-4 rounded-[40px] blur-[100px] opacity-40"
            style={{ background: "rgba(75,139,190,0.35)" }}
          />

          <div
            className="relative rounded-[28px] flex overflow-hidden shadow-[0_-30px_100px_rgba(0,0,0,0.6)]"
            style={{ background: "rgba(18,20,28,0.95)", border: "1px solid #262A36" }}
          >
            {/* Sidebar */}
            <aside
              className="hidden md:flex flex-col w-[180px] shrink-0 py-8 px-5 gap-8"
              style={{ background: "rgba(255,255,255,0.015)", borderRight: "1px solid #262A36" }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(75,139,190,0.35)]"
                style={{ background: "linear-gradient(135deg, #4B8BBE, #2F6690)" }}
              >
                <PythonLogo size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#5A5F6B" }}>
                  Versions
                </p>
                <ul className="space-y-1.5" style={MONO}>
                  {VERSIONS.map((v, i) => (
                    <li
                      key={v}
                      className="text-[12px] px-3 py-2 rounded-xl flex items-center justify-between"
                      style={
                        i === 0
                          ? { color: "#FFD43B", background: "#2A2410", border: "1px solid #4A3F1A" }
                          : { color: "#7D8590", border: "1px solid transparent" }
                      }
                    >
                      {v}
                      {i === 0 && <span className="text-[9px] uppercase tracking-wider">default</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            <div className="flex-1 min-w-0 flex flex-col" style={MONO}>
              {/* Window chrome */}
              <div className="px-6 py-3.5 flex items-center gap-2" style={{ borderBottom: "1px solid #262A36" }}>
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#4B8BBE" }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FFD43B" }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#3A3F4E" }} />
                </div>
                <span className="text-sm ml-2" style={{ color: "#7D8590" }}>
                  python-docs — zsh
                </span>
                {isAsking && (
                  <span className="ml-auto text-[11px] flex items-center gap-2" style={{ color: "#7D8590" }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#4B8BBE" }} />
                    querying
                  </span>
                )}
              </div>

              {showPlayground && (
                <div className="px-6 pt-5">
                  <CodeRunner />
                </div>
              )}

              {/* Message area */}
              <div ref={scrollRef} className="h-[480px] overflow-y-auto px-6 py-6 space-y-8">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-sm gap-3" style={{ color: "#7D8590" }}>
                    <div>
                      <span style={{ color: "#FFD43B" }}>&gt;&gt;&gt;</span> Ask about Python syntax, errors,
                      or the standard library.
                    </div>
                    <div>
                      <span style={{ color: "#4B8BBE" }}>Tip:</span> mention a version, e.g. &quot;in
                      python 3.12&quot; — defaults to 3.14 otherwise.
                    </div>
                  </div>
                )}

                {messages.map((m) => (
                  <div key={m.id}>
                    {/* question, echoed like a terminal prompt */}
                    <div className="text-sm mb-2.5">
                      <span style={{ color: "#FFD43B" }}>&gt;&gt;&gt;</span>{" "}
                      <span style={{ color: "#E8E8E8" }}>{m.question}</span>
                    </div>

                    {/* answer panel */}
                    <div
                      className="rounded-2xl p-5"
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
                              className="text-xs px-2.5 py-0.5 rounded-full"
                              style={{
                                background: "#2A2410",
                                color: "#FFD43B",
                                border: "1px solid #4A3F1A",
                              }}
                            >
                              python {m.version_used}
                            </span>
                          </div>
                          <div className="md text-sm leading-relaxed max-w-none">
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
              </div>

              {/* Input bar — styled as a live prompt */}
              <div className="px-6 py-5" style={{ borderTop: "1px solid #262A36" }}>
                <div
                  className="flex items-center gap-3 rounded-2xl pl-5 pr-2 py-1.5 transition-colors focus-within:border-[#4B8BBE]"
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
                    className="flex-1 min-w-0 bg-transparent outline-none py-2.5 text-sm"
                    style={{ color: "#E8E8E8" }}
                  />
                  <span
                    className="hidden sm:inline text-[10px] font-bold px-2 py-1 rounded"
                    style={{ color: "#5A5F6B", border: "1px solid #262A36" }}
                  >
                    enter
                  </span>
                  <button
                    onClick={handleAsk}
                    disabled={isAsking}
                    className="text-sm px-5 py-2 rounded-xl disabled:opacity-40 transition-all hover:brightness-110 shadow-[0_0_20px_rgba(75,139,190,0.25)]"
                    style={{ background: "#4B8BBE", color: "#0F1117", fontWeight: 600 }}
                  >
                    {isAsking ? "..." : "run"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 px-6 md:px-12 pt-[120px] scroll-mt-20">
        <div className="max-w-[1250px] mx-auto">
          <header className="text-center mb-14 flex flex-col items-center">
            <SectionLabel n="01" label="Features" />
            <h2 className="text-[36px] md:text-[52px] font-medium text-white leading-[1.1] tracking-tight max-w-[820px]">
              Why Search the Docs When You Can Ask Them?
            </h2>
          </header>

          <div className="rounded-[24px] overflow-hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: "#262A36", border: "1px solid #262A36" }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className="group relative p-10 flex flex-col gap-6 transition-colors" style={{ background: "#12141C" }}>
                <div className="absolute inset-0 bg-gradient-to-br from-[#4B8BBE]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div
                  className="w-14 h-14 rounded-[16px] flex items-center justify-center text-[15px] font-bold transition-all duration-300 group-hover:border-[#4B8BBE]/60 group-hover:shadow-[0_0_20px_rgba(75,139,190,0.2)]"
                  style={{ ...MONO, background: "#0F1117", border: "1px solid #262A36", color: i % 2 ? "#FFD43B" : "#4B8BBE" }}
                >
                  0{i + 1}
                </div>
                <div className="relative flex flex-col gap-3">
                  <h3 className="text-[20px] font-medium text-white tracking-tight group-hover:text-[#4B8BBE] transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-[14px] leading-[1.65]" style={{ color: "#7D8590" }}>
                    {f.body}
                  </p>
                </div>
                <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#4B8BBE] group-hover:w-full transition-all duration-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 px-6 md:px-12 pt-[120px] scroll-mt-20">
        <div className="max-w-[1250px] mx-auto">
          <header className="mb-14">
            <SectionLabel n="02" label="How it works" />
            <h2 className="text-[36px] md:text-[52px] font-medium text-white leading-[1.1] tracking-tight mb-4">
              From Question to Answer<br />in 3 Steps
            </h2>
            <p className="text-[16px]" style={{ color: "#7D8590" }}>
              Retrieval-augmented generation over the official Python docs.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="group rounded-[20px] overflow-hidden flex flex-col"
                style={{ background: "#12141C", border: "1px solid #262A36" }}
              >
                <div
                  className="relative h-[200px] flex items-center justify-center overflow-hidden"
                  style={{ background: "#0F1117", borderBottom: "1px solid #262A36" }}
                >
                  <div
                    className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "100% 4px" }}
                  />
                  <span
                    className="text-[96px] font-bold leading-none transition-transform duration-500 group-hover:scale-110"
                    style={{
                      ...MONO,
                      background: "linear-gradient(180deg, #4B8BBE, rgba(75,139,190,0.1))",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                    }}
                  >
                    {s.n}
                  </span>
                </div>
                <div className="p-8">
                  <h3 className="text-white text-[22px] font-medium mb-2.5 tracking-tight">{s.title}</h3>
                  <p className="text-[14px] leading-[1.65]" style={{ color: "#7D8590" }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 px-6 md:px-12 py-[120px] scroll-mt-20">
        <div className="max-w-[1000px] mx-auto">
          <header className="mb-14 flex flex-col items-center text-center">
            <SectionLabel n="03" label="Questions & Support" />
            <h2 className="text-[36px] md:text-[52px] font-medium text-white leading-[1.1] tracking-tight">
              Frequently Asked Questions
            </h2>
          </header>

          <div className="grid gap-4">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="group relative overflow-hidden rounded-[16px] transition-all open:shadow-[0_0_30px_rgba(75,139,190,0.12)]"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #262A36" }}
              >
                <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#4B8BBE] opacity-40 group-open:opacity-100 transition-opacity" />
                <summary className="flex items-center justify-between py-6 pl-8 pr-7 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <h3 className="text-[16px] md:text-[18px] font-medium text-white/80 group-open:text-white">{f.q}</h3>
                  <span className="ml-4 text-[24px] leading-none transition-transform duration-300 group-open:rotate-45 text-white/40 group-open:text-[#4B8BBE]">
                    +
                  </span>
                </summary>
                <p className="px-8 pb-7 text-[15px] leading-[1.8] max-w-[90%]" style={{ color: "#7D8590" }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative overflow-hidden" style={{ borderTop: "1px dashed #262A36" }}>
        <div
          className="absolute bottom-[-220px] left-1/2 -translate-x-1/2 w-[160%] aspect-[4/1] rounded-[100%] pointer-events-none"
          style={{ background: "#0F1117", borderTop: "1px solid rgba(75,139,190,0.5)", boxShadow: "0 -30px 80px rgba(75,139,190,0.25)" }}
        />
        <div className="relative max-w-[1250px] mx-auto px-6 md:px-12 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-[14px]" style={{ color: "#7D8590" }}>
          <span className="flex items-center gap-2"><PythonLogo /> pythonicx</span>
          <div className="flex gap-6">
            {[["Ask", "#ask"], ["Features", "#features"], ["How it works", "#how"], ["FAQ", "#faq"]].map(([label, href]) => (
              <a key={href} href={href} className="hover:text-white transition-colors">{label}</a>
            ))}
          </div>
        </div>
        <div className="relative h-[180px] md:h-[300px] flex items-center justify-center overflow-hidden">
          <h2
            className="text-[80px] sm:text-[140px] md:text-[240px] font-black leading-none tracking-[-0.05em] whitespace-nowrap select-none pointer-events-none"
            style={{
              background: "linear-gradient(180deg, #E8E8E8 0%, rgba(75,139,190,0.35) 70%, transparent 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            PYTHONICX
          </h2>
        </div>
      </footer>
    </main>
  );
}
