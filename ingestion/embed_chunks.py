import os
import json
from sentence_transformers import SentenceTransformer
import chromadb
import pathlib

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent  # project root
PROCESSED_DIR = BASE_DIR / "data" / "processed"
CHROMA_DIR = BASE_DIR / "chroma_db"

VERSIONS = ["3.11.15", "3.12", "3.13", "3.14"]

# Good balance of speed + quality for docs/code text
MODEL_NAME = "all-MiniLM-L6-v2"

print("Loading embedding model (first run will download it)...")
model = SentenceTransformer(MODEL_NAME)

client = chromadb.PersistentClient(path=CHROMA_DIR)

# --- Wipe existing collection since it has mixed Gemini embeddings ---
try:
    client.delete_collection(name="python_docs")
    print("Deleted old 'python_docs' collection (had mixed embeddings).")
except Exception:
    print("No existing collection to delete — starting fresh.")

collection = client.get_or_create_collection(name="python_docs")

def build_embed_text(chunk):
    parts = [chunk["page_title"], chunk["section_path"], chunk["text"]]
    if chunk["code_blocks"]:
        parts.append("\n".join(chunk["code_blocks"]))
    return "\n\n".join(p for p in parts if p)

def process_version(version):
    chunks_path = PROCESSED_DIR / f"python-{version}" / "chunks.json"
    with open(chunks_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    print(f"\n=== Embedding Python {version}: {len(chunks)} chunks ===")

    texts_to_embed = []
    ids = []
    metadatas = []

    for i, chunk in enumerate(chunks):
        embed_text_str = build_embed_text(chunk)
        if not embed_text_str.strip():
            continue

        texts_to_embed.append(embed_text_str)
        ids.append(f"{version}_{chunk['source_file']}_{i}")
        metadatas.append({
            "page_title": chunk["page_title"],
            "section_path": chunk["section_path"],
            "source_file": chunk["source_file"],
            "version": chunk["version"],
            "has_code": bool(chunk["code_blocks"]),
        })

    # Batch-embed everything for this version in one go (fast, local, in-memory)
    print(f"  Encoding {len(texts_to_embed)} chunks locally...")
    embeddings = model.encode(
        texts_to_embed,
        batch_size=64,
        show_progress_bar=True,
        convert_to_numpy=True
    )

    # Write to Chroma in batches of 500 (Chroma has its own batch limits)
    BATCH_SIZE = 500
    for start in range(0, len(ids), BATCH_SIZE):
        end = start + BATCH_SIZE
        collection.add(
            ids=ids[start:end],
            embeddings=embeddings[start:end].tolist(),
            metadatas=metadatas[start:end],
            documents=texts_to_embed[start:end]
        )

    print(f"Done with Python {version}: {len(ids)} chunks embedded")

for version in VERSIONS:
    process_version(version)

print(f"\nTotal items in collection: {collection.count()}")