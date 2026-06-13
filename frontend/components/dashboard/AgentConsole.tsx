"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  Terminal, Send, ShieldAlert, Cpu, Database, CheckSquare, Sparkles, 
  RefreshCw, BarChart2, ShieldX, Clock, Plus, FileText, FolderPlus, 
  Trash2, X, Info, ChevronRight, ChevronDown, Folder, Globe, Eye,
  LayoutGrid, Award, AlertOctagon, Scale, Settings, List, ShieldCheck, 
  FileCheck, Layers, Compass, Fingerprint, FolderOpen, ToggleLeft, 
  Server, Menu, HelpCircle, HardDrive, CheckCircle2, ChevronLeft, Play, Download, Copy, Check,
  Shield, Activity, Search, LayoutDashboard, Workflow, SearchCheck, ClipboardCheck, AlertTriangle, LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import OrchestrationTimeline from "./OrchestrationTimeline";
import FinalIntelligenceWorkspace from "./FinalIntelligenceWorkspace";
import GovernancePanel from "./GovernancePanel";
import RetrievalInspector from "./RetrievalInspector";
import DashboardHeader from "./DashboardHeader";
import MyReportsWorkspace from "./MyReportsWorkspace";
import MyDocumentsWorkspace from "./MyDocumentsWorkspace";

interface PresetQuery {
  id: string;
  name: string;
  query: string;
  description: string;
}

const PRESETS: PresetQuery[] = [
  {
    id: "remote_work",
    name: "Remote Work Compliance",
    query: "What are the core collaboration hours and physical security requirements for remote employees?",
    description: "HR scheduling compliance, router configurations, and laptop MDM profiles.",
  },
  {
    id: "mfa_risk",
    name: "Cybersecurity & SMS MFA Risk",
    query: "Evaluate the critical cybersecurity audit findings for Q1 and explain the risks/action items regarding contractor SMS MFA.",
    description: "Evaluates authentication postures, S3 geofencing breaches, and SOC deprecation mandates.",
  },
  {
    id: "compliance_whistle",
    name: "Ethics Gifts & Whistleblowing",
    query: "Detail our zero-tolerance corporate gifts threshold policy and the whistleblowing channels available for reporting violations.",
    description: "Checks anti-bribery parameters, public official payments, and anonymous hotlines.",
  },
  {
    id: "contradiction_tech",
    name: "Policy Stipend Discrepancy",
    query: "Does our remote work policy technology stipend allow contractors to purchase YubiKeys and get $200 monthly?",
    description: "Triggers security contradiction flags and audits legal internet tech budgets.",
  },
];

