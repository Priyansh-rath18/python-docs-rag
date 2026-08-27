import os
from sentence_transformers import SentenceTransformer
import chromadb
from google import genai

from ingestion.version_utils import get_version_or_default
import pathlib

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
CHROMA_DIR = BASE_DIR / "chroma_db"
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
LLM_MODEL = "gemini-3.6-flash"

embed_model = SentenceTransformer(EMBED_MODEL_NAME)
chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
collection = chroma_client.get_or_create_collection(name="python_docs")

from dotenv import load_dotenv
load_dotenv()
llm_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

def retrieve_chunks(query: str, version: str, n_results: int = 5):
    query_embedding = embed_model.encode([query])[0].tolist()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where={"version": version}
    )

    chunks = []
    for i in range(len(results["ids"][0])):
        chunks.append({
            "text": results["documents"][0][i],
            "page_title": results["metadatas"][0][i]["page_title"],
            "section_path": results["metadatas"][0][i]["section_path"],
            "distance": results["distances"][0][i],
        })
    return chunks

def build_prompt(query: str, chunks: list, version: str) -> str:
    context_blocks = []
    for i, chunk in enumerate(chunks, 1):
        context_blocks.append(
            f"[Source {i}: {chunk['page_title']} > {chunk['section_path']}]\n{chunk['text']}"
        )
    context = "\n\n---\n\n".join(context_blocks)

    prompt = f"""You are a helpful Python documentation assistant for Python {version}.
Answer the user's question using ONLY the context provided below.
If the context doesn't fully answer the question, say so honestly.
Be concise and to-the-point. Include code examples from the context where relevant.

Context:
{context}

Question: {query}

Answer:"""
    return prompt

def generate_answer(prompt: str) -> str:
    response = llm_client.models.generate_content(
        model=LLM_MODEL,
        contents=prompt
    )
    return response.text

def answer_question(query: str) -> dict:
    version = get_version_or_default(query)
    chunks = retrieve_chunks(query, version)
    prompt = build_prompt(query, chunks, version)
    answer = generate_answer(prompt)

    return {
        "answer": answer,
        "version_used": version,
        "sources": [
            {"page_title": c["page_title"], "section_path": c["section_path"]}
            for c in chunks
        ]
    }

# Quick manual test
if __name__ == "__main__":
    result = answer_question("how do I handle exceptions in python 3.12")
    print("\n=== ANSWER ===")
    print(result["answer"])
    print(f"\n=== Version used: {result['version_used']} ===")
    print("=== Sources ===")
    for s in result["sources"]:
        print(f"- {s['page_title']} > {s['section_path']}")