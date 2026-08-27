from fastapi import FastAPI
from pydantic import BaseModel

from app.rag_pipeline import answer_question
from fastapi.middleware.cors import CORSMiddleware



app = FastAPI(title="Python Docs RAG Chatbot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # your Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    answer: str
    version_used: str
    sources: list[dict]

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/ask", response_model=QueryResponse)
def ask(request: QueryRequest):
    result = answer_question(request.question)
    return result