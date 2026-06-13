import os
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from typing import Optional, Dict, Any
from services.vector_store import VectorStoreService
from utils.document_parser import DocumentParser
from utils.auth import get_current_user
from services.firestore import save_document_metadata

router = APIRouter()

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    session_id: str = Form("default"),
    doc_type: Optional[str] = Form("Ingested File"),
    folder_path: Optional[str] = Form("/"),
    user: dict = Depends(get_current_user)
):
    """
    Dynamic Enterprise Ingestion Endpoint.
    Accepts multipart document files, validates formats, parses content,
    semantically chunks it, embeds it, and indexes it with directory hierarchy metadata.
    """
    filename = file.filename or "unknown_file"
    ext = os.path.splitext(filename.lower())[1]
    
    # 1. Format and Extension Validation & System/Temp File Pre-checks
    supported_extensions = [".pdf", ".docx", ".pptx", ".xlsx", ".csv", ".txt"]
    
    # Identify hidden, temporary, or unindexable files
    is_hidden = filename.startswith(".") or filename.lower() in ["thumbs.db", "desktop.ini"]
    is_temp = filename.startswith("~$")
    
    if is_hidden or is_temp or ext not in supported_extensions:
        reason = f"Unsupported format '{ext}'."
        if is_hidden:
            reason = "File is hidden or system metadata."
        elif is_temp:
            reason = "File is a temporary Office file."
            
        return {
            "status": "skipped",
            "indexed": 0,
            "skipped": 1,
            "warnings": [reason],
            "filename": filename,
            "chunks_added": 0,
            "ingestion_logs": [
                f"[VALIDATOR] File '{filename}' identified as invalid or metadata/temporary. Skipped gracefully."
            ]
        }
        
    try:
        # Read file bytes securely
        file_bytes = await file.read()
        
        # 2. Empty File or File Size Validation (Max 15MB)
        if len(file_bytes) == 0:
            return {
                "status": "skipped",
                "indexed": 0,
                "skipped": 1,
                "warnings": ["File contains zero bytes."],
                "filename": filename,
                "chunks_added": 0,
                "ingestion_logs": [
                    f"[VALIDATOR] File '{filename}' is empty (0 bytes). Skipped gracefully."
                ]
            }

        max_size = 15 * 1024 * 1024
        if len(file_bytes) > max_size:
            return {
                "status": "skipped",
                "indexed": 0,
                "skipped": 1,
                "warnings": ["File size exceeds the authorized 15MB limit."],
                "filename": filename,
                "chunks_added": 0,
                "ingestion_logs": [
                    f"[VALIDATOR] File '{filename}' exceeds size limit. Skipped."
                ]
            }
            
        print(f"Parsing uploaded file '{filename}' under folder '{folder_path}' (session: {session_id})...")
        
        parser_logs = []
        # 3. Safe Parser Extraction
        try:
            extracted_text = DocumentParser.extract_text(file_bytes, filename, logs=parser_logs)
        except Exception as parse_err:
            return {
                "status": "skipped",
                "indexed": 0,
                "skipped": 1,
                "warnings": [f"Failed to parse: {str(parse_err)}"],
                "filename": filename,
                "chunks_added": 0,
                "ingestion_logs": parser_logs + [
                    f"[PARSER] Extraction error on '{filename}': {str(parse_err)}. Skipped gracefully."
                ]
            }
        
        if not extracted_text.strip() or len(extracted_text.strip()) < 50:
            warning_msg = "Document contains zero indexable text parameters." if not extracted_text.strip() else "Document contains insufficient indexable text after OCR."
            return {
                "status": "skipped",
                "indexed": 0,
                "skipped": 1,
                "warnings": [warning_msg],
                "filename": filename,
                "chunks_added": 0,
                "ingestion_logs": parser_logs + [
                    f"[PARSER] Document '{filename}' failed readability threshold. Skipped gracefully."
                ]
            }
            
        # 4. Safe Vector Ingestion
        is_ocr = any("[OCR]" in log for log in parser_logs)
        try:
            chunks_added = VectorStoreService.ingest_text(
                text=extracted_text,
                source_name=filename,
                doc_type=doc_type or "general",
                session_id=session_id,
                metadata_extra={
                    "file_type": ext,
                    "file_size": len(file_bytes),
                    "folder_path": folder_path or "/",
                    "source_type": "ocr" if is_ocr else "native"
                }
            )
        except Exception as ingest_err:
            return {
                "status": "skipped",
                "indexed": 0,
                "skipped": 1,
                "warnings": [f"Database ingestion failed: {str(ingest_err)}"],
                "filename": filename,
                "chunks_added": 0,
                "ingestion_logs": parser_logs + [
                    f"[VECTORSTORE] Ingestion failed for '{filename}': {str(ingest_err)}. Skipped gracefully."
                ]
            }
        
        import datetime
        doc_metadata = {
            "ownerUid": user.get("uid"),
            "userId": user.get("uid"),
            "fileName": filename,
            "fileType": ext,
            "uploadDate": datetime.datetime.utcnow().isoformat(),
            "ingestionStatus": "indexed",
            "chunkCount": chunks_added,
            "storageReference": f"local/{filename}",
            "createdAt": datetime.datetime.utcnow().isoformat()
        }
        save_document_metadata(doc_metadata)

        # Return structured staged ingestion logs
        return {
            "status": "success",
            "indexed": 1,
            "skipped": 0,
            "warnings": [],
            "message": f"Successfully parsed and ingested document: {filename}",
            "filename": filename,
            "file_type": ext,
            "session_id": session_id,
            "folder_path": folder_path or "/",
            "chunks_added": chunks_added,
            "ingestion_logs": parser_logs + [
                f"[PARSER] Detected file type '{ext}' for file '{filename}'. Extracted {len(extracted_text)} characters.",
                f"[PARSER] Mapped directory hierarchy: '{folder_path or '/'}'",
                "[CHUNKER] Built semantic knowledge segments using Recursive splitter.",
                f"[EMBEDDING_ENGINE] Generated vector embeddings using text-embedding-004.",
                f"[CHROMADB] Indexed {chunks_added} chunks into isolated namespace '{session_id}'.",
                f"[READY] Knowledge source '{filename}' available for governance-aware retrieval."
            ]
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "status": "skipped",
            "indexed": 0,
            "skipped": 1,
            "warnings": [f"Unexpected ingestion failure: {str(e)}"],
            "filename": filename,
            "chunks_added": 0,
            "ingestion_logs": [
                f"[SYSTEM] Fatal error during processing: {str(e)}. Skipped gracefully."
            ]
        }

@router.get("")
def list_documents(session_id: str = "default", user: dict = Depends(get_current_user)):
    """
    Returns lists of all unique documents currently ingested matching the session namespace.
    """
    try:
        docs = VectorStoreService.get_all_documents(session_id=session_id)
        return {
            "status": "success",
            "documents": docs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query database: {str(e)}")