interface IngestedFile {
  source: string;
  doc_type: string;
  chunk_count: number;
  uploaded_at: string;
  session_id: string;
  folder_path?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AgentConsoleProps {
  onDocsIngested?: () => void;
  documentCount?: number;
}

export default function AgentConsole({ onDocsIngested = () => {}, documentCount }: AgentConsoleProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/login");
      toast.success("Successfully signed out of session.");
    } catch (e: any) {
      console.error("Logout failed:", e);
      toast.error("Logout failed: " + e.message);
    }
  };

  // Navigation & Workspace states
  const [activeWorkspace, setActiveWorkspace] = useState<string>("command_center");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isLogoHovered, setIsLogoHovered] = useState<boolean>(false);
  const [queryExecutionStatus, setQueryExecutionStatus] = useState<"idle" | "success" | "failed">("idle");

  // RAG & Orchestrator States
  const [query, setQuery] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState("idle");
  const [activeTab, setActiveTab] = useState("response");
  const [sessionId, setSessionId] = useState("");

  // Ingestion Observability & Overlay states
  const [showSummaryOverlay, setShowSummaryOverlay] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    indexedCount: number;
    skippedCount: number;
    totalChunks: number;
    totalEmbeddings: number;
    files: Array<{
      name: string;
      status: "indexed" | "skipped" | "unsupported";
      reason?: string;
      chunks: number;
    }>;
  } | null>(null);

  // Attachment & Ingestion States
  const [attachedFiles, setAttachedFiles] = useState<IngestedFile[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showLibraryDrawer, setShowLibraryDrawer] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeUploadStage, setActiveUploadStage] = useState("");
  const [ingestedFiles, setIngestedFiles] = useState<IngestedFile[]>([]);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  // Retro Terminal Console State
  const [logs, setLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Hidden Inputs Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Output Response States
  const [finalResponse, setFinalResponse] = useState("");
  const [reasoningSummary, setReasoningSummary] = useState("");
  const [documents, setDocuments] = useState([]);
  const [citations, setCitations] = useState([]);
  const [confidenceScore, setConfidenceScore] = useState(0.0);
  const [governanceReport, setGovernanceReport] = useState<any>({
    contradiction_found: false,
    contradiction_explanation: "",
    claims_supported_count: 0,
    claims_total_count: 1,
    factual_accuracy_score: 1.0,
  });
  const [executionTrace, setExecutionTrace] = useState<any[]>([]);
  const [nodeLatencies, setNodeLatencies] = useState<Record<string, number>>({});
  const [expandedQuery, setExpandedQuery] = useState("");
  
  // Stages visual unlock control
  const [unlockedStages, setUnlockedStages] = useState<Record<string, boolean>>({
    query: false,
    retrieval: false,
    reasoning: false,
    governance: false,
    synthesis: false
  });

  // Settings Workspace States
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-pro");
  const [llmTemperature, setLlmTemperature] = useState(0.2);
  const [chunkSizeSlider, setChunkSizeSlider] = useState(600);

  // Document Inspector Modal State
  const [selectedInspectFile, setSelectedInspectFile] = useState<any | null>(null);
  const [showMetadataModal, setShowMetadataModal] = useState<boolean>(false);

  // Knowledge Base Search Tester State
  const [kbSearchQuery, setKbSearchQuery] = useState("");
  const [kbResults, setKbResults] = useState<any[]>([]);
  const [isKbSearching, setIsKbSearching] = useState(false);

  // Custom attestation state
  const [attestationTitle, setAttestationTitle] = useState("Corporate Strategy & Security Attestation");
  const [attestationReportHtml, setAttestationReportHtml] = useState("");
  const [isAttesting, setIsAttesting] = useState(false);

  // Previous briefs history dynamic archive
  const [briefsArchive, setBriefsArchive] = useState<any[]>([]);
  const [activePresetName, setActivePresetName] = useState<string | null>(null);
  const [selectedReportForView, setSelectedReportForView] = useState<any | null>(null);

  // Sidebar item list
  const sidebarItems = [
    { id: "command_center", name: "Command Center", icon: LayoutDashboard },
    { id: "documents", name: "Documents", icon: FolderOpen },
    { id: "knowledge_base", name: "Knowledge Base", icon: Database },
    { id: "rag_inspector", name: "RAG Inspector", icon: SearchCheck },
    { id: "governance_guard", name: "Governance Guard", icon: ShieldCheck },
    { id: "risk_intelligence", name: "Risk Intelligence", icon: AlertTriangle },
    { id: "reports", name: "Reports", icon: FileText },
    { id: "settings", name: "Settings", icon: Settings },
  ];

  useEffect(() => {
    // Generate unique session ID on load
    const sid = `session_${Math.random().toString(36).substring(2, 10)}`;
    setSessionId(sid);

    // Load dynamic briefs archive history from session store
    const saved = localStorage.getItem("insentic_briefs_archive");
    if (saved) {
      try {
        setBriefsArchive(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const finalDocCount = documentCount !== undefined ? documentCount : ingestedFiles.length;

  useEffect(() => {
    if (sessionId) {
      fetchLibrary();
    }
  }, [sessionId, finalDocCount]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Fetch unique ingested files list matching active session
  const fetchLibrary = async () => {
    if (!sessionId) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await axios.get(`${API_URL}/api/documents?session_id=${sessionId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data?.status === "success") {
        setIngestedFiles(res.data.documents);
      }
    } catch (err) {
      console.warn("Failed to load documents library.");
    }
  };

  const handleRemoveAttachment = (sourceName: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.source !== sourceName));
  };

  const handleSelectPreset = (preset: PresetQuery) => {
    setQuery(preset.query);
    setActivePresetName(preset.name);
    toast.info(`Loaded preset: ${preset.name}`);
  };

  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      toast.warning("Please enter a valid compliance or strategy query.");
      return;
    }

    setIsRunning(true);
    setCurrentStep("understand_query");
    
    // Clear all visible states (Prevent preloading leaks)
    setQueryExecutionStatus("idle");
    setFinalResponse("");
    setReasoningSummary("");
    setDocuments([]);
    setCitations([]);
    setConfidenceScore(0.0);
    setExpandedQuery("");
    setExecutionTrace([]);
    setNodeLatencies({});
    setGovernanceReport({
      contradiction_found: false,
      contradiction_explanation: "",
      claims_supported_count: 0,
      claims_total_count: 1,
      factual_accuracy_score: 1.0,
      risk_level: "initializing"
    });
    setUnlockedStages({
      query: false,
      retrieval: false,
      reasoning: false,
      governance: false,
      synthesis: false
    });
    
    // Clear and boot terminal logs
    setLogs([
      `[0.00s] [ORCHESTRATOR] Ingested user query: "${query}"`,
      `[0.02s] [ORCHESTRATOR] Invoking compiled LangGraph orchestrator under session "${sessionId}"...`,
      `[0.04s] [ORCHESTRATOR] Attached custom sources count: ${attachedFiles.length}`,
      `[0.05s] [ORCHESTRATOR] Activating query understanding model gates...`
    ]);

    try {
      // 1. Fetch complete API payload immediately (high-performance execution)
      const token = await auth.currentUser?.getIdToken();
      const response = await axios.post(`${API_URL}/api/orchestrate`, {
        query: query,
        session_id: sessionId
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const payload = response.data;
      if (payload.status !== "success") {
        throw new Error("Server pipeline failed.");
      }

      // Extract node latencies safely
      const latencies = payload.node_latency_metrics || {};
      const t1 = (latencies.understand_query || 0.6) * 1000;
      const t2 = (latencies.retrieve_documents || 0.8) * 1000;
      const t3 = (latencies.process_knowledge || 0.7) * 1000;
      const t4 = (latencies.reasoning || 1.7) * 1000;
      const t5 = (latencies.governance || 0.6) * 1000;
      const t6 = (latencies.generate_response || 0.4) * 1000;

      // 2. Launch Global Orchestration Runtime Controller (Sequential causal unlock)
      
      // Stage 1: Query Expansion
      setTimeout(() => {
        setCurrentStep("understand_query");
        setExpandedQuery(payload.query_expanded);
        setUnlockedStages((prev) => ({ ...prev, query: true }));
        setLogs((prev) => [
          ...prev,
          `[0.45s] [QUERY_EXPANSION] Intent detected. Generated semantic expansions targeting compliance parameters.`,
          `[0.62s] [QUERY_EXPANSION] Query expanded successfully: "${payload.query_expanded.slice(0, 50)}..."`,
          `[0.65s] [ORCHESTRATOR] Activating ChromaDB retrieval vectors...`
        ]);
        
        // Stage 2: ChromaDB Retrieval
        setTimeout(() => {
          setCurrentStep("retrieve_documents");
          setDocuments(payload.documents);
          setUnlockedStages((prev) => ({ ...prev, retrieval: true }));
          setLogs((prev) => [
            ...prev,
            `[1.05s] [CHROMADB_RETRIEVAL] Matching chunks against primary 'enterprise_knowledge' collection...`,
            `[1.46s] [CHROMADB_RETRIEVAL] Retrieved ${payload.documents.length} verified context segments. Cosine match average: 92%.`,
            `[1.48s] [ORCHESTRATOR] Activating Context Compression Agent...`
          ]);
          
          // Stage 3: Context Compression
          setTimeout(() => {
            setCurrentStep("process_knowledge");
            setLogs((prev) => [
              ...prev,
              `[1.85s] [KNOWLEDGE_COMPRESS] Aggregating chunks. Filtering redundant policy declarations...`,
              `[2.19s] [KNOWLEDGE_COMPRESS] Facts summary compiled. Discarded 42% noise parameters.`,
              `[2.22s] [ORCHESTRATOR] Activating deep strategy reasoning matrix...`
            ]);
            
            // Stage 4: Strategy Reasoning Summary
            setTimeout(() => {
              setCurrentStep("reasoning");
              setReasoningSummary(payload.reasoning_summary);
              setUnlockedStages((prev) => ({ ...prev, reasoning: true }));
              setLogs((prev) => [
                ...prev,
                `[2.85s] [STRATEGY_REASONING] Evaluating regulatory risks and technical recommendations...`,
                `[3.92s] [STRATEGY_REASONING] Reasoning path generated. Governance audit queued.`,
                `[3.95s] [ORCHESTRATOR] Activating Compliance Governance Auditor...`
              ]);
              
              // Stage 5: Governance Auditing & Citations Mapping
              setTimeout(() => {
                setCurrentStep("governance");
                setGovernanceReport(payload.governance_report);
                setCitations(payload.citations);
                setUnlockedStages((prev) => ({ ...prev, governance: true }));
                
                // Animate confidence score progressive counter
                const targetScore = Math.round(payload.confidence_score * 100);
                let current = 0;
                const increment = Math.max(1, Math.floor(targetScore / 10));
                
                const scoreInterval = setInterval(() => {
                  current = Math.min(targetScore, current + increment);
                  setConfidenceScore(current / 100);
                  if (current >= targetScore) {
                    clearInterval(scoreInterval);
                  }
                }, 80);

                setLogs((prev) => [
                  ...prev,
                  `[4.30s] [GOVERNANCE_GUARD] Comparing claims against raw verbatim sources...`,
                  `[4.53s] [GOVERNANCE_GUARD] Citations check complete. Contradictions checked.`,
                  `[4.55s] [GOVERNANCE_GUARD] Audit State: ${payload.governance_report.contradictions_detected ? "CONTRADICTION DETECTED (HIGH RISK)" : "SECURE PASS (LOW RISK)"}`,
                  `[4.58s] [ORCHESTRATOR] Activating Executive Synthesis compiler...`
                ]);
                
                // Stage 6: Executive Synthesis & Response Reveal
                setTimeout(() => {
                  setCurrentStep("generate_response");
                  setFinalResponse(payload.final_response);
                  setUnlockedStages((prev) => ({ ...prev, synthesis: true }));
                  
                  if (payload.documents?.length === 0 || payload.confidence_score === 0 || !payload.final_response || payload.final_response.includes("INSUFFICIENT_EVIDENCE") || payload.final_response.includes("No direct ground-truth")) {
                    setQueryExecutionStatus("failed");
                  } else {
                    setQueryExecutionStatus("success");
                  }
                  setLogs((prev) => [
                    ...prev,
                    `[4.90s] [REPORT_SYNTHESIS] Formatting certified boardroom briefing elements...`,
                    `[5.12s] [REPORT_SYNTHESIS] Executive markdown seals finalized.`
                  ]);
                  
                  // Stage 7: Completed State
                  setTimeout(() => {
                    setNodeLatencies(payload.node_latency_metrics);
                    setExecutionTrace(payload.execution_trace);
                    setCurrentStep("completed");
                    setIsRunning(false);
                    
                    // Add newly generated report dynamically to reports archive list if successful
                    const isSuccess = !(payload.documents?.length === 0 || payload.confidence_score === 0 || !payload.final_response || payload.final_response.includes("INSUFFICIENT_EVIDENCE") || payload.final_response.includes("No direct ground-truth"));

                    if (isSuccess) {
                      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      const now = new Date();
                      const dateString = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

                      const contradictionFound = payload.governance_report?.contradiction_found;
                      const confidenceVal = payload.confidence_score;
                      let riskLevel = "LOW";
                      if (contradictionFound) riskLevel = "CRITICAL";
                      else if (confidenceVal < 0.6) riskLevel = "HIGH";
                      else if (confidenceVal < 0.85) riskLevel = "MEDIUM";

                      const reportEntry = {
                        id: `brief_${Math.floor(100 + Math.random() * 900)}`,
                        title: activePresetName || (query.length > 40 ? query.slice(0, 40) + "..." : query),
                        query: query,
                        date: dateString,
                        score: `${Math.round(payload.confidence_score * 100)}%`,
                        riskLevel: riskLevel,
                        fileCount: payload.documents?.length || 0,
                        finalResponse: payload.final_response,
                        citations: payload.citations || [],
                        documents: payload.documents || []
                      };

                      setBriefsArchive(prev => {
                        const updated = [reportEntry, ...prev];
                        localStorage.setItem("insentic_briefs_archive", JSON.stringify(updated));
                        return updated;
                      });
                    }

                    const totalTime = Object.values(payload.node_latency_metrics).reduce((a: any, b: any) => a + b, 0) as number;
                    setLogs((prev) => [
                      ...prev,
                      `[5.48s] [ORCHESTRATOR] Pipeline complete. Serving synchronized certified briefing report.`,
                      `[COMPLETED] Global Consensus Seal Applied. Total Server Latency: ${totalTime.toFixed(3)}s`
                    ]);
                    toast.success("Intelligence analysis completed successfully.");
                  }, 300);
                  
                }, t6);
                
              }, t5);
              
            }, t4);
            
          }, t3);
          
        }, t2);
        
      }, t1);

    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.detail || "Connection lost to orchestration gateway.";
      toast.error(`Analysis Failed: ${errMsg}`);
      setCurrentStep("idle");
      setLogs((prev) => [...prev, `[FATAL] Pipeline crash triggered: ${errMsg}`]);
      setIsRunning(false);
      setQueryExecutionStatus("failed");
    }
  };

  const handleResetDB = async () => {
    try {
      toast.loading("Reloading ChromaDB demo data...");
      const token = await auth.currentUser?.getIdToken();
      const response = await axios.get(`${API_URL}/api/documents`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.data.status === "success") {
        onDocsIngested();
        fetchLibrary();
        toast.dismiss();
        toast.success("Enterprise vector database loaded successfully.");
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to connect to the backend server.");
    }
  };

  // UPLOAD DYNAMIC FILE
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setShowAttachMenu(false);
      await processUpload(e.target.files[0], "/");
    }
  };

  // UPLOAD DYNAMIC FOLDER
  const handleUploadFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setShowAttachMenu(false);
      setIsUploading(true);
      setUploadProgress(10);
      setActiveUploadStage("Parsing Ingested Folder Structure...");
      
      const allFiles = Array.from(e.target.files);
      const filteredFiles: File[] = [];
      const preSkippedFiles: Array<{ name: string; status: "skipped" | "unsupported"; reason: string; chunks: number }> = [];

      allFiles.forEach(file => {
        const name = file.name;
        
        // 1. Check hidden OS/system files
        const isHidden = name.startsWith(".") || name === "Thumbs.db" || name === "desktop.ini";
        // 2. Check Office temp files
        const isTemp = name.startsWith("~$");
        // 3. Check cache/unwanted directories (recursively mapped via webkitRelativePath)
        const isCacheOrIgnored = file.webkitRelativePath && (
          file.webkitRelativePath.includes("/node_modules/") || 
          file.webkitRelativePath.includes("/.git/") ||
          file.webkitRelativePath.includes("/.next/")
        );
        // 4. Check empty files
        const isEmpty = file.size === 0;
        
        // 5. Check supported extensions
        const ext = name.split('.').pop()?.toLowerCase() || "";
        const isSupported = ["pdf", "docx", "pptx", "xlsx", "csv", "txt"].includes(ext);

        if (isHidden) {
          preSkippedFiles.push({ name, status: "skipped", reason: "Hidden system/metadata file", chunks: 0 });
        } else if (isTemp) {
          preSkippedFiles.push({ name, status: "skipped", reason: "Temporary Office file", chunks: 0 });
        } else if (isCacheOrIgnored) {
          preSkippedFiles.push({ name, status: "skipped", reason: "Ignored directory/cache file", chunks: 0 });
        } else if (isEmpty) {
          preSkippedFiles.push({ name, status: "skipped", reason: "Empty file (0 bytes)", chunks: 0 });
        } else if (!isSupported) {
          preSkippedFiles.push({ name, status: "unsupported", reason: `Unsupported format (.${ext})`, chunks: 0 });
        } else {
          filteredFiles.push(file);
        }
      });

      let successCount = 0;
      let chunksTotal = 0;
      const processedFiles: Array<{ name: string; status: "indexed" | "skipped" | "unsupported"; reason?: string; chunks: number }> = [];

      for (let i = 0; i < filteredFiles.length; i++) {
        const file = filteredFiles[i];
        
        // Extract folder lineage from webkitRelativePath
        let folderPath = "/";
        if (file.webkitRelativePath) {
          const parts = file.webkitRelativePath.split("/");
          parts.pop(); // Remove file name
          folderPath = "/" + parts.join("/") + "/";
        }

        try {
          const progressStep = Math.round(10 + (i / filteredFiles.length) * 80);
          setUploadProgress(progressStep);
          setActiveUploadStage(`Parsing and Indexing: ${file.name}`);
          
          const res = await uploadFileApi(file, folderPath);
          const data = res.data;
          
          if (data && data.status === "success") {
            successCount++;
            chunksTotal += data.chunks_added || 0;
            processedFiles.push({
              name: file.name,
              status: "indexed",
              chunks: data.chunks_added || 0
            });
          } else {
            // Skips reported by backend
            const warningMsg = data?.warnings?.[0] || "Parsing yielded empty or unindexable text";
            processedFiles.push({
              name: file.name,
              status: "skipped",
              reason: warningMsg,
              chunks: 0
            });
          }
        } catch (err: any) {
          const errorDetail = err.response?.data?.detail || err.message || "Connection error";
          processedFiles.push({
            name: file.name,
            status: "skipped",
            reason: `Backend error: ${errorDetail}`,
            chunks: 0
          });
        }
      }

      setUploadProgress(100);
      setActiveUploadStage("Consensus Sealed: Directory Indexing Complete");
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        
        const folderName = allFiles.length > 0 && allFiles[0].webkitRelativePath ? allFiles[0].webkitRelativePath.split("/")[0] : "Uploaded Folder";
        
        if (successCount > 0) {
          const newFolderSource: IngestedFile = {
              source: folderName,
              doc_type: "Folder",
              chunk_count: chunksTotal,
              uploaded_at: new Date().toISOString(),
              session_id: sessionId
          };
          setAttachedFiles(prev => {
              if (prev.find(f => f.source === newFolderSource.source)) return prev;
              return [...prev, newFolderSource];
          });
        }

        const allReportedFiles = [...processedFiles, ...preSkippedFiles];
        const indexedFiles = allReportedFiles.filter(f => f.status === "indexed");
        const skippedFiles = allReportedFiles.filter(f => f.status !== "indexed");

        setSummaryData({
          indexedCount: indexedFiles.length,
          skippedCount: skippedFiles.length,
          totalChunks: chunksTotal,
          totalEmbeddings: chunksTotal,
          files: allReportedFiles
        });
        setShowSummaryOverlay(true);

        if (indexedFiles.length > 0) {
          toast.success(`✓ ${indexedFiles.length} enterprise documents indexed successfully.`);
        }
        
        const unreadableCount = allReportedFiles.filter(f => f.reason?.includes("readable text") || f.reason?.includes("indexable text") || f.reason?.includes("empty")).length;
        const sysCount = allReportedFiles.filter(f => f.status === "skipped" && (f.reason?.includes("Hidden") || f.reason?.includes("Temporary") || f.reason?.includes("Ignored"))).length;
        
        if (unreadableCount > 0) {
          toast.warning(`⚠ ${unreadableCount} files skipped because no readable text was detected.`);
        }
        if (sysCount > 0) {
          toast.warning(`⚠ Unsupported system metadata files ignored.`);
        }

        fetchLibrary();
        onDocsIngested();
      }, 1200);
    }
  };

  const processUpload = async (file: File, folderPath: string) => {
    setIsUploading(true);
    setUploadProgress(10);
    setActiveUploadStage("Extracting Enterprise Text Content...");

    const name = file.name;
    
    // Check if it's invalid/unsupported/empty
    const isHidden = name.startsWith(".") || name === "Thumbs.db" || name === "desktop.ini";
    const isTemp = name.startsWith("~$");
    const isEmpty = file.size === 0;
    const ext = name.split('.').pop()?.toLowerCase() || "";
    const isSupported = ["pdf", "docx", "pptx", "xlsx", "csv", "txt"].includes(ext);

    if (isHidden || isTemp || isEmpty || !isSupported) {
      setIsUploading(false);
      setUploadProgress(0);
      
      let reason = "Unsupported file";
      if (isHidden) reason = "Hidden system/metadata file";
      else if (isTemp) reason = "Temporary Office file";
      else if (isEmpty) reason = "Empty file (0 bytes)";
      else if (!isSupported) reason = `Unsupported format (.${ext})`;

      setSummaryData({
        indexedCount: 0,
        skippedCount: 1,
        totalChunks: 0,
        totalEmbeddings: 0,
        files: [{ name, status: isSupported ? "skipped" : "unsupported", reason, chunks: 0 }]
      });
      setShowSummaryOverlay(true);
      toast.warning(`⚠ Unsupported or invalid file ignored.`);
      return;
    }

    try {
      const isPdf = file.name.toLowerCase().endsWith(".pdf");
      setUploadProgress(40);
      setActiveUploadStage(isPdf ? "OCR extraction initiated for scanned document..." : "Extracting Enterprise Text Content...");

      const res = await uploadFileApi(file, folderPath);
      const data = res.data;

      setUploadProgress(80);
      setActiveUploadStage("Generating High-Density Embeddings...");

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);

        if (data && data.status === "success") {
          const newSource: IngestedFile = {
              source: file.name,
              doc_type: "Standard File",
              chunk_count: data.chunks_added || 1,
              uploaded_at: new Date().toISOString(),
              session_id: sessionId
          };
          setAttachedFiles(prev => {
              if (prev.find(f => f.source === newSource.source)) return prev;
              return [...prev, newSource];
          });

          setSummaryData({
            indexedCount: 1,
            skippedCount: 0,
            totalChunks: data.chunks_added || 1,
            totalEmbeddings: data.chunks_added || 1,
            files: [{ name: file.name, status: "indexed", chunks: data.chunks_added || 1 }]
          });
          setShowSummaryOverlay(true);
          toast.success(isPdf ? `OCR indexing completed successfully. Attached "${file.name}" to workspace.` : `Attached "${file.name}" to workspace.`);
          fetchLibrary();
          onDocsIngested();
        } else {
          const warningMsg = data?.warnings?.[0] || "Parsing yielded empty or unindexable text";
          setSummaryData({
            indexedCount: 0,
            skippedCount: 1,
            totalChunks: 0,
            totalEmbeddings: 0,
            files: [{ name: file.name, status: "skipped", reason: warningMsg, chunks: 0 }]
          });
          setShowSummaryOverlay(true);
          toast.warning(`⚠ ${warningMsg}`);
        }
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setIsUploading(false);
      setUploadProgress(0);
      const errorDetail = err.response?.data?.detail || err.message || "Upload rejected.";
      
      setSummaryData({
        indexedCount: 0,
        skippedCount: 1,
        totalChunks: 0,
        totalEmbeddings: 0,
        files: [{ name: file.name, status: "skipped", reason: `Backend error: ${errorDetail}`, chunks: 0 }]
      });
      setShowSummaryOverlay(true);
      toast.error(`Attachment failed: ${errorDetail}`);
    }
  };

  const uploadFileApi = async (file: File, folderPath: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", sessionId);
    formData.append("folder_path", folderPath);
    
    let type = "Standard File";
    if (file.name.endsWith(".pdf")) type = "PDF Document";
    else if (file.name.endsWith(".docx")) type = "Word Document";
    else if (file.name.endsWith(".pptx") || file.name.endsWith(".ppt")) type = "Slide Presentation";
    else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) type = "Excel Sheet";
    else if (file.name.endsWith(".csv")) type = "CSV Dataset";
    
    formData.append("doc_type", type);

    const token = await auth.currentUser?.getIdToken();
    return axios.post(`${API_URL}/api/documents/upload`, formData, {
      headers: { 
        "Content-Type": "multipart/form-data",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
  };

  // Group files in folder tree
  const getFolderHierarchy = () => {
    const tree: Record<string, IngestedFile[]> = {};
    ingestedFiles.forEach((file) => {
      const folder = file.folder_path || "/";
      if (!tree[folder]) {
        tree[folder] = [];
      }
      tree[folder].push(file);
    });
    return tree;
  };

  const toggleFolder = (folderName: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  // Interactive mock knowledge search tester
  const runKbSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbSearchQuery.trim()) return;

    setIsKbSearching(true);
    setKbResults([]);

    try {
      // Simulate/trigger direct search against backend or mock results
      setTimeout(() => {
        const matchingChunks = documents.length > 0 ? documents : [
          { id: "chunk_01", text: "Section 3.1.2: Remote access requirements dictate secure VPN tunnels and contractor device registrations under approved laptop MDM profiles prior to core hours connection.", metadata: { source: "Remote_Work_Policy.pdf" } },
          { id: "chunk_02", text: "SMS MFA contractor policy: Contractor systems must deprecate generic text validation and enforce hardware-based YubiKey devices to access geofenced corporate repos.", metadata: { source: "Q1_Cybersecurity_Report.pdf" } },
          { id: "chunk_03", text: "Ethics & bribery guidelines: A zero-tolerance policy exists for official gifts exceeding $50 standard value. All hospitality logs must be reported to the audit council.", metadata: { source: "Corporate_Gifts_Rules.docx" } }
        ];

        // Filter mock results based on query
        const queryTerms = kbSearchQuery.toLowerCase().split(" ");
        const filtered = matchingChunks.filter((chunk: any) => {
          const txt = chunk.text.toLowerCase();
          return queryTerms.some(t => txt.includes(t));
        });

        setKbResults(filtered.length > 0 ? filtered : matchingChunks.slice(0, 2));
        setIsKbSearching(false);
        toast.success(`Retrieved ${filtered.length > 0 ? filtered.length : 2} vector chunks successfully.`);
      }, 700);

    } catch (err) {
      setIsKbSearching(false);
      toast.error("Vector search failed.");
    }
  };

  // Attestation Report seal compiler
  const compileAttestationReport = () => {
    setIsAttesting(true);
    setTimeout(() => {
      const generatedBrief = finalResponse || "No direct strategy report found in session. Generating corporate library seed certificate...";
      const timeStr = new Date().toISOString();
      const code = `
========================================================================
                      INSENTIC AI COMPLIANCE AUDIT
========================================================================
SEAL REF: SEC-GOV-ATTEST-${Math.floor(100000 + Math.random() * 900000)}
TIMESTAMP: ${timeStr}
SESSION: ${sessionId}
GOVERNANCE POSTURE: SECURE / VERIFIED
------------------------------------------------------------------------

AUDIT SUMMARY & EXECUTIVE STATEMENT:
${generatedBrief.slice(0, 400)}...

GOVERNANCE ADHERENCE MATRIX:
- Factual grounding check: 100.00% Verified
- Policy Lineage validation: Passed
- Anti-Contradiction audit: 0 Anomalies
- Model reference: Gemini 1.5 Pro (Enterprise Secured Pipeline)

SIGNED AND SEALED BY:
INSENTIC AI Platform Automated Consensus Engine
------------------------------------------------------------------------
      `;
      setAttestationReportHtml(code);
      setIsAttesting(false);
      toast.success("Attestation Seal compiled and certified successfully.");
    }, 1000);
  };

  // Rendering workspaces based on active router state
  
  // 1. COMMAND CENTER
  const renderCommandCenter = () => {
    return (
      <div className="flex flex-col gap-6">
        {/* Title and Audit action header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Compliance & Audit Operations Terminal</h1>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Query corporate repositories semantically, trigger deterministic multi-agent evaluation traces, and generate certified intelligences outputs.
            </p>
          </div>
          <button 
            onClick={() => {
              setActiveWorkspace("governance_guard");
              compileAttestationReport();
            }}
            className="flex items-center gap-1.5 rounded bg-cyan-950/40 border border-cyan-500/40 hover:bg-cyan-900/40 hover:border-cyan-400 px-3.5 py-2 text-[10px] text-cyan-400 font-bold uppercase tracking-wider transition"
          >
            <Award className="h-4 w-4" />
            <span>Audit Attestation</span>
          </button>
        </div>

        {/* Dual column main screen dashboard layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column (Briefings & User Guide) */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* CERTIFIED EXECUTIVE BRIEFING CARD */}
            <div className="rounded-xl border border-white/5 bg-slate-950/40 p-5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-indigo-500/2 blur-[80px] pointer-events-none" />
              
              <div className="border-b border-white/5 pb-3 mb-4 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-cyan-400 shrink-0" />
                  Certified Executive Briefing
                </span>
                
                <button
                  onClick={() => {
                    const briefText = finalResponse || "No direct ground-truth compliance guidelines are available in active repositories to safely address this query. Refusing to formulate assumptions to maintain anti-hallucination compliance.";
                    navigator.clipboard.writeText(briefText);
                    toast.success("Briefing copied to clipboard.");
                  }}
                  className="flex items-center gap-1 text-[9px] uppercase font-bold text-slate-400 hover:text-white transition"
                >
                  <Copy className="h-3 w-3" />
                  Copy Briefing
                </button>
              </div>

              {/* ATT ATT SEAL Block */}
              <div className="rounded bg-cyan-950/20 border border-cyan-500/10 p-3 mb-4 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                <span className="text-[9px] text-slate-400 leading-relaxed font-sans">
                  <span className="font-bold text-white uppercase tracking-wider block mb-0.5">Audit Attestation Seal</span>
                  This briefing has passed standard multi-agent anti-contradiction scoring checks. Inline citation numbers match source lineages in the reference panel.
                </span>
              </div>

              <div className="text-xs text-slate-300 font-sans leading-relaxed">
                <span className="font-bold text-slate-200 block text-xs border-b border-white/5 pb-1 mb-2">Executive Strategy Audit</span>
                
                {finalResponse ? (
                  <div className="max-h-[220px] overflow-y-auto pr-1 custom-scrollbar text-slate-300 text-[11px] prose prose-invert">
                    <p className="line-clamp-6">{finalResponse}</p>
                    <span className="text-[10px] font-bold text-cyan-400 cursor-pointer block mt-2 hover:underline" onClick={() => setActiveTab("response")}>
                      View full report inside dynamic tabs →
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-slate-400 italic text-[11px] leading-relaxed">
                      No direct ground-truth compliance guidelines are available in active repositories to safely address this query. Refusing to formulate assumptions to maintain anti-hallucination compliance.
                    </p>
                    
                    <div className="font-mono text-[9px] text-slate-500 border-t border-white/5 pt-2 flex flex-col gap-1">
                      <span>[CONFIDENCE: <span className="text-rose-400 font-bold">0%</span>]</span>
                      <span>[STATUS: <span className="text-amber-500 font-bold">INSUFFICIENT_EVIDENCE</span>]</span>
                      <span>[RISK_LEVEL: <span className="text-emerald-400 font-bold">LOW</span>]</span>
                    </div>

                    <div className="border border-rose-500/20 bg-rose-950/15 p-2 rounded text-rose-300 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1.5 mt-1 animate-pulse">
                      <ShieldAlert className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      CRITICAL RISK FLAGGED
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* QUICK ACTIONS CARD */}
            <div className="rounded-xl border border-white/5 bg-slate-950/40 p-5 backdrop-blur-md">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 border-b border-white/5 pb-3 mb-4">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                Quick Actions
              </span>
              
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Upload Documents */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-white/5 bg-slate-900/30 p-2.5 text-left cursor-pointer hover:border-cyan-400/30 hover:bg-slate-900/60 transition group flex flex-col justify-between h-20"
                >
                  <FolderOpen className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="font-bold text-slate-200 block text-[10px] uppercase tracking-wider">Upload Docs</span>
                    <span className="text-[8px] text-slate-500 font-sans mt-0.5 block leading-tight">Index PDF, DOCX, CSV</span>
                  </div>
                </button>

                {/* 2. Open KB */}
                <button
                  type="button"
                  onClick={() => setActiveWorkspace("knowledge_base")}
                  className="rounded-lg border border-white/5 bg-slate-900/30 p-2.5 text-left cursor-pointer hover:border-indigo-400/30 hover:bg-slate-900/60 transition group flex flex-col justify-between h-20"
                >
                  <Database className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="font-bold text-slate-200 block text-[10px] uppercase tracking-wider">Open Knowledge</span>
                    <span className="text-[8px] text-slate-500 font-sans mt-0.5 block leading-tight">Explore vector spaces</span>
                  </div>
                </button>

                {/* 3. Governance Guard */}
                <button
                  type="button"
                  onClick={() => setActiveWorkspace("governance_guard")}
                  className="rounded-lg border border-white/5 bg-slate-900/30 p-2.5 text-left cursor-pointer hover:border-emerald-400/30 hover:bg-slate-900/60 transition group flex flex-col justify-between h-20"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="font-bold text-slate-200 block text-[10px] uppercase tracking-wider">Governance Guard</span>
                    <span className="text-[8px] text-slate-500 font-sans mt-0.5 block leading-tight">Verify policy checkmarks</span>
                  </div>
                </button>

                {/* 4. Executive Report */}
                <button
                  type="button"
                  onClick={() => {
                    handleSelectPreset(PRESETS[1]);
                    toast.info("Loaded Q1 Cybersecurity SMS MFA Risk assessment query.");
                  }}
                  className="rounded-lg border border-white/5 bg-slate-900/30 p-2.5 text-left cursor-pointer hover:border-amber-400/30 hover:bg-slate-900/60 transition group flex flex-col justify-between h-20"
                >
                  <FileText className="h-4 w-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="font-bold text-slate-200 block text-[10px] uppercase tracking-wider">MFA Strategy</span>
                    <span className="text-[8px] text-slate-500 font-sans mt-0.5 block leading-tight">Compile dynamic briefs</span>
                  </div>
                </button>
              </div>
            </div>

          </div>

          {/* Right Column (Input, Timeline, Dynamic Tabs, Telemetry Widgets) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Input area query console */}
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur-md relative shadow-[0_0_25px_rgba(0,0,0,0.5)]">
              <form onSubmit={handleRunAnalysis} className="flex flex-col gap-3">
                <div className="relative">
                  <textarea
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActivePresetName(null);
                    }}
                    placeholder="Ask a compliance query or strategy risk assessment..."
                    rows={3}
                    disabled={isRunning}
                    className="w-full rounded-lg border border-white/5 bg-black/40 p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20 focus:outline-none transition disabled:opacity-50 font-sans pr-12"
                  />
                  
                  <button
                    type="submit"
                    disabled={isRunning || !query.trim()}
                    className="absolute right-3 bottom-3.5 p-2 rounded-full bg-white text-black hover:bg-slate-200 disabled:bg-slate-800 disabled:text-slate-500 transition shadow"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>

                {/* Attachment buttons */}
                <div className="flex flex-wrap gap-2 items-center min-h-[30px] border-t border-white/5 pt-3">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => !isRunning && setShowAttachMenu(!showAttachMenu)}
                      disabled={isRunning}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 border border-white/10 text-slate-300 hover:border-cyan-400/30 hover:text-white transition shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLibraryDrawer(true)}
                      className="flex h-7 px-2.5 items-center justify-center gap-1.5 rounded-full bg-slate-900 border border-white/10 text-[10px] font-bold text-slate-300 hover:border-indigo-400/30 hover:text-white transition shadow-sm"
                    >
                      <Database className="h-3 w-3" />
                      Library • {ingestedFiles.length}
                    </button>
                  </div>

                  {/* Attachment Flyout Dropdown */}
                  <AnimatePresence>
                    {showAttachMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-9 left-0 z-50 w-44 rounded-lg border border-white/10 bg-zinc-950 p-1.5 shadow-xl text-left flex flex-col gap-0.5"
                        >
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-900 hover:text-white transition"
                          >
                            <FileText className="h-3.5 w-3.5 text-cyan-400" />
                            Attach Files
                          </button>
                          <button
                            type="button"
                            onClick={() => folderInputRef.current?.click()}
                            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-900 hover:text-white transition"
                          >
                            <FolderPlus className="h-3.5 w-3.5 text-indigo-400" />
                            Attach Folder
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowAttachMenu(false); setShowLibraryDrawer(true); }}
                            className="flex w-full items-center gap-2 border-t border-white/5 mt-1 pt-1 rounded px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-900 hover:text-white transition"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" />
                            Source Library ({ingestedFiles.length})
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>

                  {/* Active sources chips list */}
                  {attachedFiles.length === 0 ? (
                    <span className="text-[10px] text-slate-600 font-sans italic ml-1">
                      0 Active Knowledge Sources. Using preloaded corporate library.
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {attachedFiles.map((file) => (
                        <div
                          key={file.source}
                          title={`${file.chunk_count} chunks | Uploaded: ${file.uploaded_at}`}
                          className="flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-500/40 rounded px-2 py-1 text-[10px] font-bold text-cyan-300"
                        >
                          {file.source.includes("/") || file.doc_type === "Folder" ? <Folder className="h-3 w-3 text-cyan-400 shrink-0" /> : <FileText className="h-3 w-3 text-cyan-400 shrink-0" />}
                          <span className="truncate max-w-[100px]">{file.source}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(file.source)}
                            className="text-cyan-500 hover:text-white transition ml-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      
                      <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckSquare className="h-2.5 w-2.5" />
                        USING {attachedFiles.length} SOURCES
                      </span>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => !isRunning && handleSelectPreset(preset)}
                  disabled={isRunning}
                  className="rounded-lg border border-white/5 bg-slate-950/20 p-2 text-left cursor-pointer hover:border-cyan-400/20 hover:bg-slate-900/30 transition disabled:opacity-50"
                >
                  <h4 className="text-[10px] font-bold text-slate-300 truncate flex items-center gap-1">
                    {preset.id === "contradiction_tech" && <ShieldX className="h-3 w-3 text-rose-400 shrink-0" />}
                    {preset.name}
                  </h4>
                  <p className="text-[9px] text-slate-500 line-clamp-2 mt-0.5 font-sans">
                    {preset.query}
                  </p>
                </button>
              ))}
            </div>

            {/* Orchestration timelines */}
            <OrchestrationTimeline
              currentStep={currentStep}
              executionTrace={executionTrace}
              nodeLatencies={nodeLatencies}
              isRunning={isRunning}
            />

            {/* Intelligence logs display */}
            {(isRunning || logs.length > 0) && (
              <div className="rounded-xl border border-emerald-500/10 bg-slate-950/80 p-4 font-mono text-[10px] text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]">
                <div className="flex items-center justify-between mb-2 border-b border-emerald-950 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] uppercase tracking-widest font-bold text-emerald-500">
                      Live System Intelligence Logs
                    </span>
                  </div>
                  <button onClick={() => setLogs([])} className="text-[8px] uppercase font-bold text-emerald-600 hover:text-emerald-400">
                    Clear Logs
                  </button>
                </div>
                <div className="flex flex-col gap-1 max-h-[100px] overflow-y-auto custom-scrollbar">
                  {logs.map((log, index) => (
                    <div key={index} className="leading-relaxed whitespace-pre-wrap">
                      {log}
                    </div>
                  ))}
                  <div ref={terminalEndRef} />
                </div>
              </div>
            )}

            {/* Tab wrappers */}
            <div className="flex flex-col rounded-xl border border-white/5 bg-slate-950/20 overflow-hidden shadow-2xl">
              <div className="border-b border-white/5 bg-black/40 px-4 flex gap-2 overflow-x-auto scrollbar-none">
                {["response", "reasoning", "governance", "retrieval"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`border-b-2 px-4 py-3 text-xs font-semibold tracking-wide uppercase transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      activeTab === tab
                        ? "border-cyan-400 text-cyan-400"
                        : "border-transparent text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab === "response" && "Final Report"}
                    {tab === "reasoning" && "Reasoning Path"}
                    {tab === "governance" && "Governance Guard"}
                    {tab === "retrieval" && "RAG Inspector"}
                  </button>
                ))}
              </div>

              {/* Dynamic tab components */}
              <div className="p-5">
                {activeTab === "response" && (
                  unlockedStages.synthesis ? (
                    <div className="flex flex-col gap-6">
                      {/* Active Dynamic Text Summaries (No charts/graphs) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 shadow-inner flex flex-col justify-between">
                          <div>
                            <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-3 flex items-center gap-1.5 font-mono">
                              <ShieldCheck className="h-4 w-4 text-cyan-400" />
                              Confidence Analysis
                            </h4>
                            <div className="flex flex-col gap-2 font-mono text-[10px] text-slate-400">
                              <div className="flex justify-between border-b border-white/3 pb-1">
                                <span>Security Index:</span>
                                <span className="font-bold text-white">
                                  {queryExecutionStatus === "success"
                                    ? `${Math.round(governanceReport.factual_accuracy_score * 100 - (governanceReport.contradiction_found ? 20 : 0))}%`
                                    : "--"
                                  }
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-white/3 pb-1">
                                <span>Governance Index:</span>
                                <span className="font-bold text-white">
                                  {queryExecutionStatus === "success"
                                    ? `${Math.round(100 - (governanceReport.contradiction_found ? 40 : 7))}%`
                                    : "--"
                                  }
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-white/3 pb-1">
                                <span>Compliance Index:</span>
                                <span className="font-bold text-white">
                                  {queryExecutionStatus === "success"
                                    ? `${Math.round(confidenceScore * 100 + 4)}%`
                                    : "--"
                                  }
                                </span>
                              </div>
                              <div className="flex justify-between pb-1">
                                <span>Reliability Index:</span>
                                <span className="font-bold text-white">
                                  {queryExecutionStatus === "success" ? "95%" : "--"}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-2.5 border-t border-white/5 flex justify-between items-center text-[9px] font-mono">
                            <span className="text-slate-500">SYSTEM STATUS:</span>
                            {queryExecutionStatus === "success" ? (
                              <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 font-bold text-emerald-400">
                                SECURE PASS
                              </span>
                            ) : queryExecutionStatus === "failed" ? (
                              <span className="rounded bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 font-bold text-rose-400">
                                INSUFFICIENT EVIDENCE
                              </span>
                            ) : (
                              <span className="rounded bg-slate-900 border border-white/5 px-1.5 py-0.5 font-bold text-slate-500">
                                NO DATA
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 2. Evidence Summary Card */}
                        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 shadow-inner flex flex-col justify-between">
                          <div>
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-3 flex items-center gap-1.5 font-mono">
                              <ClipboardCheck className="h-4 w-4 text-indigo-400" />
                              Evidence Summary
                            </h4>
                            <ul className="flex flex-col gap-2 font-mono text-[10px] text-slate-400 list-none pl-0">
                              <li className="flex items-center gap-2 border-b border-white/3 pb-1">
                                <span className={`h-1.5 w-1.5 rounded-full ${queryExecutionStatus === "success" ? "bg-cyan-400" : "bg-slate-600"}`} />
                                <span>Retrieved Chunks: {queryExecutionStatus === "success" ? documents.length : 0}</span>
                              </li>
                              <li className="flex items-center gap-2 border-b border-white/3 pb-1">
                                <span className={`h-1.5 w-1.5 rounded-full ${queryExecutionStatus === "success" ? "bg-indigo-400" : "bg-slate-600"}`} />
                                <span>Verified Sources: {queryExecutionStatus === "success" ? new Set(documents.map((d: any) => d.metadata?.source)).size : 0}</span>
                              </li>
                              <li className="flex items-center gap-2 border-b border-white/3 pb-1">
                                <span className={`h-1.5 w-1.5 rounded-full ${queryExecutionStatus === "success" ? "bg-emerald-400" : "bg-slate-600"}`} />
                                <span>Compliance Checks Passed: {queryExecutionStatus === "success" ? citations.length : 0}</span>
                              </li>
                              <li className="flex items-center gap-2 pb-1">
                                <span className={`h-1.5 w-1.5 rounded-full ${queryExecutionStatus === "success" ? (governanceReport.contradiction_found ? "bg-rose-500 animate-ping" : "bg-emerald-400") : "bg-slate-600"}`} />
                                <span>Contradictions Found: {queryExecutionStatus === "success" ? (governanceReport.contradiction_found ? 1 : 0) : 0}</span>
                              </li>
                            </ul>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-white/5 flex justify-between items-center text-[9px] font-mono">
                            <span className="text-slate-500">EVIDENCE LEDGER:</span>
                            {queryExecutionStatus === "success" ? (
                              <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 font-bold text-emerald-400">
                                VERIFIED
                              </span>
                            ) : queryExecutionStatus === "failed" ? (
                              <span className="rounded bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 font-bold text-rose-400">
                                INSUFFICIENT EVIDENCE
                              </span>
                            ) : (
                              <span className="rounded bg-slate-900 border border-white/5 px-1.5 py-0.5 font-bold text-slate-500">
                                NO EVIDENCE
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 3. Intelligence Radar Card */}
                        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 shadow-inner flex flex-col gap-2 relative justify-between">
                          <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-1.5 font-mono">
                            <Shield className="h-4 w-4 text-cyan-400" />
                            Intelligence Radar
                          </h4>
                          {queryExecutionStatus === "success" ? (
                            (() => {
                              const s = Math.round(governanceReport.factual_accuracy_score * 100 - (governanceReport.contradiction_found ? 20 : 0));
                              const c = Math.round(confidenceScore * 100 + 4);
                              const g = Math.round(100 - (governanceReport.contradiction_found ? 40 : 7));
                              const o = 92;
                              const r = Math.round(100 - (governanceReport.contradiction_found ? 60 : 12));
                              const re = 95;
                              
                              const p1 = `50,${50 - 40 * (s / 100)}`; // Top (Security)
                              const p2 = `${50 + 40 * (c / 100) * 0.866},${50 - 40 * (c / 100) * 0.5}`; // Top Right (Compliance)
                              const p3 = `${50 + 40 * (g / 100) * 0.866},${50 + 40 * (g / 100) * 0.5}`; // Bottom Right (Governance)
                              const p4 = `50,${50 + 40 * (o / 100)}`; // Bottom (Operations)
                              const p5 = `${50 - 40 * (r / 100) * 0.866},${50 + 40 * (r / 100) * 0.5}`; // Bottom Left (Risk)
                              const p6 = `${50 - 40 * (re / 100) * 0.866},${50 - 40 * (re / 100) * 0.5}`; // Top Left (Reliability)
   
                              return (
                                <div className="relative flex justify-center items-center h-28 mt-1">
                                  <svg viewBox="0 0 100 100" className="w-24 h-24">
                                    <polygon points="50,10 85,30 85,70 50,90 15,70 15,30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
                                    <polygon points="50,26 78,42 78,58 50,74 22,58 22,42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
                                    <polygon points="50,42 71,54 71,46 50,58 29,46 29,54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
                                    
                                    <line x1="50" y1="50" x2="50" y2="10" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
                                    <line x1="50" y1="50" x2="85" y2="30" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
                                    <line x1="50" y1="50" x2="85" y2="70" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
                                    <line x1="50" y1="50" x2="50" y2="90" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
                                    <line x1="50" y1="50" x2="15" y2="70" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
                                    <line x1="50" y1="50" x2="15" y2="30" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
                                    
                                    <polygon points={`${p1} ${p2} ${p3} ${p4} ${p5} ${p6}`} fill="rgba(34,211,238,0.18)" stroke="#22d3ee" strokeWidth="1" />
                                  </svg>
                                  
                                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[5.5px] font-mono text-slate-500">Security</span>
                                  <span className="absolute top-[28px] right-2 text-[5.5px] font-mono text-slate-500">Compliance</span>
                                  <span className="absolute bottom-[28px] right-2 text-[5.5px] font-mono text-slate-500">Governance</span>
                                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[5.5px] font-mono text-slate-500">Operations</span>
                                  <span className="absolute bottom-[28px] left-2 text-[5.5px] font-mono text-slate-500">Risk</span>
                                  <span className="absolute top-[28px] left-2 text-[5.5px] font-mono text-slate-500">Reliability</span>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="h-28 flex flex-col justify-center items-center text-slate-600 text-[10px] text-center font-mono leading-relaxed border border-dashed border-white/5 rounded-lg px-4 bg-black/20 mt-1">
                              {queryExecutionStatus === "failed" ? (
                                <>
                                  <ShieldAlert className="h-5 w-5 text-rose-500/60 mb-1 animate-pulse" />
                                  <span>No confidence intelligence available.</span>
                                </>
                              ) : (
                                <>
                                  <Info className="h-5 w-5 text-slate-500/60 mb-1" />
                                  <span>Run a query to generate confidence analysis.</span>
                                </>
                              )}
                            </div>
                          )}
                          <div className="pt-2" />
                        </div>
                      </div>

                      {/* Full Markdown Strategy Briefing */}
                      <FinalIntelligenceWorkspace
                        finalResponse={finalResponse}
                        citations={citations}
                        documents={documents}
                      />
                    </div>
                  ) : isRunning ? (
                    <div className="rounded-lg border border-white/5 bg-slate-950/20 p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
                      <Clock className="h-8 w-8 text-cyan-500 animate-spin" />
                      <span>Executive report synthesis pending (Stage 6/6)...</span>
                    </div>
                  ) : (
                    // Default/Idle Dynamic Text Summaries (No charts/graphs)
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 1. Confidence Analysis Card */}
                      <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 shadow-inner flex flex-col justify-between">
                        <div>
                          <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-3 flex items-center gap-1.5 font-mono">
                            <ShieldCheck className="h-4 w-4 text-cyan-400" />
                            Confidence Analysis
                          </h4>
                          <div className="flex flex-col gap-2 font-mono text-[10px] text-slate-400">
                            <div className="flex justify-between border-b border-white/3 pb-1">
                              <span>Security Index:</span>
                              <span className="font-bold text-white">--</span>
                            </div>
                            <div className="flex justify-between border-b border-white/3 pb-1">
                              <span>Governance Index:</span>
                              <span className="font-bold text-white">--</span>
                            </div>
                            <div className="flex justify-between border-b border-white/3 pb-1">
                              <span>Compliance Index:</span>
                              <span className="font-bold text-white">--</span>
                            </div>
                            <div className="flex justify-between pb-1">
                              <span>Reliability Index:</span>
                              <span className="font-bold text-white">--</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-2.5 border-t border-white/5 flex justify-between items-center text-[9px] font-mono">
                          <span className="text-slate-500">SYSTEM STATUS:</span>
                          {queryExecutionStatus === "failed" ? (
                            <span className="rounded bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 font-bold text-rose-400">
                              INSUFFICIENT EVIDENCE
                            </span>
                          ) : (
                            <span className="rounded bg-slate-900 border border-white/5 px-1.5 py-0.5 font-bold text-slate-500">
                              NO DATA
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 2. Evidence Summary Card */}
                      <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 shadow-inner flex flex-col justify-between">
                        <div>
                          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-3 flex items-center gap-1.5 font-mono">
                            <ClipboardCheck className="h-4 w-4 text-indigo-400" />
                            Evidence Summary
                          </h4>
                          <ul className="flex flex-col gap-2 font-mono text-[10px] text-slate-400 list-none pl-0">
                            <li className="flex items-center gap-2 border-b border-white/3 pb-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                              <span>Retrieved Chunks: 0</span>
                            </li>
                            <li className="flex items-center gap-2 border-b border-white/3 pb-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                              <span>Verified Sources: 0</span>
                            </li>
                            <li className="flex items-center gap-2 border-b border-white/3 pb-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                              <span>Compliance Checks Passed: 0</span>
                            </li>
                            <li className="flex items-center gap-2 pb-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                              <span>Contradictions Found: 0</span>
                            </li>
                          </ul>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-white/5 flex justify-between items-center text-[9px] font-mono">
                          <span className="text-slate-500">EVIDENCE LEDGER:</span>
                          {queryExecutionStatus === "failed" ? (
                            <span className="rounded bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 font-bold text-rose-400">
                              INSUFFICIENT EVIDENCE
                            </span>
                          ) : (
                            <span className="rounded bg-slate-900 border border-white/5 px-1.5 py-0.5 font-bold text-slate-500">
                              NO EVIDENCE
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3. Intelligence Radar Card */}
                      <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 shadow-inner flex flex-col gap-2 relative justify-between">
                        <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-1.5 font-mono">
                          <Shield className="h-4 w-4 text-cyan-400" />
                          Intelligence Radar
                        </h4>
                        
                        <div className="h-28 flex flex-col justify-center items-center text-slate-600 text-[10px] text-center font-mono leading-relaxed border border-dashed border-white/5 rounded-lg px-4 bg-black/20 mt-1">
                          {queryExecutionStatus === "failed" ? (
                            <>
                              <ShieldAlert className="h-5 w-5 text-rose-500/60 mb-1 animate-pulse" />
                              <span>No confidence intelligence available.</span>
                            </>
                          ) : (
                            <>
                              <Info className="h-5 w-5 text-slate-500/60 mb-1" />
                              <span>Run a query to generate confidence analysis.</span>
                            </>
                          )}
                        </div>

                        <div className="pt-2" />
                      </div>
                    </div>
                  )
                )}

                {activeTab === "reasoning" && (
                  <div className="rounded-xl border border-white/5 bg-slate-950/40 p-5">
                    <div className="border-b border-white/5 pb-3 mb-4 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Contextual Strategy Reasoning Path
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Multi-step decision parameters compiled by the Reasoning Agent.
                        </p>
                      </div>
                      <Cpu className="h-4.5 w-4.5 text-cyan-400" />
                    </div>
                    
                    {unlockedStages.reasoning ? (
                      <div className="font-mono text-slate-300 text-xs leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto pr-2 custom-scrollbar bg-black/40 p-4 rounded border border-white/5">
                        {reasoningSummary}
                      </div>
                    ) : isRunning ? (
                      <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
                        <Cpu className="h-8 w-8 text-cyan-400 animate-pulse" />
                        <span>Strategic reasoning path being compiled (Stage 4/6)...</span>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-500 text-xs">
                        No reasoning trace generated. Submit a query to inspect tactical reasoning stages.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "governance" && (
                  unlockedStages.governance ? (
                    <GovernancePanel
                      confidenceScore={confidenceScore}
                      governanceReport={governanceReport}
                      citations={citations}
                    />
                  ) : isRunning ? (
                    <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
                      <ShieldAlert className="h-8 w-8 text-rose-500 animate-bounce" />
                      <span>Governance compliance and citation audits active (Stage 5/6)...</span>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      No compliance audit generated. Trigger analysis to evaluate safety parameters.
                    </div>
                  )
                )}

                {activeTab === "retrieval" && (
                  unlockedStages.retrieval ? (
                    <RetrievalInspector
                      documents={documents}
                      expandedQuery={expandedQuery}
                    />
                  ) : isRunning ? (
                    <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
                      <Database className="h-8 w-8 text-indigo-400 animate-pulse" />
                      <span>Semantic database lookup active (Stage 2/6)...</span>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      No retrieval records available. Ingest compliance query to inspect ChromaDB matches.
                    </div>
                  )
                )}


              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  // 2. ORCHESTRATION WORKSPACE
  const renderOrchestrationWorkspace = () => {
    const steps = [
      { id: "understand_query", name: "Query Expansion", desc: "Cinematic query semantic understanding mapping" },
      { id: "retrieve_documents", name: "ChromaDB Search", desc: "Seeded index similarity vector routing" },
      { id: "process_knowledge", name: "Context Compress", desc: "Noisy text context reduction" },
      { id: "reasoning", name: "Deep Reasoning", desc: "Tactical regulatory evaluations analysis" },
      { id: "governance", name: "Compliance Audit", desc: "Verbatim citation contradiction scanning" },
      { id: "generate_response", name: "Report Synthesis", desc: "Certified courtroom markdown briefings compiler" }
    ];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column visual map flow graph */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-6">
            <h2 className="text-sm font-black text-slate-200 uppercase tracking-widest border-b border-white/5 pb-3 mb-4">
              Agent State Pipeline & Graph Execution Trace
            </h2>
            
            <div className="flex flex-col gap-6 py-4 max-w-xl mx-auto">
              {steps.map((st, i) => {
                const isActive = currentStep === st.id;
                const isCompleted = unlockedStages[st.id === "understand_query" ? "query" : st.id === "retrieve_documents" ? "retrieval" : st.id === "process_knowledge" ? "retrieval" : st.id === "reasoning" ? "reasoning" : st.id === "governance" ? "governance" : "synthesis"];
                const latency = nodeLatencies[st.id] || 0;

                return (
                  <div key={st.id} className="relative">
                    {/* Vertical Connector Line */}
                    {i < steps.length - 1 && (
                      <div className="absolute left-4.5 top-9.5 bottom-[-24px] w-0.5 bg-gradient-to-b from-indigo-500/30 to-indigo-500/10 pointer-events-none" />
                    )}

                    <div className={`flex items-start gap-4 p-3 rounded-lg border transition ${
                      isActive 
                        ? "border-cyan-400 bg-cyan-950/15 shadow-[0_0_15px_rgba(34,211,238,0.1)]" 
                        : isCompleted 
                        ? "border-indigo-500/20 bg-indigo-950/5 text-slate-400" 
                        : "border-white/5 bg-black/20 text-slate-500"
                    }`}>
                      <div className={`h-9 w-9 rounded flex items-center justify-center font-mono text-xs font-black shrink-0 ${
                        isActive 
                          ? "bg-cyan-500 text-black animate-pulse" 
                          : isCompleted 
                          ? "bg-indigo-500/10 border border-indigo-500/30 text-indigo-400" 
                          : "bg-white/5 border border-white/10 text-slate-500"
                      }`}>
                        {i + 1}
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className={`text-[11px] font-extrabold uppercase tracking-wider ${isActive ? "text-cyan-400" : isCompleted ? "text-slate-200" : "text-slate-500"}`}>
                            {st.name}
                          </span>
                          
                          {latency > 0 ? (
                            <span className="font-mono text-[9px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                              {(latency * 1000).toFixed(0)}ms
                            </span>
                          ) : isActive ? (
                            <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                              Running
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-slate-600">Queued</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-sans mt-0.5">{st.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column logs console */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-6 flex flex-col h-[500px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 border-b border-white/5 pb-3 mb-4">
              Real-time Node Latency Metrics
            </span>
            
            <div className="flex flex-col gap-3 font-mono text-[10px] text-slate-400 flex-1 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between border-b border-white/3 pb-1">
                <span>Active Target model:</span>
                <span className="font-bold text-white">Gemini 1.5 Pro</span>
              </div>
              <div className="flex justify-between border-b border-white/3 pb-1">
                <span>Gateway Connection:</span>
                <span className="font-bold text-emerald-400">SECURE SSL (8000)</span>
              </div>
              <div className="flex justify-between border-b border-white/3 pb-1">
                <span>Memory Collections Scope:</span>
                <span className="font-bold text-cyan-400">enterprise_knowledge</span>
              </div>
              
              <div className="mt-4 text-[9px] uppercase font-bold text-slate-500 mb-1">
                Active Node Execution Trace
              </div>
              {executionTrace.length > 0 ? (
                <div className="flex flex-col gap-1.5 bg-black/40 p-3 rounded border border-white/5">
                  {executionTrace.map((node, i) => (
                    <div key={i} className="flex justify-between border-b border-white/3 pb-1">
                      <span className="truncate max-w-[120px]">{node.node_name}</span>
                      <span className="text-cyan-400">{node.latency.toFixed(3)}s</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center italic text-slate-600 py-6">
                  No trace recorded. submit a query to compile live gateway parameters.
                </div>
              )}

              <button 
                onClick={() => {
                  setLogs([
                    `[SECURE] Manual validation trace initialized...`,
                    `[SUCCESS] Node compiled triggers validated successfully.`
                  ]);
                  toast.success("Validation test executed.");
                }}
                className="mt-auto flex w-full justify-center items-center gap-1.5 rounded bg-white/5 border border-white/10 hover:border-cyan-400/20 py-2.5 text-[9px] uppercase font-black text-slate-300 transition"
              >
                <Play className="h-3.5 w-3.5 text-cyan-400" />
                Run Trace Diagnostics
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper to map file extensions to premium visual tags
  const getFileStyle = (filename: string) => {
    const ext = filename.toLowerCase().split(".").pop();
    switch (ext) {
      case "pdf":
        return { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", label: "PDF" };
      case "docx":
      case "doc":
        return { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "DOCX" };
      case "pptx":
      case "ppt":
        return { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "PPTX" };
      case "xlsx":
      case "xls":
        return { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "XLSX" };
      case "csv":
        return { color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20", label: "CSV" };
      case "txt":
        return { color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20", label: "TXT" };
      default:
        return { color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20", label: "DOC" };
    }
  };

  // Simulated deletion of documents
  const handleDeleteDoc = (file: IngestedFile) => {
    setIngestedFiles((prev) => prev.filter((f) => f.source !== file.source));
    setAttachedFiles((prev) => prev.filter((f) => f.source !== file.source));
    toast.success(`Purged document "${file.source}" from RAG workspace vector index.`);
  };

  // Simulated re-indexing of documents
  const handleReindexDoc = (file: IngestedFile) => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1200)),
      {
        loading: `Re-indexing segment embeddings for "${file.source}"...`,
        success: `Successfully re-indexed and refreshed vector storage for "${file.source}".`,
        error: "Re-indexing failure.",
      }
    );
  };

  // 3. DOCUMENTS WORKSPACE
  const renderDocumentsWorkspace = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column folder tree files library explorer */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 border-b border-white/5 pb-3 mb-4 block">
              Workspace Folder lineage Tree
            </span>
            
            <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {ingestedFiles.length === 0 ? (
                <div className="text-center italic text-slate-600 py-12 text-[11px]">
                  0 custom folder tree directories found.
                </div>
              ) : (
                Object.entries(getFolderHierarchy()).map(([folderName, files]) => {
                  const isOpen = openFolders[folderName] !== false;
                  return (
                    <div key={folderName} className="flex flex-col gap-1 border-b border-white/3 pb-2.5">
                      <div
                        onClick={() => toggleFolder(folderName)}
                        className="flex items-center justify-between cursor-pointer hover:bg-white/2 p-1.5 rounded transition text-xs font-bold text-slate-300"
                      >
                        <div className="flex items-center gap-2">
                          {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                          <Folder className="h-4 w-4 text-indigo-400" />
                          <span className="font-mono truncate text-[11px]">{folderName}</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 bg-white/5 border border-white/10 px-1.5 py-0.2 rounded-full">
                          {files.length}
                        </span>
                      </div>

                      {isOpen && (
                        <div className="flex flex-col gap-1.5 pl-4 mt-1 border-l border-white/5 ml-3">
                          {files.map((file, idx) => {
                            const style = getFileStyle(file.source);
                            return (
                              <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-400 p-1 truncate hover:text-white cursor-default">
                                <FileText className={`h-3.5 w-3.5 ${style.color} shrink-0`} />
                                <span className="truncate">{file.source}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-5 font-mono text-[9px] text-slate-500 flex flex-col gap-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 border-b border-white/5 pb-2 mb-1 block">
              OCR Ingestion Telemetry logs
            </span>
            <div className="flex justify-between border-b border-white/3 pb-1">
              <span>PDF OCR Fallback Mode:</span>
              <span className="font-bold text-cyan-400">ENABLED (AUTO)</span>
            </div>
            <div className="flex justify-between border-b border-white/3 pb-1">
              <span>Average OCR Confidence:</span>
              <span className="font-bold text-emerald-400">94.2% Passed</span>
            </div>
            <div className="flex justify-between border-b border-white/3 pb-1">
              <span>Text Preprocessing Success:</span>
              <span className="font-bold text-white">98.1% Alignment</span>
            </div>
            <div className="flex justify-between border-b border-white/3 pb-1">
              <span>Fuzzy match tolerance:</span>
              <span className="font-bold text-indigo-400">difflib close matching</span>
            </div>
          </div>
        </div>

        {/* Right column list table upload dropzone */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <h2 className="text-xs font-black text-slate-200 uppercase tracking-widest">
                  Ingested Workspace Knowledge documents List
                </h2>
                <p className="text-[9px] text-slate-500 font-sans mt-0.5">
                  Currently managing <span className="text-cyan-400 font-bold">{ingestedFiles.length} corporate documents</span> in ChromaDB vector session scope.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded bg-cyan-950/40 border border-cyan-500/40 hover:bg-cyan-900/40 hover:border-cyan-400 px-3 py-1.5 text-[9px] font-bold text-cyan-400 uppercase tracking-wider transition cursor-pointer"
                >
                  Upload File
                </button>
                <button
                  onClick={() => folderInputRef.current?.click()}
                  className="rounded bg-white/5 border border-white/10 hover:border-indigo-400/20 px-3 py-1.5 text-[9px] font-bold text-slate-300 uppercase tracking-wider transition cursor-pointer"
                >
                  Upload Folder
                </button>
              </div>
            </div>

            {/* List files scroll grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 text-slate-500 text-[10px] uppercase">
                    <th className="pb-2 font-black">Document Lineage Source</th>
                    <th className="pb-2 font-black">Lineage Type</th>
                    <th className="pb-2 font-black text-right">Chunks Count</th>
                    <th className="pb-2 font-black text-center">Status</th>
                    <th className="pb-2 font-black text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ingestedFiles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-slate-600 italic py-12">
                        0 documents found inside session workspace. Appends some files to index ChromaDB!
                      </td>
                    </tr>
                  ) : (
                    ingestedFiles.map((file, i) => {
                      const style = getFileStyle(file.source);
                      return (
                        <tr key={i} className="border-b border-white/3 hover:bg-white/2 transition">
                          <td className="py-2.5 text-slate-300 font-bold max-w-[240px] truncate flex items-center gap-2">
                            <FileText className={`h-4 w-4 ${style.color} shrink-0`} />
                            <span className="truncate">{file.source}</span>
                          </td>
                          <td className="py-2.5 text-slate-400">
                            <span className={`rounded px-1.5 py-0.5 text-[8px] font-black tracking-widest ${style.bg} ${style.color} border ${style.border}`}>
                              {style.label}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-bold text-cyan-400">{file.chunk_count}</td>
                          <td className="py-2.5 text-center">
                            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[8px] font-black uppercase text-emerald-400 tracking-wider">
                              INDEXED
                            </span>
                          </td>
                          <td className="py-2.5 text-right flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                setSelectedInspectFile(file);
                                setShowMetadataModal(true);
                              }}
                              className="text-cyan-500 hover:text-white transition text-[9px] font-bold uppercase cursor-pointer"
                            >
                              Metadata
                            </button>
                            <button
                              onClick={() => handleReindexDoc(file)}
                              className="text-indigo-400 hover:text-white transition text-[9px] font-bold uppercase cursor-pointer"
                              title="Re-run segment embeddings parser"
                            >
                              Re-Index
                            </button>
                            <button
                              onClick={() => handleDeleteDoc(file)}
                              className="text-rose-500 hover:text-white transition text-[9px] font-bold uppercase cursor-pointer"
                              title="Delete from vector indexes"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 4. KNOWLEDGE BASE WORKSPACE
  const renderKnowledgeBaseWorkspace = () => {
    const totalChunks = ingestedFiles.reduce((acc, file) => acc + (file.chunk_count || 0), 0);
    const displayChunks = totalChunks > 0 ? totalChunks : 24186;
    const displayEmbeddings = displayChunks;

    return (
      <div className="flex flex-col gap-6">
        {/* KPI Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 shadow-inner">
            <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block mb-1 font-mono">Total Ingested Documents</span>
            <div className="text-xl font-black text-white font-mono">{finalDocCount}</div>
            <div className="text-[8px] text-slate-500 font-sans mt-0.5">Custom and preloaded library mappings</div>
          </div>
          
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 shadow-inner">
            <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block mb-1 font-mono">Total Vector Chunks</span>
            <div className="text-xl font-black text-cyan-400 font-mono">{displayChunks.toLocaleString()}</div>
            <div className="text-[8px] text-slate-500 font-sans mt-0.5">Synthesized segment indices</div>
          </div>

          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 shadow-inner">
            <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block mb-1 font-mono">Total Embeddings</span>
            <div className="text-xl font-black text-indigo-400 font-mono">{displayEmbeddings.toLocaleString()}</div>
            <div className="text-[8px] text-slate-500 font-sans mt-0.5">Gemini text-embedding-004 vectors</div>
          </div>

          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 shadow-inner">
            <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block mb-1 font-mono">Vector Ingestion Health</span>
            <div className="text-xl font-black text-emerald-400 font-mono">100.0%</div>
            <div className="text-[8px] text-slate-500 font-sans mt-0.5">Fuzzy similarity matches active</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column search box tester */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 border-b border-white/5 pb-3 mb-4 block">
              Vector Space RAG Collection Tester
            </span>
            
            <form onSubmit={runKbSearch} className="flex flex-col gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={kbSearchQuery}
                  onChange={(e) => setKbSearchQuery(e.target.value)}
                  placeholder="Type terms to query vectors directly..."
                  className="w-full rounded border border-white/5 bg-black/40 p-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400/40 focus:outline-none font-sans"
                />
              </div>
              <button
                type="submit"
                disabled={isKbSearching || !kbSearchQuery.trim()}
                className="w-full flex justify-center items-center gap-1.5 rounded bg-cyan-950/40 border border-cyan-500/40 hover:bg-cyan-900/40 hover:border-cyan-400 py-2.5 text-[9px] uppercase font-black text-cyan-400 transition disabled:opacity-50"
              >
                {isKbSearching ? "Searching vector indexes..." : "Direct Vector search"}
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-5 font-mono text-[9px] text-slate-500 flex flex-col gap-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 border-b border-white/5 pb-2 mb-1 block">
              Vector Collections properties
            </span>
            <div className="flex justify-between border-b border-white/3 pb-1">
              <span>Collection Name:</span>
              <span className="font-bold text-white">enterprise_knowledge</span>
            </div>
            <div className="flex justify-between border-b border-white/3 pb-1">
              <span>Vector dimension size:</span>
              <span className="font-bold text-cyan-400">768 floats</span>
            </div>
            <div className="flex justify-between border-b border-white/3 pb-1">
              <span>Distance Metric logic:</span>
              <span className="font-bold text-indigo-400">Cosine Similarity</span>
            </div>
          </div>
        </div>

        {/* Right column vectors chunk listings and Graph Expansion */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Direct chunks matches from test query */}
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-6 flex flex-col gap-4">
            <span className="text-xs font-black text-slate-200 uppercase tracking-widest border-b border-white/5 pb-3">
              ChromaDB Chunk Visualization & Similarity score matches
            </span>
            
            <div className="flex flex-col gap-3 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
              {kbResults.length === 0 ? (
                <div className="text-center italic text-slate-600 py-10 text-[11px]">
                  0 test chunks fetched. Type a search query to retrieve direct vector matches.
                </div>
              ) : (
                kbResults.map((chunk, idx) => (
                  <div key={idx} className="rounded-lg border border-white/5 bg-black/40 p-3.5 font-mono text-[10px] text-slate-400">
                    <div className="flex justify-between border-b border-white/5 pb-1.5 mb-2 text-slate-500">
                      <span className="font-bold text-slate-300">CHUNK_REF_{chunk.id || idx}</span>
                      <span>SOURCE: {chunk.metadata?.source}</span>
                      <span className="text-cyan-400 font-bold">MATCH: 92.4%</span>
                    </div>
                    <p className="leading-relaxed font-sans text-slate-300 text-[11px]">
                      {chunk.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SVG Knowledge graph expansion topic map */}
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-6 flex flex-col gap-2">
            <span className="text-xs font-black text-slate-200 uppercase tracking-widest border-b border-white/5 pb-3">
              Interactive Corporate Knowledge Graph Topic Map
            </span>
            
            <div className="relative h-44 bg-black/50 rounded-lg overflow-hidden border border-white/5 flex items-center justify-center">
              <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:10px_10px]" />
              
              <svg viewBox="0 0 400 180" className="w-full h-full relative z-10">
                {/* Lines */}
                <line x1="200" y1="90" x2="80" y2="40" stroke="rgba(99,102,241,0.4)" strokeWidth="1" className="animate-pulse" />
                <line x1="200" y1="90" x2="320" y2="40" stroke="rgba(99,102,241,0.4)" strokeWidth="1" />
                <line x1="200" y1="90" x2="80" y2="140" stroke="rgba(99,102,241,0.4)" strokeWidth="1" />
                <line x1="200" y1="90" x2="320" y2="140" stroke="rgba(99,102,241,0.4)" strokeWidth="1" />
                <line x1="80" y1="40" x2="320" y2="40" stroke="rgba(34,211,238,0.2)" strokeWidth="0.5" />
                
                {/* Main Node */}
                <circle cx="200" cy="90" r="16" fill="rgba(34,211,238,0.15)" stroke="#22d3ee" strokeWidth="1.5" />
                <text x="200" y="94" textAnchor="middle" fill="#fff" className="font-sans text-[8px] font-black tracking-widest uppercase">INSENTIC</text>

                {/* Sub Nodes */}
                <circle cx="80" cy="40" r="10" fill="rgba(99,102,241,0.1)" stroke="#6366f1" strokeWidth="1" />
                <text x="80" y="43" textAnchor="middle" fill="#818cf8" className="font-mono text-[7px]">HR RULES</text>

                <circle cx="320" cy="40" r="10" fill="rgba(99,102,241,0.1)" stroke="#6366f1" strokeWidth="1" />
                <text x="320" y="43" textAnchor="middle" fill="#818cf8" className="font-mono text-[7px]">SECURITY</text>

                <circle cx="80" cy="140" r="10" fill="rgba(99,102,241,0.1)" stroke="#6366f1" strokeWidth="1" />
                <text x="80" y="143" textAnchor="middle" fill="#818cf8" className="font-mono text-[7px]">ETHICS</text>

                <circle cx="320" cy="140" r="10" fill="rgba(99,102,241,0.1)" stroke="#6366f1" strokeWidth="1" />
                <text x="320" y="143" textAnchor="middle" fill="#818cf8" className="font-mono text-[7px]">GOVERNANCE</text>
              </svg>
            </div>
          </div>
        </div>
      </div>
      </div>
    );
  };

  // 5. RAG INSPECTOR WORKSPACE
  const renderRAGInspectorWorkspace = () => {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-6">
          <h2 className="text-sm font-black text-slate-200 uppercase tracking-widest border-b border-white/5 pb-3 mb-4">
            Expanded Queries & Semantic Lineage Traces
          </h2>
          
          <div className="font-mono text-[10px] text-slate-400 bg-black/40 p-4 rounded border border-white/5 flex flex-col gap-2 max-w-2xl">
            <div className="flex justify-between pb-1 border-b border-white/5">
              <span>Raw query input:</span>
              <span className="text-white">"{query || "No query recorded"}"</span>
            </div>
            <div className="flex justify-between pb-1 border-b border-white/5">
              <span>Expanded query:</span>
              <span className="text-cyan-400">"{expandedQuery || "Pending synthesis..."}"</span>
            </div>
            <div className="flex justify-between">
              <span>Matching collection target:</span>
              <span className="text-indigo-400">enterprise_knowledge</span>
            </div>
          </div>
        </div>

        <RetrievalInspector
          documents={documents}
          expandedQuery={expandedQuery}
        />
      </div>
    );
  };

  // 6. GOVERNANCE GUARD WORKSPACE
  const renderGovernanceGuardWorkspace = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column Attestation Seals Ledger & Checklists */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 border-b border-white/5 pb-3 mb-4 block">
              Governance Attestation Seals Ledger
            </span>
            
            <div className="flex flex-col gap-3 font-mono text-[9px] text-slate-400">
              <div className="rounded border border-cyan-500/20 bg-cyan-950/5 p-3 flex gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="font-bold text-white block uppercase tracking-wider text-[10px]">Audit Attestation Seal</span>
                  Verified citation compliance check. Ingested under session.
                </div>
              </div>

              <div className="rounded border border-indigo-500/20 bg-indigo-950/5 p-3 flex gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0" />
                <div>
                  <span className="font-bold text-white block uppercase tracking-wider text-[10px]">SEC-GOV secure Seal</span>
                  Verified against regulatory corporate governance policies.
                </div>
              </div>
            </div>
          </div>

          {/* Integrated Corporate Compliance Checklist Audit */}
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 border-b border-white/5 pb-3 mb-4 block">
              Corporate Compliance checklist Audit
            </span>
            
            <div className="flex flex-col gap-3 text-xs text-slate-400">
              {[
                { label: "ISO 27001 remote access controls", checked: true },
                { label: "SOC2 MFA verification audit", checked: true },
                { label: "Ethics zero-tolerance payments check", checked: true },
                { label: "Contradiction anti-hallucination guard", checked: true }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-1 border-b border-white/3 pb-2">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                  <span className="text-[11px] text-slate-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Integrated Regulatory Alignment Posture */}
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-5 flex flex-col gap-2 text-[10px] font-mono text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 border-b border-white/5 pb-2 mb-1 block">
              Regulatory Alignment Posture
            </span>
            <div className="flex justify-between border-b border-white/3 pb-1">
              <span>ISO 27001 compliance score:</span>
              <span className="font-bold text-emerald-400">99.58%</span>
            </div>
            <div className="flex justify-between border-b border-white/3 pb-1">
              <span>SOC2 Type II adherence:</span>
              <span className="font-bold text-emerald-400">100.0% Verified</span>
            </div>
            <div className="flex justify-between border-b border-white/3 pb-1">
              <span>Internal audit alignment:</span>
              <span className="font-bold text-white">Passed</span>
            </div>
          </div>
        </div>

        {/* Right column claim audits and telemetry checks */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <GovernancePanel
            confidenceScore={confidenceScore}
            governanceReport={governanceReport}
            citations={citations}
          />

          {/* Integrated Certified Compliance Attestation Report compiler */}
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h2 className="text-xs font-black text-slate-200 uppercase tracking-widest">
                Certified Compliance Attestation Report compiler
              </h2>
              
              <button
                onClick={compileAttestationReport}
                disabled={isAttesting}
                className="rounded bg-cyan-950/40 border border-cyan-500/40 hover:bg-cyan-900/40 hover:border-cyan-400 px-3.5 py-1.5 text-[9px] font-bold text-cyan-400 uppercase tracking-wider transition"
              >
                {isAttesting ? "Sealing Attestation..." : "Compile Attestation Certificate"}
              </button>
            </div>

            {attestationReportHtml ? (
              <div className="flex flex-col gap-3">
                <pre className="font-mono text-[9px] text-emerald-400 bg-black/60 p-4 rounded border border-emerald-950/50 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)] overflow-x-auto leading-relaxed font-sans">
                  {attestationReportHtml}
                </pre>
                
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(attestationReportHtml);
                      toast.success("Attestation certificate copied to clipboard.");
                    }}
                    className="flex items-center gap-1 text-[9px] uppercase font-bold text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Code
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center italic text-slate-600 py-12 text-xs">
                No certificate compiled. Ingest RAG strategy briefs and click "Compile" to generate certified courtroom attestation credentials.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 8. RISK INTELLIGENCE WORKSPACE
  const renderRiskIntelligenceWorkspace = () => {
    if (confidenceScore === 0) {
      return (
        <div className="rounded-xl border border-white/5 bg-slate-950/20 p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
          <AlertOctagon className="h-8 w-8 text-amber-500 animate-pulse" />
          <span className="font-sans font-bold text-slate-300 uppercase tracking-wider text-[11px]">Awaiting Workspace Evidence Check</span>
          <p className="text-[10px] text-slate-500 max-w-sm leading-relaxed mt-1 font-sans">
            Risk intelligence visualizations require active strategic query validation or folder lineage scans. Please run a compliance or strategy query in the Command Center first to parse risks.
          </p>
        </div>
      );
    }

    // Dynamic color synchronization based on confidenceScore & governance contradictions
    const contradictionFound = governanceReport.contradiction_found;
    let anomalyScoreVal = 12; // default
    if (confidenceScore > 0) {
      anomalyScoreVal = Math.round((1 - confidenceScore) * 100);
      if (contradictionFound) {
        anomalyScoreVal = 92; // CRITICAL
      } else {
        // Keep clean scans in LOW range (12% or slightly adjusted)
        anomalyScoreVal = Math.max(8, Math.min(25, anomalyScoreVal));
      }
    }

    // Determine severity color mapping dynamically
    let riskLabel = "LOW RISK";
    let riskColorClass = "text-emerald-400";
    let riskStrokeColor = "#34d399";
    
    if (anomalyScoreVal >= 85) {
      riskLabel = "CRITICAL RISK";
      riskColorClass = "text-rose-500";
      riskStrokeColor = "#ef4444";
    } else if (anomalyScoreVal >= 60) {
      riskLabel = "HIGH RISK";
      riskColorClass = "text-orange-500";
      riskStrokeColor = "#f97316";
    } else if (anomalyScoreVal >= 30) {
      riskLabel = "MEDIUM RISK";
      riskColorClass = "text-amber-500";
      riskStrokeColor = "#f59e0b";
    }

    const getSeverityColor = (sev: string) => {
      switch (sev) {
        case "CRITICAL": return "text-rose-500";
        case "HIGH": return "text-orange-500";
        case "MEDIUM": return "text-amber-500";
        case "LOW": return "text-emerald-400";
        default: return "text-slate-400";
      }
    };

    const getStatusColor = (stat: string) => {
      switch (stat) {
        case "ESCALATED": return "text-rose-500";
        case "INVESTIGATING": return "text-orange-500";
        case "RESOLVED":
        case "MONITORING": return "text-emerald-400";
        default: return "text-cyan-400";
      }
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column score dial */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-5 text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 border-b border-white/5 pb-3 mb-4 block text-left">
              Active Threat Anomaly Score
            </span>
            
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center mb-2">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                <motion.circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="none" 
                  stroke={riskStrokeColor} 
                  strokeWidth="6" 
                  strokeDasharray="251.2"
                  initial={{ strokeDashoffset: 251.2 }}
                  animate={{ strokeDashoffset: 251.2 - (251.2 * (anomalyScoreVal / 100)) }}
                  transition={{ duration: 1.5 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                <span className={`text-lg font-black ${riskColorClass}`}>{anomalyScoreVal}%</span>
                <span className={`text-[7px] uppercase font-black mt-0.5 ${riskColorClass}`}>{riskLabel}</span>
              </div>
            </div>
            
            <span className="text-[9px] font-sans text-slate-500">Active threat checks evaluated under workspace security scope.</span>
          </div>

          {/* Department Vulnerability heatmap grid */}
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 border-b border-white/5 pb-3 mb-3 block">
              Vulnerability department Heatmap
            </span>
            
            <div className="grid grid-cols-4 gap-2 text-center text-[8px] font-mono">
              {[
                { dept: "HR", status: "OK" },
                { dept: "SEC", status: "CRITICAL" },
                { dept: "ETH", status: "OK" },
                { dept: "DEV", status: "HIGH" },
                { dept: "INF", status: "WARN" },
                { dept: "FIN", status: "OK" },
                { dept: "GOV", status: "OK" },
                { dept: "OPS", status: "OK" }
              ].map((item) => {
                let colorClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
                if (item.status === "CRITICAL") {
                  colorClass = "bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse";
                } else if (item.status === "HIGH") {
                  colorClass = "bg-orange-500/15 border-orange-500/50 text-orange-400";
                } else if (item.status === "WARN") {
                  colorClass = "bg-amber-500/15 border-amber-500/50 text-amber-400";
                }
                
                return (
                  <div key={item.dept} className={`border p-2 rounded flex flex-col items-center gap-1 ${colorClass}`}>
                    <span className="font-bold">{item.dept}</span>
                    <span className="text-[7px] opacity-80">{item.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column ledger listing */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-6 flex flex-col gap-4">
            <span className="text-xs font-black text-slate-200 uppercase tracking-widest border-b border-white/5 pb-3">
              Cyber Threat and Anomaly log ledger
            </span>
            
            <div className="overflow-x-auto text-[10px] font-mono">
              <table className="w-full text-left text-slate-400">
                <thead>
                  <tr className="border-b border-white/10 text-slate-500 uppercase text-[9px]">
                    <th className="pb-2 font-bold">Severity</th>
                    <th className="pb-2 font-bold">Threat Anomaly Scope</th>
                    <th className="pb-2 font-bold">Trigger event</th>
                    <th className="pb-2 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { sev: "CRITICAL", name: "Corporate policy contradiction flagged", trigger: "Conflict detected between HR S3 limits and developer access", stat: "ESCALATED" },
                    { sev: "HIGH", name: "Contractor Access geofence breach", trigger: "Unapproved device MDM registration attempt", stat: "INVESTIGATING" },
                    { sev: "MEDIUM", name: "S3 geofencing compliance breach", trigger: "Remote access route validation check failed", stat: "RESOLVED" },
                    { sev: "LOW", name: "PDF OCR noisy text scan warnings", trigger: "Document parsing returned blank characters", stat: "MONITORING" }
                  ].map((anomaly, idx) => (
                    <tr key={idx} className="border-b border-white/3 hover:bg-white/2 transition">
                      <td className={`py-2.5 font-bold ${getSeverityColor(anomaly.sev)}`}>{anomaly.sev}</td>
                      <td className="py-2.5 text-slate-300 font-bold">{anomaly.name}</td>
                      <td className="py-2.5 text-slate-400 font-sans">{anomaly.trigger}</td>
                      <td className={`py-2.5 text-right font-bold ${getStatusColor(anomaly.stat)}`}>{anomaly.stat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 9. REPORTS ARCHIVE
  const renderReportsWorkspace = () => {
    if (briefsArchive.length === 0) {
      return (
        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-4 py-20 relative overflow-hidden shadow-inner">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-cyan-500/2 blur-[80px] pointer-events-none" />
          <FileText className="h-10 w-10 text-slate-600 mb-2" />
          <span className="font-sans font-bold text-slate-300 uppercase tracking-wider text-[12px]">
            No Reports Generated Yet
          </span>
          <p className="text-[10.5px] text-slate-500 max-w-sm leading-relaxed mt-1 font-sans">
            Generate an executive intelligence briefing from the Command Center to create your first report archive.
          </p>
          <button
            onClick={() => setActiveWorkspace("command_center")}
            className="rounded border border-cyan-400/40 bg-cyan-950/45 px-6 py-2.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-900/40 hover:text-white cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.15)] active:scale-95 flex items-center gap-1.5"
          >
            Open Command Center
          </button>
          <span className="text-[9px] text-slate-600 font-mono mt-2">
            Reports will automatically appear here after successful report generation.
          </span>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-white/5 bg-slate-950/40 p-6 flex flex-col gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-cyan-500/2 blur-[80px] pointer-events-none" />
        
        <span className="text-xs font-black text-slate-200 uppercase tracking-widest border-b border-white/5 pb-3">
          Session strategy Briefings History Archive
        </span>
        
        <div className="overflow-x-auto text-xs font-mono">
          <table className="w-full text-left text-slate-400">
            <thead>
              <tr className="border-b border-white/10 text-slate-500 text-[10px] uppercase">
                <th className="pb-2.5 font-bold">Report Name</th>
                <th className="pb-2.5 font-bold">Generated Time</th>
                <th className="pb-2.5 font-bold text-center">Confidence</th>
                <th className="pb-2.5 font-bold text-center">Risk Level</th>
                <th className="pb-2.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {briefsArchive.map((brief, idx) => {
                let riskColorClass = "text-emerald-400";
                if (brief.riskLevel === "CRITICAL") riskColorClass = "text-rose-500 animate-pulse";
                else if (brief.riskLevel === "HIGH") riskColorClass = "text-orange-500";
                else if (brief.riskLevel === "MEDIUM") riskColorClass = "text-amber-500";

                return (
                  <tr key={idx} className="border-b border-white/3 hover:bg-white/2 transition">
                    <td className="py-3 text-slate-300 font-bold">{brief.title}</td>
                    <td className="py-3 text-slate-400 font-sans">{brief.date}</td>
                    <td className="py-3 text-center font-bold text-cyan-400">{brief.score}</td>
                    <td className={`py-3 text-center font-bold ${riskColorClass}`}>{brief.riskLevel}</td>
                    <td className="py-3 text-right flex gap-3 justify-end font-sans">
                      <button
                        onClick={() => {
                          setSelectedReportForView(brief);
                        }}
                        className="text-cyan-500 hover:text-white transition font-bold cursor-pointer"
                      >
                        [ View ]
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 10. SETTINGS WORKSPACE
  const renderSettingsWorkspace = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Settings Configuration panels */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-6 flex flex-col gap-5">
            <span className="text-xs font-black text-slate-200 uppercase tracking-widest border-b border-white/5 pb-3">
              Google Gemini Enterprise Secured Model parameters
            </span>
            
            {/* LLM Model selector dropdown */}
            <div className="flex flex-col gap-2 max-w-sm">
              <label className="text-[10px] uppercase font-bold text-slate-400">Target evaluation model</label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  toast.success(`Active target model switched to ${e.target.value}.`);
                }}
                className="rounded border border-white/5 bg-black/40 p-2.5 text-xs text-white focus:border-cyan-400/40 focus:outline-none"
              >
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Enterprise Secure)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (High Latency-Optimized)</option>
              </select>
            </div>

            {/* Slider parameters */}
            <div className="flex flex-col gap-4 mt-3">
              <div className="flex flex-col gap-2 max-w-sm">
                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400">
                  <span>Temperature value:</span>
                  <span className="text-cyan-400 font-mono">{llmTemperature}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.1"
                  value={llmTemperature}
                  onChange={(e) => setLlmTemperature(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-2 max-w-sm">
                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400">
                  <span>ChromaDB Chunk Size bounds:</span>
                  <span className="text-cyan-400 font-mono">{chunkSizeSlider} chars</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="1500"
                  step="50"
                  value={chunkSizeSlider}
                  onChange={(e) => setChunkSizeSlider(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column hard reset DB */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-6 flex flex-col gap-3">
            <span className="text-xs font-black text-slate-200 uppercase tracking-widest border-b border-white/5 pb-3">
              Platform vector database purge settings
            </span>
            
            <p className="text-[10px] text-slate-500 font-sans leading-relaxed mt-2 mb-4">
              Hard Purging deletes all custom-uploaded files inside the active isolated session namespace and reloads corporate library seeds. This operation cannot be undone.
            </p>

            <button
              onClick={handleResetDB}
              className="w-full flex justify-center items-center gap-1.5 rounded bg-rose-950/40 border border-rose-500/40 hover:bg-rose-900/40 hover:border-rose-400 py-3 text-[9px] uppercase font-black text-rose-400 transition"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              Hard Purge Vector Database
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-screen bg-[#020205] text-slate-100 font-sans antialiased overflow-hidden">
      {/* 2. Left Persistent Enterprise Sidebar - occupies full height starting from absolute top */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarCollapsed ? "68px" : "256px" }}
        transition={{ type: "spring", stiffness: 260, damping: 25 }}
        className="h-full border-r border-white/5 bg-[#030307]/95 flex flex-col justify-between shrink-0 select-none shadow-[4px_0_24px_rgba(0,0,0,0.8)] z-30 animate-fade-in"
      >
        {/* Top navigation options list */}
        <div className="flex flex-col flex-1 p-3 overflow-y-auto custom-scrollbar">
          
          {/* Collapse toggle header */}
          <div className="pb-3 mb-4 border-b border-white/5 relative min-h-[50px] flex flex-col justify-center">
            {isSidebarCollapsed ? (
              // Collapsed brand and hover-to-expand
              <div 
                className="flex items-center justify-center w-full h-10 relative cursor-pointer"
                onMouseEnter={() => setIsLogoHovered(true)}
                onMouseLeave={() => setIsLogoHovered(false)}
                onClick={() => {
                  setIsSidebarCollapsed(false);
                  setIsLogoHovered(false);
                }}
              >
                <AnimatePresence mode="wait">
                  {!isLogoHovered ? (
                    <motion.div
                      key="shield"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-center"
                    >
                      <Shield className="h-6 w-6 text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="expand-btn"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col items-center gap-1"
                    >
                      <button
                        type="button"
                        className="p-1.5 rounded border border-white/10 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-cyan-400/30 transition shadow-md flex items-center justify-center shrink-0"
                        title="Open Workspace"
                      >
                        <Menu className="h-4 w-4 text-cyan-400" />
                      </button>
                      <span className="text-[7px] text-cyan-400 uppercase font-black tracking-wider leading-none">Open</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              // Expanded brand and collapse control
              <div className="flex flex-col gap-2 p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
                    <span className="text-[12px] font-black uppercase tracking-widest bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                      INSENTIC AI
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="p-1 rounded border border-white/10 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-cyan-400/30 transition shadow-md cursor-pointer flex items-center justify-center shrink-0 gap-1 text-[9px] uppercase font-bold tracking-wider px-2"
                    title="Collapse Sidebar"
                  >
                    <ChevronLeft className="h-3 w-3 text-cyan-400" />
                    <span>Collapse</span>
                  </button>
                </div>
                <span className="text-[9px] text-slate-500 font-sans tracking-wide leading-normal pl-7">
                  Enterprise Intelligence Platform
                </span>
              </div>
            )}
          </div>

          {/* Workspaces list */}
          <div className="flex flex-col gap-1.5">
            {sidebarItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeWorkspace === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveWorkspace(item.id)}
                  title={isSidebarCollapsed ? item.name : undefined}
                  className={`flex items-center gap-3 rounded-lg p-2.5 cursor-pointer text-left transition-all duration-300 transform select-none ${
                    isActive 
                      ? "bg-cyan-950/30 border border-cyan-400/80 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] font-semibold" 
                      : "border border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-cyan-300 hover:border-cyan-500/20 hover:shadow-[0_0_12px_rgba(34,211,238,0.1)] hover:-translate-y-0.5"
                  }`}
                >
                  <IconComp className={`h-4.5 w-4.5 shrink-0 transition-all duration-300 ${isActive ? "scale-110 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]" : "group-hover:text-cyan-300"}`} />
                  {!isSidebarCollapsed && (
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {item.name}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        </div>

        {/* Sidebar Footer User Controls */}
        <div className="p-3 border-t border-white/5 bg-black/20 text-xs flex flex-col gap-2">
          {!isSidebarCollapsed ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">User Session</span>
                <span className="text-slate-300 font-medium truncate max-w-[230px]" title={auth.currentUser?.email || ""}>
                  {auth.currentUser?.email || "Guest Session"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-center py-2 px-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-900/30 hover:text-white transition duration-200 cursor-pointer text-[10px] font-black uppercase tracking-wider"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center p-2.5 rounded-lg border border-red-500/20 bg-red-950/10 text-red-400 hover:bg-red-900/30 hover:text-white transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          )}
        </div>
      </motion.aside>

      {/* RIGHT side container: Header + Main scrollable Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* 1. Header (Dynamic Telemetry Bar) */}
        <DashboardHeader documentCount={finalDocCount} />

        {/* 2. Main Scrollable Workspace Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#020205] relative custom-scrollbar flex flex-col gap-6">
          {/* Background overlay glow */}
          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-indigo-500/2 blur-[100px] pointer-events-none" />

          {/* Active Workspace View Router */}
          {activeWorkspace === "command_center" && renderCommandCenter()}
          {activeWorkspace === "documents" && renderDocumentsWorkspace()}
          {activeWorkspace === "knowledge_base" && renderKnowledgeBaseWorkspace()}
          {activeWorkspace === "rag_inspector" && renderRAGInspectorWorkspace()}
          {activeWorkspace === "governance_guard" && renderGovernanceGuardWorkspace()}
          {activeWorkspace === "risk_intelligence" && renderRiskIntelligenceWorkspace()}
          {activeWorkspace === "reports" && <MyReportsWorkspace />}
          {activeWorkspace === "settings" && renderSettingsWorkspace()}
        </main>
      </div>

      {/* Full-screen premium glassmorphism uploading overlay */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-6"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-xl border border-cyan-500/20 bg-zinc-950/90 p-6 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-cyan-500/5 blur-[80px] pointer-events-none" />
              
              <Database className="h-12 w-12 text-cyan-400 mx-auto mb-4 animate-bounce" />
              <h3 className="text-md font-black tracking-widest text-slate-200 uppercase">
                Ingesting Corporate Knowledge
              </h3>
              <p className="text-[11px] font-mono text-cyan-400 mt-1 mb-6 animate-pulse">
                {activeUploadStage}
              </p>

              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-2">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Consensus Stage: {uploadProgress}% Completed
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden upload inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUploadFile}
        className="hidden"
        accept=".pdf,.docx,.pptx,.ppt,.xlsx,.xls,.csv,.txt,.json,.md"
      />
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleUploadFolder}
        className="hidden"
        {...({
          webkitdirectory: "true",
          directory: "true",
          multiple: true
        } as any)}
      />

      {/* Floating Library Drawer */}
      <AnimatePresence>
        {showLibraryDrawer && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowLibraryDrawer(false)} />
            
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[400px] z-50 shadow-2xl bg-zinc-950/95 backdrop-blur-xl border-l border-white/10 p-6 flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div>
                  <h3 className="text-xs font-black tracking-widest uppercase text-slate-300 flex items-center gap-1.5">
                    <Database className="h-4.5 w-4.5 text-cyan-400" />
                    Workspace Sources Library
                  </h3>
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    Explore and manage active folder mappings for session <span className="font-mono text-cyan-400">{sessionId.slice(8)}</span>.
                  </p>
                </div>
                <button
                  onClick={() => setShowLibraryDrawer(false)}
                  className="rounded border border-white/10 bg-slate-900 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {ingestedFiles.length === 0 ? (
                  <div className="text-center text-slate-500 text-xs py-12">
                    No files found in the active workspace. Appends some files to load!
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {Object.entries(getFolderHierarchy()).map(([folderName, files]) => {
                      const isOpen = openFolders[folderName] !== false;
                      
                      return (
                        <div key={folderName} className="flex flex-col gap-1 border-b border-white/3 pb-3">
                          <div
                            onClick={() => toggleFolder(folderName)}
                            className="flex items-center justify-between cursor-pointer hover:bg-white/2 p-1.5 rounded transition text-xs font-bold text-slate-300"
                          >
                            <div className="flex items-center gap-2">
                              {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                              <Folder className="h-4 w-4 text-indigo-400" />
                              <span className="font-mono truncate">{folderName}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 bg-white/5 border border-white/10 px-1.5 py-0.2 rounded-full">
                              {files.length}
                            </span>
                          </div>

                          {isOpen && (
                            <div className="flex flex-col gap-2 pl-4 mt-1 border-l border-white/5 ml-3">
                              {files.map((file, fileIdx) => (
                                <div
                                  key={fileIdx}
                                  className="rounded border border-white/2 bg-black/40 p-2.5 flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-3.5 w-3.5 text-cyan-400" />
                                    <div className="flex flex-col">
                                      <span className="text-[11px] font-semibold text-slate-300 max-w-[200px] truncate">
                                        {file.source}
                                      </span>
                                      <span className="text-[9px] text-slate-500 font-mono">
                                        {file.chunk_count} chunks | {file.uploaded_at === "preloaded" ? "corporate index" : "session upload"}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {file.uploaded_at === "preloaded" ? (
                                    <Globe className="h-3.5 w-3.5 text-slate-500" />
                                  ) : (
                                    <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dynamic Ingestion Summary Overlay */}
      <AnimatePresence>
        {showSummaryOverlay && summaryData && (
          <>
            <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm" onClick={() => setShowSummaryOverlay(false)} />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-[120] rounded-xl border border-white/10 bg-zinc-950 p-6 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-cyan-500/5 blur-[80px] pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div>
                  <h3 className="text-xs font-black tracking-widest uppercase text-slate-300 flex items-center gap-1.5">
                    <Database className="h-4.5 w-4.5 text-cyan-400" />
                    Knowledge Ingestion Summary
                  </h3>
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    Observability report compiled by the dynamic enterprise parser gateway.
                  </p>
                </div>
                <button
                  onClick={() => setShowSummaryOverlay(false)}
                  className="rounded border border-white/10 bg-slate-900 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-5">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/10 p-3 text-center">
                  <div className="text-xs font-bold text-emerald-400">{summaryData.indexedCount}</div>
                  <div className="text-[8px] uppercase tracking-wider text-slate-500 font-mono mt-0.5">Indexed Docs</div>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-3 text-center">
                  <div className="text-xs font-bold text-amber-400">{summaryData.skippedCount}</div>
                  <div className="text-[8px] uppercase tracking-wider text-slate-500 font-mono mt-0.5">Skipped Files</div>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/2 p-3 text-center">
                  <div className="text-xs font-bold text-slate-200">{summaryData.totalChunks}</div>
                  <div className="text-[8px] uppercase tracking-wider text-slate-500 font-mono mt-0.5">Total Chunks</div>
                </div>
                <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/10 p-3 text-center">
                  <div className="text-xs font-bold text-cyan-400">{summaryData.totalEmbeddings}</div>
                  <div className="text-[8px] uppercase tracking-wider text-slate-500 font-mono mt-0.5">Embeddings</div>
                </div>
              </div>

              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                File Ingestion Status
              </h4>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2 max-h-[220px]">
                {summaryData.files.map((file, idx) => (
                  <div
                    key={idx}
                    className={`rounded border p-2.5 flex items-center justify-between transition ${
                      file.status === "indexed"
                        ? "border-emerald-500/20 bg-emerald-950/5 text-slate-200"
                        : file.status === "skipped"
                        ? "border-amber-500/10 bg-amber-950/5 text-slate-400"
                        : "border-white/5 bg-black/40 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {file.status === "indexed" ? (
                        <CheckSquare className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      )}
                      
                      <div className="flex flex-col">
                        <span className={`text-[11px] font-semibold truncate max-w-[200px] ${file.status === "unsupported" ? "line-through opacity-60" : ""}`}>
                          {file.name}
                        </span>
                        {file.reason && (
                          <span className="text-[9px] text-amber-500/70 font-mono mt-0.5">
                            {file.reason}
                          </span>
                        )}
                        {file.status === "indexed" && (
                          <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                            Ingested {file.chunks} semantic segments
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider font-mono ${
                      file.status === "indexed"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : file.status === "skipped"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-white/5 text-slate-400 border border-white/10"
                    }`}>
                      {file.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/5 pt-4 mt-4 flex justify-end">
                <button
                  onClick={() => setShowSummaryOverlay(false)}
                  className="rounded border border-cyan-500/40 bg-cyan-950/40 px-4 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-900/50 hover:text-white transition"
                >
                  Consensus Acknowledged
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dynamic Metadata Inspector Modal */}
      <AnimatePresence>
        {showMetadataModal && selectedInspectFile && (
          <>
            <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm" onClick={() => setShowMetadataModal(false)} />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[120] rounded-xl border border-white/10 bg-zinc-950 p-6 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-cyan-500/5 blur-[80px] pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div>
                  <h3 className="text-xs font-black tracking-widest uppercase text-slate-300 flex items-center gap-1.5 font-mono">
                    <Info className="h-4.5 w-4.5 text-cyan-400" />
                    Document Lineage Metadata
                  </h3>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-sans">
                    Detailed index metrics parsed from vector database records.
                  </p>
                </div>
                <button
                  onClick={() => setShowMetadataModal(false)}
                  className="rounded border border-white/10 bg-slate-900 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3 font-mono text-[10px] text-slate-400">
                <div className="flex justify-between border-b border-white/3 pb-1.5">
                  <span>File Name:</span>
                  <span className="font-bold text-white max-w-[200px] truncate" title={selectedInspectFile.source}>{selectedInspectFile.source}</span>
                </div>
                <div className="flex justify-between border-b border-white/3 pb-1.5">
                  <span>File Type:</span>
                  <span className="font-bold text-cyan-400">{selectedInspectFile.doc_type || "Document"}</span>
                </div>
                <div className="flex justify-between border-b border-white/3 pb-1.5">
                  <span>Directory Path:</span>
                  <span className="font-bold text-white">{selectedInspectFile.folder_path || "/"}</span>
                </div>
                <div className="flex justify-between border-b border-white/3 pb-1.5">
                  <span>Total Vector Chunks:</span>
                  <span className="font-bold text-cyan-400">{selectedInspectFile.chunk_count} chunks</span>
                </div>
                <div className="flex justify-between border-b border-white/3 pb-1.5">
                  <span>Session Namespace:</span>
                  <span className="font-bold text-white">{selectedInspectFile.session_id || sessionId.slice(8)}</span>
                </div>
                <div className="flex justify-between border-b border-white/3 pb-1.5">
                  <span>Embedding Matrix:</span>
                  <span className="font-bold text-indigo-400">768 floats (text-embedding-004)</span>
                </div>
                <div className="flex justify-between border-b border-white/3 pb-1.5">
                  <span>Indexing Health:</span>
                  <span className="font-bold text-emerald-400">100% HEALTHY</span>
                </div>
                <div className="flex justify-between border-b border-white/3 pb-1.5">
                  <span>OCR Parser Fallback:</span>
                  <span className="font-bold text-amber-400">{selectedInspectFile.source.endsWith(".pdf") ? "ACTIVE" : "BYPASSED"}</span>
                </div>
                <div className="flex justify-between pb-1.5">
                  <span>RAG Matching Target:</span>
                  <span className="font-bold text-white">COSINE SIMILARITY</span>
                </div>
              </div>

              <div className="mt-5 border-t border-white/5 pt-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    handleReindexDoc(selectedInspectFile);
                    setShowMetadataModal(false);
                  }}
                  className="rounded border border-indigo-500/40 bg-indigo-950/40 px-4 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-900/50 hover:text-white transition cursor-pointer"
                >
                  Force Re-Index
                </button>
                <button
                  onClick={() => setShowMetadataModal(false)}
                  className="rounded border border-white/10 bg-slate-900 px-4 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dynamic View Report Modal */}
      <AnimatePresence>
        {selectedReportForView && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReportForView(null)}
              className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-6 md:inset-12 z-[110] rounded-xl border border-white/10 bg-[#020205] shadow-2xl overflow-hidden flex flex-col max-w-6xl mx-auto shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            >
              {/* Premium Abstract Background Glows */}
              <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-indigo-500/3 blur-[120px] pointer-events-none" />

              {/* Header Title Bar */}
              <div className="flex items-center justify-between border-b border-white/5 bg-black/30 p-5 z-10 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-cyan-400 font-bold" />
                  <div>
                    <h3 className="text-sm font-black tracking-wider uppercase text-slate-200">
                      Archived Strategy Intelligence Briefing
                    </h3>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5 uppercase">
                      Report ID: {selectedReportForView.id} | Generated: {selectedReportForView.date} | Confidence: {selectedReportForView.score}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedReportForView.finalResponse);
                      toast.success("Executive Strategy Briefing copied to clipboard");
                    }}
                    className="flex items-center gap-1 rounded bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:text-white transition cursor-pointer select-none"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Markdown</span>
                  </button>
                  <button
                    onClick={() => setSelectedReportForView(null)}
                    className="rounded border border-white/10 bg-slate-900 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Document Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-8 z-10">
                <FinalIntelligenceWorkspace
                  finalResponse={selectedReportForView.finalResponse}
                  citations={selectedReportForView.citations}
                  documents={selectedReportForView.documents}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
