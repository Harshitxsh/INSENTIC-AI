"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { FileText, Search, Trash2, Eye, Clock, ShieldAlert, ShieldCheck, Database, SearchCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import FinalIntelligenceWorkspace from "./FinalIntelligenceWorkspace";

export default function MyReportsWorkspace() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("response");

  useEffect(() => {
    fetchReports();
  }, [auth.currentUser]);

  const fetchReports = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "reports"),
        where("userId", "==", auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const fetchedReports: any[] = [];
      querySnapshot.forEach((doc) => {
        fetchedReports.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort client-side by createdAt descending to avoid composite index requirements
      fetchedReports.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      setReports(fetchedReports);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to fetch reports: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this report?")) return;
    
    try {
      await deleteDoc(doc(db, "reports", id));
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (selectedReport?.id === id) {
        setSelectedReport(null);
      }
      toast.success("Report deleted successfully");
    } catch (error) {
      toast.error("Failed to delete report");
    }
  };

  const filteredReports = reports.filter((r) => 
    r.reportTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.query?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedReport) {
    const scoreVal = selectedReport.confidenceAnalysis?.factual_accuracy_score ?? selectedReport.confidenceMetrics?.factual_accuracy_score ?? 0.0;
    const riskVal = selectedReport.confidenceAnalysis?.risk_level ?? selectedReport.confidenceMetrics?.risk_level ?? "UNKNOWN";
    const governance = selectedReport.governanceGuard || {};

    return (
      <div className="flex flex-col h-full overflow-hidden bg-zinc-950 text-slate-100 p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => {
                setSelectedReport(null);
                setActiveTab("response");
              }} 
              variant="outline" 
              size="sm" 
              className="border-zinc-800 text-zinc-400 hover:text-white"
            >
              &larr; Back to Reports
            </Button>
            <div>
              <h2 className="text-lg font-bold text-slate-200">{selectedReport.reportTitle}</h2>
              <p className="text-xs text-zinc-500 mt-1">Query: {selectedReport.query}</p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-col rounded-xl border border-white/5 bg-slate-950/20 overflow-hidden shadow-2xl flex-1">
          <div className="border-b border-white/5 bg-black/40 px-4 flex gap-2 overflow-x-auto scrollbar-none">
            {[
              { id: "response", name: "Final Report" },
              { id: "reasoning", name: "Reasoning Path" },
              { id: "governance", name: "Governance Guard" },
              { id: "retrieval", name: "RAG Inspector" },
              { id: "confidence", name: "Confidence Analysis" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-4 py-3 text-xs font-semibold tracking-wide uppercase transition shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-950/10">
            {activeTab === "response" && (
              <FinalIntelligenceWorkspace 
                finalResponse={selectedReport.reportContent || selectedReport.finalReport}
                citations={selectedReport.citations || []} 
                documents={selectedReport.ragInspector || []} 
              />
            )}

            {activeTab === "reasoning" && (
              <div className="rounded-xl border border-white/5 bg-slate-900/40 p-6 shadow-inner font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {selectedReport.reasoningPath || "No strategic reasoning path recorded."}
              </div>
            )}

            {activeTab === "governance" && (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-white/5 bg-slate-900/40 p-5 shadow-inner">
                  <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4">
                    Governance Verification Checks
                  </h3>
                  <div className="flex flex-col gap-3">
                    {Object.entries(governance).length > 0 ? (
                      Object.entries(governance).map(([key, val]: [string, any]) => {
                        const pass = !val?.contradiction_found && !val?.failed && val?.compliant !== false;
                        return (
                          <div key={key} className="flex items-center justify-between border-b border-zinc-800 pb-2 text-xs">
                            <span className="capitalize font-medium text-slate-400">{key.replace(/_/g, " ")}:</span>
                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${pass ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-400" : "bg-red-950/40 border border-red-500/30 text-red-400"}`}>
                              {pass ? "PASSED" : "FAILED"}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500 font-sans">No governance guard parameters recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "retrieval" && (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-white/5 bg-slate-900/40 p-5 shadow-inner">
                  <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4">
                    Retrieved Knowledge Chunks (RAG Inspector)
                  </h3>
                  {selectedReport.ragInspector && selectedReport.ragInspector.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {selectedReport.ragInspector.map((docItem: any, idx: number) => (
                        <div key={idx} className="rounded-lg bg-zinc-950 p-4 border border-zinc-800 text-xs flex flex-col gap-2">
                          <div className="flex justify-between items-center text-zinc-400 border-b border-zinc-800 pb-1">
                            <span className="font-bold text-cyan-400">{docItem.source || docItem.metadata?.source || "Source Document"}</span>
                            <span className="font-mono text-[10px]">Score: {docItem.score !== undefined ? docItem.score : "N/A"}</span>
                          </div>
                          <p className="text-zinc-300 leading-relaxed font-sans">{docItem.content || docItem.page_content || docItem.text || ""}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 font-sans">No source documents recorded for this report.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "confidence" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/5 bg-slate-900/40 p-5 shadow-inner">
                  <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4">
                    Report Confidence Metrics
                  </h3>
                  <div className="flex flex-col gap-3 text-xs font-mono">
                    <div className="flex justify-between border-b border-zinc-800 pb-1">
                      <span>Factual Accuracy Score:</span>
                      <span className="font-bold text-white">
                        {`${Math.round(scoreVal * 100)}%`}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-800 pb-1">
                      <span>Compliance Assessment Risk Level:</span>
                      <span className={`font-bold uppercase ${riskVal === "LOW" ? "text-emerald-400" : "text-rose-500"}`}>
                        {riskVal}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-6 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <FileText className="w-6 h-6 text-cyan-400" />
          My Saved Reports
        </h1>
        <p className="text-sm text-zinc-400 mt-2">
          View, search, and manage your generated executive intelligence briefings.
        </p>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input 
          type="text" 
          placeholder="Search reports by title or query..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
          <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">No Reports Found</h3>
          <p className="text-zinc-500 text-sm mt-1">Generate a new executive briefing in the Command Center.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => {
            const riskLevel = report.confidenceAnalysis?.risk_level || "UNKNOWN";
            const score = report.confidenceAnalysis?.factual_accuracy_score ?? report.confidenceMetrics?.factual_accuracy_score ?? 0.0;
            return (
              <div 
                key={report.id} 
                className="bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 rounded-xl p-5 cursor-pointer transition-colors group flex flex-col h-full"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-zinc-200 text-sm line-clamp-2 pr-4">{report.reportTitle}</h3>
                  <button 
                    onClick={(e) => handleDelete(e, report.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-xs text-zinc-500 line-clamp-2 mb-4 flex-1">
                  Query: {report.query}
                </p>

                <div className="flex items-center justify-between border-t border-zinc-800 pt-3 mt-auto">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(report.createdAt).toLocaleDateString()}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-cyan-400">
                      {Math.round(score * 100)}% CONF
                    </div>
                    {riskLevel === "CRITICAL" || riskLevel === "HIGH" ? (
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
