import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.knowledge import router as knowledge_router
from routes.orchestration import router as orchestration_router
from services.vector_store import VectorStoreService

app = FastAPI(
    title="INSENTIC AI Backend API",
    description="Backend orchestration gateway featuring LangGraph, ChromaDB, and compliance auditing.",
    version="1.0.0"
)

# Configure CORS for Next.js communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://agentic-ai-hackathon-insidious.web.app",
        "https://agentic-ai-hackathon-insidious.firebaseapp.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(orchestration_router, prefix="/api/orchestrate", tags=["Orchestration"])
app.include_router(knowledge_router, prefix="/api/documents", tags=["Knowledge Base"])

@app.on_event("startup")
def on_startup():
    """
    Triggers database seeding with mock enterprise policy files on server startup
    to guarantee immediate compliance querying capabilities.
    """
    try:
        VectorStoreService.initialize_demo_data()
    except Exception as e:
        print(f"Error seeding initial database: {e}")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "INSENTIC AI Backend API",
        "api_docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)