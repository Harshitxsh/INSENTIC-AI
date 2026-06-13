"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, Database, ShieldAlert, CheckCircle, RefreshCw, Layers, Cpu, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface IngestedFile {
  source: string;
  doc_type: string;
  chunk_count: number;
  uploaded_at: string;
  session_id: string;
}

interface IntakeConsoleProps {
  sessionId: string;
  onIngestSuccess: () => void;
  documentCount: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function IntakeConsole({ sessionId, onIngestSuccess, documentCount }: IntakeConsoleProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ingestionLogs, setIngestionLogs] = useState<string[]>([]);
  const [filesList, setFilesList] = useState<IngestedFile[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch unique ingested files list matching active session
  const fetchLibrary = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/documents?session_id=${sessionId}`);
      if (res.data?.status === "success") {
        setFilesList(res.data.documents);
      }
    } catch (err) {
      console.warn("Failed to load documents library.");
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [sessionId, documentCount]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setProgress(10);
    setIngestionLogs([
      `[INTAKE] Received file: "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`,
      `[INTAKE] Transferring file parameters to Ingestion Gateway...`
    ]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", sessionId);
    
    // Auto-detect type
    let type = "Standard File";
    if (file.name.endsWith(".pdf")) type = "PDF Document";
    else if (file.name.endsWith(".docx")) type = "Word Document";
    else if (file.name.endsWith(".pptx") || file.name.endsWith(".ppt")) type = "Slide Presentation";
    else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) type = "Excel Sheet";
    else if (file.name.endsWith(".csv")) type = "CSV Dataset";
    else if (file.name.endsWith(".txt")) type = "Text Corpus";
    formData.append("doc_type", type);

    try {
      // Simulate file upload progress bar causal animations
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(85, prev + 15));
      }, 300);

      const res = await axios.post(`${API_URL}/api/documents/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (res.data?.status === "success") {
        setIngestionLogs(res.data.ingestion_logs);
        toast.success(`Successfully indexed document: ${file.name}`);
        
        // Refresh listings
        fetchLibrary();
        onIngestSuccess();
      } else if (res.data?.status === "skipped") {
        setIngestionLogs(res.data.ingestion_logs || []);
        const warning = res.data.warnings?.[0] || "File skipped from ingestion.";
        toast.error(`Ingestion Warning: ${warning}`);
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.detail || "Upload failed due to connection interruption.";
      toast.error(`Ingestion Failed: ${errMsg}`);
      setIngestionLogs((prev) => [...prev, `[FATAL] Ingestion aborted: ${errMsg}`]);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
      }, 1500);
    }
  };

  return (
    <div className="rounded-xl border border-white/5 bg-slate-950/40 p-6 backdrop-blur-md relative overflow-hidden">
      <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-1.5">
          <UploadCloud className="h-4.5 w-4.5 text-cyan-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Knowledge Intake
          </h3>
        </div>
        
        <button
          onClick={() => setShowLibrary(true)}
          className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400 hover:text-white transition"
        >
          <Eye className="h-3.5 w-3.5 text-indigo-400" />
          Library ({filesList.length})
        </button>
      </div>

      {/* Hidden file selector input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.docx,.pptx,.ppt,.xlsx,.xls,.csv,.txt,.json,.md"
      />

      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? "border-cyan-400 bg-cyan-950/15"
            : isUploading
            ? "border-indigo-500/20 bg-indigo-950/5 cursor-wait"
            : "border-white/10 hover:border-cyan-500/30 hover:bg-slate-900/20"
        }`}
      >
        <UploadCloud className={`h-8 w-8 mb-2 transition-transform duration-300 ${isUploading ? "animate-bounce text-indigo-400" : "text-slate-500"}`} />
        <span className="text-xs font-bold text-slate-300 block mb-0.5">
          {isUploading ? "Uploading & Ingesting..." : "Drag & Drop Files"}
        </span>
        <span className="text-[9px] text-slate-500 max-w-[200px] leading-relaxed">
          Supports PDF, Word, PowerPoint, Excel, CSV, TXT files (Max 15MB)
        </span>
      </div>

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Progress: {progress}%</span>
            <span className="animate-pulse text-indigo-400">indexing...</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Ingestion Terminal Logs */}
      {ingestionLogs.length > 0 && (
        <div className="mt-4 rounded border border-emerald-500/10 bg-black/60 p-3 font-mono text-[9px] text-emerald-400 shadow-[inset_0_0_15px_rgba(16,185,129,0.02)]">
          <div className="flex items-center gap-1.5 border-b border-emerald-950 pb-1.5 mb-1.5 justify-between">
            <span className="text-[8px] uppercase tracking-widest font-bold text-emerald-500">
              Ingestion Pipe Trace
            </span>
            <button
              onClick={() => setIngestionLogs([])}
              className="text-slate-500 hover:text-white"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-col gap-1 max-h-[80px] overflow-y-auto custom-scrollbar">
            {ingestionLogs.map((log, index) => (
              <div key={index} className="leading-relaxed">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slide-out Library Modal Dialog */}
      <AnimatePresence>
        {showLibrary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl rounded-xl border border-white/10 bg-zinc-950 p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-black tracking-widest uppercase text-slate-300 flex items-center gap-1.5">
                    <Database className="h-4.5 w-4.5 text-cyan-400" />
                    Enterprise Knowledge Library
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Files currently parsed, embedded, and indexed under namespace: <span className="font-mono text-cyan-400">{sessionId}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowLibrary(false)}
                  className="rounded border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Close Library
                </button>
              </div>

              {/* Ingested File Library List */}
              <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {filesList.length === 0 ? (
                  <div className="text-center text-slate-500 text-xs py-12">
                    No custom documents uploaded in this session yet. Upload a PDF or spreadsheet to begin!
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {filesList.map((file, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-white/5 bg-black/40 p-4 flex items-center justify-between transition hover:border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 border border-white/10 text-slate-300">
                            <FileText className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-200">
                                {file.source}
                              </span>
                              <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                {file.doc_type}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-500 mt-1 block">
                              Chunks Indexed: <span className="font-mono text-cyan-400 font-bold">{file.chunk_count}</span> | Uploaded: {file.uploaded_at}
                            </span>
                          </div>
                        </div>

                        {file.uploaded_at === "preloaded" ? (
                          <span className="rounded bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[9px] font-bold text-indigo-400 uppercase tracking-wider">
                            Preloaded Seed
                          </span>
                        ) : (
                          <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[9px] font-bold text-cyan-400 uppercase tracking-wider">
                            Session Isolated
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
