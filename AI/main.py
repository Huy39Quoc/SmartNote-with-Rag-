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

    # Thêm overlap mềm giữa các chunk liền kề
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

    # Xóa vector cũ cùng context trước khi embed lại
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
        model = get_whisper_model()
        result = model.transcribe(
            temp_path,
            language=language,
            fp16=False,
        )
        return {
            "transcript": result.get("text", "").strip(),
            "language": result.get("language", language),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Whisper error: {e}")
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass