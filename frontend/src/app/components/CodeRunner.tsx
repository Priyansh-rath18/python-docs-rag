"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    loadPyodide: any;
  }
}

const FONT = { fontFamily: "'JetBrains Mono', monospace" };

export default function CodeRunner() {
  const [code, setCode] = useState('print("spam, spam, spam, and eggs")');
  const [output, setOutput] = useState("");
  const [isError, setIsError] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "running">("loading");
  const pyodideRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      while (!window.loadPyodide) {
        await new Promise((r) => setTimeout(r, 100));
      }
      const pyodide = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
      });
      if (cancelled) return;
      pyodideRef.current = pyodide;
      setStatus("ready");
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const runCode = async () => {
    if (!pyodideRef.current || status === "running") return;
    setStatus("running");
    setOutput("");
    setIsError(false);

    const pyodide = pyodideRef.current;
    let captured = "";

    pyodide.setStdout({ batched: (msg: string) => (captured += msg + "\n") });
    pyodide.setStderr({ batched: (msg: string) => (captured += msg + "\n") });

    try {
      await pyodide.runPythonAsync(code);
      setOutput(captured || "(no output)");
      setIsError(false);
    } catch (err: any) {
      setOutput(captured + (err?.message || String(err)));
      setIsError(true);
    } finally {
      setStatus("ready");
    }
  };

  return (
    <div style={{ ...FONT, border: "1px solid #262A36" }} className="rounded-2xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-2.5 text-xs"
        style={{ background: "#161923", borderBottom: "1px solid #262A36", color: "#7D8590" }}
      >
        <span>python3</span>
        {status === "loading" && <span style={{ color: "#FFD43B" }}>booting interpreter...</span>}
      </div>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        rows={5}
        className="w-full text-sm p-4 outline-none resize-y block"
        style={{ background: "#12141C", color: "#E8E8E8", border: "none" }}
      />

      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "#161923", borderTop: "1px solid #262A36" }}>
        <button
          onClick={runCode}
          disabled={status !== "ready"}
          className="text-sm px-5 py-1.5 rounded-xl disabled:opacity-40 transition-all hover:brightness-110 shadow-[0_0_20px_rgba(75,139,190,0.25)]"
          style={{ background: "#4B8BBE", color: "#0F1117", fontWeight: 500 }}
        >
          {status === "running" ? "running..." : "▶ run"}
        </button>
      </div>

      {output && (
        <pre
          className="text-sm p-4 whitespace-pre-wrap"
          style={{
            background: "#12141C",
            color: isError ? "#F09595" : "#97C459",
            borderTop: "1px solid #262A36",
          }}
        >
          {output}
        </pre>
      )}
    </div>
  );
}