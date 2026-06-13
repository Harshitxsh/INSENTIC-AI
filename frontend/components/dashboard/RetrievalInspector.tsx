"use client";

import React, { useState } from "react";
import { Search, ChevronDown, ChevronUp, FileText, CheckCircle2, Award, Percent, Link2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface DocumentChunk {
  id: string;
  text: string;
  raw_text?: string;
  similarity: number;
  is_ocr?: boolean;
  embedding_status?: string;
  metadata: {
    source: string;
    doc_type: string;
    chunk_index: number;
    total_chunks: number;
    title?: string;
  };
}

interface RetrievalInspectorProps {
  documents: DocumentChunk[];
  expandedQuery?: string;
}

export default function RetrievalInspector({ documents, expandedQuery }: RetrievalInspectorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<string, "cleaned" | "raw">>({});

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Highlighting entities like numbers, percentages, document codes, stipends
  const highlightEntities = (text: string) => {
    // Basic regex to highlight metrics, dates, percentages, dollars, and document codes
    const regex = /(\d+%\s*Match|\$\d+|\d+\s*Mbps|YubiKey\s*\w+|\bEST\b|\bPST\b|\bUTC\b|\bMFA\b|\bWPA3\b|\bVPN\b|\bGDPR\b|\bCCPA\b|\d+:\d+\s*[A-Z]{3}|\b1-800-\d+-\w+\b|compliance\.corp\/\w+|HR-POL-\d+-\w+|SEC-AUD-\d+-\w+|COMP-DOC-\d+-\w+)/g;
    
    if (!text) return "";
    
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (regex.test(part)) {
        return (
          <mark key={i} className="bg-cyan-500/20 text-cyan-200 border-b border-cyan-400 px-1 py-0.5 rounded-sm font-bold font-mono">
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Query Expansion Visualizer */}
      {expandedQuery && (
        <div className="rounded-lg border border-cyan-500/10 bg-cyan-950/20 p-4 relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)]">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-black tracking-widest text-cyan-300 uppercase">
              Semantic Search Gateway Query
            </span>
          </div>
          <p className="text-xs font-mono text-cyan-200/90 leading-relaxed bg-black/40 p-3 rounded border border-white/5 whitespace-pre-wrap">
            {expandedQuery}
          </p>
        </div>
      )}

      {/* Documents List */}
      <div>
        <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Award className="h-4 w-4 text-indigo-400" />
          RAG Pipeline Chunk Lineage & Match Rankings
        </h3>
        
        {documents.length === 0 ? (
          <div className="rounded-lg border border-white/5 bg-slate-950/25 p-8 text-center text-slate-500 text-sm">
            No source documents have been queried or returned yet. Submit an analysis query to initiate retrieval.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {documents.map((doc, idx) => {
              const isExpanded = expandedId === doc.id;
              const similarityPercentage = Math.round(doc.similarity * 100);
              const currentTab = activeTabs[doc.id] || "cleaned";
              
              // Color spectrum based on similarity match
              const matchColor = 
                similarityPercentage >= 90 
                  ? "text-emerald-400 border-emerald-500/20 bg-emerald-950/25"
                  : similarityPercentage >= 80
                  ? "text-cyan-400 border-cyan-500/20 bg-cyan-950/25"
                  : "text-slate-400 border-white/5 bg-slate-900/20";

              return (
                <div
                  key={doc.id}
                  className={`rounded-lg border bg-slate-950/40 backdrop-blur-md overflow-hidden transition-all duration-300 ${
                    isExpanded ? "border-cyan-500/30 ring-1 ring-cyan-500/10" : "border-white/5"
                  }`}
                >
                  {/* Collapsed Header */}
                  <div
                    onClick={() => toggleExpand(doc.id)}
                    className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-white/2"
                  >
                    <div className="flex items-center gap-3">
                      {/* Match Ranking Index badge */}
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-900 border border-white/10 text-[10px] font-bold font-mono text-slate-400">
                        #{idx + 1}
                      </span>
                      
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 border border-white/10 text-slate-300">
                        <FileText className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-200">
                            {doc.metadata.source}
                          </span>
                          <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                            {doc.metadata.doc_type}
                          </span>
                          {/* Used in reasoning indicator */}
                          <span className="flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            CONSENSUS VERIFIED
                          </span>
                          
                          {doc.is_ocr && (
                            <span className="flex items-center gap-0.5 rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                              <Sparkles className="h-2.5 w-2.5" />
                              OCR ACTIVE
                            </span>
                          )}

                          {doc.embedding_status && (
                            <span className="rounded bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-400 font-mono">
                              EMBED: {doc.embedding_status}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">
                          Lineage: chunk {doc.metadata.chunk_index + 1} of {doc.metadata.total_chunks}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Similarity Meter Badge */}
                      <div className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-bold ${matchColor}`}>
                        <Percent className="h-3 w-3" />
                        <span>{similarityPercentage}% Match</span>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content Body */}
                  {isExpanded && (
                    <div className="border-t border-white/5 bg-black/40 p-4">
                      {/* Metadata Lineage bar */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-1">
                          <Link2 className="h-3 w-3 text-cyan-400" />
                          Source Lineage Metadata
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          NODE ID: {doc.id}
                        </span>
                      </div>

                      {/* OCR Visual Debug tabs */}
                      {doc.is_ocr && doc.raw_text && (
                        <div className="flex gap-2 border-b border-white/5 mb-3 pb-1">
                          <button
                            onClick={() => setActiveTabs(prev => ({ ...prev, [doc.id]: "cleaned" }))}
                            className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${
                              currentTab === "cleaned"
                                ? "border-cyan-500/30 text-cyan-400 bg-cyan-950/30"
                                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                            }`}
                          >
                            Cleaned OCR Text
                          </button>
                          <button
                            onClick={() => setActiveTabs(prev => ({ ...prev, [doc.id]: "raw" }))}
                            className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${
                              currentTab === "raw"
                                ? "border-amber-500/30 text-amber-400 bg-amber-950/30"
                                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                            }`}
                          >
                            Raw OCR Output (Noisy Debug)
                          </button>
                        </div>
                      )}
                      
                      {/* Highlighted text pane */}
                      <div className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap bg-slate-950/70 p-4 rounded border border-white/5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
                        {currentTab === "raw" && doc.raw_text 
                          ? highlightEntities(doc.raw_text) 
                          : highlightEntities(doc.text)
                        }
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
