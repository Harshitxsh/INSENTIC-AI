from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from agents.workflow import compiled_graph

router = APIRouter()

class OrchestrateRequest(BaseModel):
    query: str
    session_id: Optional[str] = "default"
    options: Optional[Dict[str, Any]] = None

@router.post("")
def orchestrate_query(req: OrchestrateRequest):
    """
    Triggers the compiled LangGraph pipeline to execute our multi-agent RAG workflow.
    Returns the complete trace log and synthesized governance analysis under session namespaces.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query text cannot be empty.")
        
    try:
        # Construct initial state
        initial_state = {
            "query": req.query,
            "query_expanded": "",
            "documents": [],
            "compressed_context": "",
            "session_id": req.session_id or "default",
            "reasoning_summary": "",
            "citations": [],
            "governance_report": {},
            "confidence_score": 0.0,
            "execution_trace": [],
            "node_latency_metrics": {},
            "final_response": ""
        }
        
        # Invoke LangGraph synchronously
        final_state = compiled_graph.invoke(initial_state)
        
        # Structure the API response
        return {
            "status": "success",
            "query": final_state.get("query"),
            "query_expanded": final_state.get("query_expanded"),
            "session_id": final_state.get("session_id"),
            "final_response": final_state.get("final_response"),
            "reasoning_summary": final_state.get("reasoning_summary"),
            "documents": final_state.get("documents", []),
            "citations": final_state.get("citations", []),
            "confidence_score": final_state.get("confidence_score", 0.0),
            "governance_report": final_state.get("governance_report", {}),
            "execution_trace": final_state.get("execution_trace", []),
            "node_latency_metrics": final_state.get("node_latency_metrics", {})
        }
    except Exception as e:
        import traceback
        print(f"Orchestration workflow failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Orchestration execution failed: {str(e)}")
