from __future__ import annotations

import os
import shutil
import tempfile
from typing import Any, Dict, List, Optional

import chromadb
import whisper
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

CHROMA_DIR = os.getenv("CHROMA_DIR", "./chroma_data")
EMBEDDING_MODEL_NAME = os.getenv(
    "EMBEDDING_MODEL_NAME",
    "intfloat/multilingual-e5-base"
)
WHISPER_MODEL_NAME = os.getenv("WHISPER_MODEL_NAME", "base")

app = FastAPI(title="Velora AI Service", version="1.0.0")

client = chromadb.PersistentClient(path=CHROMA_DIR)
embedding_model: Optional[SentenceTransformer] = None
whisper_model = None

class EmbedRequest(BaseModel):
    id: str
    text: str
    userId: str
    type: str = "document"
    collection: str = "velora_vectors"

class SearchRequest(BaseModel):
    query: str
    userId: str
    contextId: Optional[str] = None
    k: int = Field(default=5, ge=1, le=20)
    collection: str = "velora_vectors"

def get_embedding_model() -> SentenceTransformer:
    global embedding_model
    if embedding_model is None:
        embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return embedding_model

def get_whisper_model():
    global whisper_model
    if whisper_model is None:
        whisper_model = whisper.load_model(WHISPER_MODEL_NAME)
    return whisper_model

def get_collection(name: str):
    return client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
    )

def chunk_text(text: str, chunk_size: int = 1200, overlap: int = 250) -> List[str]:
    text = (text or "").strip()
    if not text:
        return []

    paragraphs = [p.strip() for p in text.splitlines() if p.strip()]

    chunks: List[str] = []
    current = ""

    for paragraph in paragraphs:
        if len(current) + len(paragraph) + 2 <= chunk_size:
            current = (current + "\n\n" + paragraph).strip()
            continue

        if current:
            chunks.append(current)

        if len(paragraph) <= chunk_size:
            current = paragraph
        else:
            start = 0
            while start < len(paragraph):
                end = min(start + chunk_size, len(paragraph))
                piece = paragraph[start:end].strip()
                if piece:
                    chunks.append(piece)
                if end >= len(paragraph):
                    break
                start = max(0, end - overlap)
            current = ""

    if current:
        chunks.append(current)

    merged: List[str] = []

    for i, chunk in enumerate(chunks):
        if i == 0:
            merged.append(chunk)
            continue

        prev_tail = chunks[i - 1][-overlap:].strip()
        merged.append((prev_tail + "\n\n" + chunk).strip())

    return merged

@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "chromaDir": CHROMA_DIR,
        "embeddingModel": EMBEDDING_MODEL_NAME,
        "whisperModel": WHISPER_MODEL_NAME,
    }

@app.post("/embed")
def embed(req: EmbedRequest) -> Dict[str, Any]:
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text is empty")

    collection = get_collection(req.collection)

    try:
        existing = collection.get(where={"contextId": req.id})
        ids = existing.get("ids", [])
        if ids:
            collection.delete(ids=ids)
    except Exception:
        pass

    chunks = chunk_text(req.text)
    if not chunks:
        raise HTTPException(status_code=400, detail="No valid chunks")

    model = get_embedding_model()
    embeddings = model.encode(chunks, normalize_embeddings=True).tolist()

    ids = [f"{req.id}::chunk::{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "contextId": req.id,
            "userId": req.userId,
            "type": req.type,
            "chunkIndex": i,
        }
        for i in range(len(chunks))
    ]

    collection.add(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas,
    )

    return {
        "success": True,
        "contextId": req.id,
        "chunks": len(chunks),
    }

