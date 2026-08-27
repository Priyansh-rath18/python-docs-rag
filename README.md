# Python Docs RAG Assistant

A retrieval-augmented generation (RAG) chatbot that answers Python questions — syntax, errors, standard library — by retrieving from the **official Python documentation**, scoped to a specific version (3.11–3.14), instead of guessing from an LLM's training data.

Includes a live, in-browser Python playground (via Pyodide) so you can run code and see real output or tracebacks without leaving the page.

**Live demo:** [add your Vercel URL here]

![screenshot placeholder — add one of your UI]

---

## Why

General-purpose LLMs answer Python questions from whatever they memorized during training — which goes stale, and doesn't distinguish between Python 3.9 and 3.14 syntax differences. This project retrieves the actual, current, version-specific documentation *before* generating an answer, so responses are grounded and traceable back to a real doc section instead of hallucinated.

## How it works

```
Python docs (HTML, per version)
        ↓
  Parse + recursively chunk by section (BeautifulSoup)
        ↓
  Embed chunks locally (sentence-transformers)
        ↓
  Store in ChromaDB, tagged by version
        ↓
User question → detect version → retrieve top-k chunks
        ↓
  Generate answer (Gemini) grounded in retrieved chunks
        ↓
  FastAPI serves it → Next.js renders it
```

1. **Ingestion** — official Python docs (HTML) for versions 3.11–3.14 are parsed with BeautifulSoup.
2. **Chunking** — rather than splitting by raw character count (which cuts code examples in half), chunks are built by recursively walking the docs' own nested `<section>` structure, so each chunk is one coherent topic, with code blocks extracted separately as structured metadata.
3. **Embedding** — chunks are embedded locally with `sentence-transformers` (`all-MiniLM-L6-v2`) — no API calls, no rate limits, ~23,000 chunks embedded in minutes.
4. **Retrieval** — a user's question is embedded the same way and matched against ChromaDB. If the question mentions a version ("in Python 3.12..."), retrieval is filtered to that version; otherwise it defaults to the latest.
5. **Generation** — retrieved chunks are passed as context to Gemini, which generates a concise, cited answer.
6. **Serving** — a FastAPI backend exposes this as a `/ask` endpoint; a Next.js frontend renders the conversation, complete with Markdown-formatted answers and source citations.

## Tech stack

| Layer | Tools |
|---|---|
| Ingestion / parsing | Python, BeautifulSoup |
| Embeddings | sentence-transformers (local, `all-MiniLM-L6-v2`) |
| Vector store | ChromaDB |
| Generation | Google Gemini API |
| Backend | FastAPI |
| Frontend | Next.js, TypeScript, Tailwind CSS |
| In-browser code execution | Pyodide (WebAssembly Python) |
| Deployment | Railway (backend), Vercel (frontend) |

## Project structure

```
pythonicx/
├── ingestion/
│   ├── chunk_docs.py       # recursive section-based HTML chunking
│   ├── embed_chunks.py     # local embedding + ChromaDB population
│   └── version_utils.py    # detects Python version mentioned in a query
├── app/
│   ├── rag_pipeline.py     # retrieval + generation logic
│   └── main.py             # FastAPI app
├── data/processed/         # chunked docs per version (chunks.json)
├── frontend/                # Next.js app
│   └── src/app/
│       ├── page.tsx
│       └── components/CodeRunner.tsx
├── requirements.txt
└── railway.json
```

Note: `chroma_db/` and raw downloaded documentation are excluded from version control — the vector database is rebuilt from `data/processed/*.json` at deploy time (see `railway.json`).

## Running locally

**Backend:**
```bash
pip install -r requirements.txt
# add GEMINI_API_KEY to a .env file
python -m ingestion.embed_chunks   # builds the local Chroma DB
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Design decisions worth noting

- **Local embeddings over an embedding API.** Started with Gemini's embedding endpoint, hit a deprecated model and free-tier rate limits partway through embedding ~20,000 chunks. Switched to local `sentence-transformers` — free, no rate limits, and embedded the full corpus in about 6 minutes instead of hours.
- **Recursive, section-aware chunking.** The Python docs are Sphinx-generated, which nests `<section>` tags by heading level. Chunking recursively down to leaf sections (rather than by fixed character count) keeps each chunk topically coherent and preserves code examples intact.
- **Version-aware retrieval, not version-agnostic.** A lightweight regex detects a Python version mentioned in the query and filters ChromaDB retrieval to that version; otherwise it defaults to the latest. This directly addresses the original problem: syntax and behavior differences across Python versions.
- **The vector database isn't committed to git.** At 300+MB, it exceeded GitHub's file size limit. Instead, the small, portable `chunks.json` files are committed, and the database is rebuilt from them as a deploy-time build step.

## Possible next steps

- Multi-language support (Java, C++, etc.) — the original motivation for this project
- Exact-match retrieval path for CLI flags and error messages, alongside the current semantic search
- Surface multiple versions in one answer when behavior genuinely differs across them, rather than defaulting to latest
