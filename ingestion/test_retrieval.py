from sentence_transformers import SentenceTransformer
import chromadb

CHROMA_DIR = r"D:\cv_project\pythonicx\chroma_db"
MODEL_NAME = "all-MiniLM-L6-v2"

model = SentenceTransformer(MODEL_NAME)

client = chromadb.PersistentClient(path=CHROMA_DIR)
collection = client.get_or_create_collection(name="python_docs")

def search(query, n_results=5, version_filter=None):
    query_embedding = model.encode([query])[0].tolist()

    where_clause = {"version": version_filter} if version_filter else None

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where=where_clause
    )

    print(f"\n=== Query: \"{query}\" ===")
    if version_filter:
        print(f"(filtered to version {version_filter})")

    for i in range(len(results["ids"][0])):
        meta = results["metadatas"][0][i]
        distance = results["distances"][0][i]
        doc_preview = results["documents"][0][i][:150].replace("\n", " ")

        print(f"\n--- Result {i+1} (distance: {distance:.4f}) ---")
        print(f"Page: {meta['page_title']}")
        print(f"Section: {meta['section_path']}")
        print(f"Version: {meta['version']} | Has code: {meta['has_code']}")
        print(f"Preview: {doc_preview}...")

# Try a few different test queries
search("how do I handle exceptions in python")
search("what is a generator")
search("how to open a file")