@app.post("/search")
def search(req: SearchRequest) -> Dict[str, Any]:
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query is empty")

    collection = get_collection(req.collection)
    model = get_embedding_model()
    query_embedding = model.encode([req.query], normalize_embeddings=True).tolist()[0]

    where_filter: Dict[str, Any] = {"userId": req.userId}
    if req.contextId:
        where_filter = {
            "$and": [
                {"userId": req.userId},
                {"contextId": req.contextId},
            ]
        }

    try:
        result = collection.query(
            query_embeddings=[query_embedding],
            n_results=req.k,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chroma search error: {e}")

    documents = result.get("documents", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]
    distances = result.get("distances", [[]])[0]

    return {
        "chunks": documents,
        "metadatas": metadatas,
        "distances": distances,
    }

class GraphRequest(BaseModel):
    userId: str
    collection: str = "velora_vectors"
    minSimilarity: float = Field(default=0.55, ge=0.0, le=1.0)
    maxEdgesPerNode: int = Field(default=5, ge=1, le=20)

@app.post("/graph")
def build_knowledge_graph(req: GraphRequest) -> Dict[str, Any]:
    """
    Xây "bản đồ tri thức": tận dụng LẠI chính các vector embedding đã có sẵn
    (dùng cho RAG chat) để tính độ liên quan ngữ nghĩa giữa TẤT CẢ ghi chú/tài
    liệu của người dùng, không cần gọi thêm AI text-generation nào.
    Mỗi contextId (1 note hoặc 1 document) có thể có nhiều chunk -> gộp lại
    thành 1 vector đại diện (centroid) rồi so sánh cosine similarity từng cặp.
    """
    collection = get_collection(req.collection)

    try:
        raw = collection.get(
            where={"userId": req.userId},
            include=["embeddings", "metadatas"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chroma get error: {e}")

    embeddings = raw.get("embeddings", [])
    metadatas = raw.get("metadatas", [])

    if embeddings is None or len(embeddings) == 0:
        return {"nodes": [], "edges": []}

    import numpy as np

    buckets: Dict[str, Dict[str, Any]] = {}

    for vector, meta in zip(embeddings, metadatas):
        context_id = meta.get("contextId")
        if not context_id:
            continue

        bucket = buckets.setdefault(context_id, {
            "type": meta.get("type", "document"),
            "vectors": [],
        })
        bucket["vectors"].append(vector)

    if len(buckets) < 2:
        return {
            "nodes": [
                {"id": cid, "type": b["type"]} for cid, b in buckets.items()
            ],
            "edges": [],
        }

    context_ids = list(buckets.keys())
    centroids = np.array([
        np.mean(buckets[cid]["vectors"], axis=0) for cid in context_ids
    ])

    norms = np.linalg.norm(centroids, axis=1, keepdims=True)
    norms[norms == 0] = 1e-9
    normalized = centroids / norms

    similarity_matrix = normalized @ normalized.T

    edges = []
    n = len(context_ids)

    for i in range(n):

        scored = [
            (j, float(similarity_matrix[i][j]))
            for j in range(n)
            if j != i and similarity_matrix[i][j] >= req.minSimilarity
        ]
        scored.sort(key=lambda x: x[1], reverse=True)

        for j, score in scored[: req.maxEdgesPerNode]:
            pair = tuple(sorted((context_ids[i], context_ids[j])))
            edges.append({"from": pair[0], "to": pair[1], "weight": round(score, 4)})

    unique_edges = {}
    for e in edges:
        key = (e["from"], e["to"])
        if key not in unique_edges or e["weight"] > unique_edges[key]["weight"]:
            unique_edges[key] = e

    nodes = [{"id": cid, "type": buckets[cid]["type"]} for cid in context_ids]

    return {"nodes": nodes, "edges": list(unique_edges.values())}

@app.delete("/embed/{context_id}")
def delete_embed(context_id: str, collection: str = "velora_vectors") -> Dict[str, Any]:
    col = get_collection(collection)

    try:
        existing = col.get(where={"contextId": context_id})
        ids = existing.get("ids", [])
        if ids:
            col.delete(ids=ids)
        return {
            "success": True,
            "deleted": len(ids),
            "contextId": context_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete error: {e}")

@app.post("/audio/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form("vi"),
) -> Dict[str, Any]:
    suffix = os.path.splitext(file.filename or "")[1] or ".wav"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        temp_path = tmp.name
        shutil.copyfileobj(file.file, tmp)

    try:
      initial_prompt = (
          "Đây là audio tiếng Việt, có thể có giọng miền Bắc, miền Trung, miền Nam "
          "hoặc một số từ địa phương. Nội dung thường liên quan đến học tập, công nghệ thông tin, "
          "lập trình, deadline, bài tập, thuyết trình, dự án sinh viên. "
          "Hãy nhận dạng rõ ràng, giữ đúng thuật ngữ tiếng Anh như Java, Spring Boot, React, Docker, API, database."
      )

      result = get_whisper_model().transcribe(
          temp_path,
          language=language or "vi",
          fp16=False,
          temperature=0,
          initial_prompt=initial_prompt,
          condition_on_previous_text=True,
      )

      segments = result.get("segments") or []
      avg_logprob_values = [
          seg.get("avg_logprob")
          for seg in segments
          if isinstance(seg, dict) and seg.get("avg_logprob") is not None
      ]

      avg_logprob = (
          sum(avg_logprob_values) / len(avg_logprob_values)
          if avg_logprob_values
          else None
      )

      return {
          "transcript": result.get("text", "").strip(),
          "language": result.get("language", language),
          "segments": len(segments),
          "avgLogprob": avg_logprob,
      }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Whisper error: {e}")
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass
