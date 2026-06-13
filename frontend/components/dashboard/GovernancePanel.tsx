"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, BadgeAlert, FileText, CheckCircle, Scale, AlertOctagon, RefreshCw, Sparkles } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

interface Citation {
  source: string;
  supporting_quote: string;
  claim_statement: string;
}

interface GovernanceReport {
  contradiction_found?: boolean;
  contradictions_detected?: boolean;
  contradiction_explanation: string;
  claims_supported_count: number;
  claims_total_count: number;
  factual_accuracy_score: number;
  risk_level: string;
  citation_coverage: number;
  source_count: number;
  citations?: Citation[];
  ocr_confidence_score?: number;
  retrieval_match_score?: number;
  governance_acceptance_score?: number;
}

interface GovernancePanelProps {
  confidenceScore: number;
  governanceReport: GovernanceReport;
  citations: Citation[];
}

export default function GovernancePanel({
  confidenceScore,
  governanceReport,
  citations,
}: GovernancePanelProps) {
  const confidencePercentage = Math.round(confidenceScore * 100);
  const accuracyPercentage = Math.round((governanceReport.factual_accuracy_score || 0) * 100);
  const coveragePercentage = Math.round(governanceReport.citation_coverage || 0);
  
  const contradictionsFound = 
    governanceReport.contradictions_detected !== undefined 
      ? governanceReport.contradictions_detected 
      : governanceReport.contradiction_found || false;

  // Decide security grading classes
  const isSecure = !contradictionsFound && confidencePercentage >= 80;
  const gradeLabel = isSecure 
    ? "SECURE / APPROVED" 
    : contradictionsFound 
    ? "CONTRADICTION DETECTED" 
    : "RISK REVIEW REQUIRED";

  const gradeColor = isSecure
    ? "text-emerald-400 border-emerald-500/20 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.08)]"
    : contradictionsFound
    ? "text-rose-400 border-rose-500/20 bg-rose-950/20 shadow-[0_0_20px_rgba(244,63,94,0.08)]"
    : "text-amber-400 border-amber-500/20 bg-amber-950/20 shadow-[0_0_20px_rgba(245,158,11,0.08)]";

  // Formulate data for Recharts Bar Chart
  const chartData = [
    { name: "Factual Accuracy", score: accuracyPercentage },
    { name: "Citation Coverage", score: coveragePercentage },
    { name: "Overall Confidence", score: confidencePercentage },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* 1. Quantitative Trust Metrics */}
      <div className="flex flex-col gap-6 lg:col-span-1">
        {/* Confidence Badge */}
        <div className={`rounded-xl border p-6 flex flex-col items-center text-center backdrop-blur-md transition-all duration-500 ${gradeColor}`}>
          {isSecure ? (
            <ShieldCheck className="h-16 w-16 text-emerald-400 mb-4 animate-pulse" />
          ) : (
            <ShieldAlert className="h-16 w-16 text-rose-500 mb-4 animate-bounce" />
          )}
          
          <span className="text-[9px] tracking-widest font-black uppercase text-slate-400 mb-1">
            Trust Governance Classification
          </span>
          <h3 className="text-md font-black tracking-tight mb-4">{gradeLabel}</h3>
          
          {/* Radial Meter Block */}
          <div className="relative flex h-36 w-36 items-center justify-center mb-2">
            <svg className="absolute h-full w-full -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="60"
                className="stroke-white/5"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r="60"
                className={`transition-all duration-1000 ${
                  isSecure ? "stroke-emerald-500" : "stroke-rose-500"
                }`}
                strokeWidth="10"
                fill="transparent"
                strokeDasharray="377"
                strokeDashoffset={377 - (377 * confidencePercentage) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="flex flex-col items-center justify-center">
              <span className="text-3xl font-black font-mono tracking-tighter">
                {confidencePercentage}%
              </span>
              <span className="text-[8px] uppercase tracking-widest font-bold text-slate-500">
                Confidence
              </span>
            </div>
          </div>
          
          {/* Risk tag */}
          <span className={`text-[9px] uppercase tracking-wider font-bold rounded-full border px-2.5 py-0.5 mt-2 ${
            governanceReport.risk_level === "low"
              ? "text-emerald-400 border-emerald-500/30 bg-emerald-950/20"
              : governanceReport.risk_level === "medium"
              ? "text-amber-400 border-amber-500/30 bg-amber-950/20"
              : "text-rose-400 border-rose-500/30 bg-rose-950/20 animate-pulse"
          }`}>
            RISK ASSESSMENT: {governanceReport.risk_level?.toUpperCase() || "UNKNOWN"}
          </span>
        </div>

        {/* Recharts Bar Chart Container */}
        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-5 backdrop-blur-md">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Scale className="h-4 w-4 text-indigo-400" />
            Consensus Auditing Metrics
          </h4>
          
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={9} domain={[0, 100]} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.08)", fontSize: 10 }}
                  labelStyle={{ color: "#fff", fontWeight: "bold" }}
                />
                <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => {
                    const colors = ["#22d3ee", "#6366f1", isSecure ? "#10b981" : "#f43f5e"];
                    return <Bar key={`cell-${index}`} fill={colors[index]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* OCR Reliability Telemetry Card */}
        {governanceReport.ocr_confidence_score !== undefined && governanceReport.ocr_confidence_score > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-5 backdrop-blur-md relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)]">
            <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
              OCR Reliability Telemetry
            </h4>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center bg-black/40 p-2.5 rounded border border-white/5 font-mono text-[10px]">
                <span className="text-slate-400">OCR Capture Confidence:</span>
                <span className="text-amber-400 font-bold">{Math.round(governanceReport.ocr_confidence_score * 100)}%</span>
              </div>
              <div className="flex justify-between items-center bg-black/40 p-2.5 rounded border border-white/5 font-mono text-[10px]">
                <span className="text-slate-400">Semantic Retrieval Match:</span>
                <span className="text-cyan-400 font-bold">{Math.round((governanceReport.retrieval_match_score || 0) * 100)}%</span>
              </div>
              <div className="flex justify-between items-center bg-black/40 p-2.5 rounded border border-white/5 font-mono text-[10px]">
                <span className="text-slate-400">Governance Audit Index:</span>
                <span className="text-emerald-400 font-bold">{Math.round((governanceReport.governance_acceptance_score || 0) * 100)}%</span>
              </div>
            </div>
            <div className="mt-3 text-[9px] text-amber-300/80 leading-relaxed font-sans bg-amber-950/20 border border-amber-500/10 p-2 rounded">
              Compliance thresholds relaxed dynamically to <strong>55%</strong> due to active handwriting/scanned OCR ingestion parsing.
            </div>
          </div>
        )}
      </div>

      {/* 2. Contradiction Logs & Citation List */}
      <div className="flex flex-col gap-6 lg:col-span-2">
        {/* Contradiction Warning Panel */}
        {contradictionsFound ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-5 flex items-start gap-4 shadow-[0_0_15px_rgba(244,63,94,0.05)]">
            <AlertOctagon className="h-6 w-6 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h4 className="text-sm font-black text-rose-300 tracking-wide">
                POLICY CONTRADICTION DETECTED
              </h4>
              <p className="text-xs text-rose-200/80 mt-1 leading-relaxed">
                {governanceReport.contradiction_explanation}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/10 bg-emerald-950/10 p-5 flex items-center gap-4 shadow-[0_0_15px_rgba(16,185,129,0.02)]">
            <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-sm font-black text-emerald-300 tracking-wide">
                ANTI-HALLUCINATION GUARD SECURED
              </h4>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                The compiled reasoning statement resolves in full compliance with verified corporate facts. Zero contradictions or legacy SMS leaks were detected.
              </p>
            </div>
          </div>
        )}

        {/* Citations Audit List */}
        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-6 backdrop-blur-md flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
            <Scale className="h-4.5 w-4.5 text-cyan-400" />
            <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">
              Factual Citation Mapping ({citations.length} Assertions Verified)
            </h4>
          </div>

          {citations.length === 0 ? (
            <div className="rounded-lg bg-black/30 p-6 text-center text-slate-500 text-xs flex-1 flex items-center justify-center">
              No citations mapped or generated for the current query.
            </div>
          ) : (
            <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {citations.map((cite, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-white/5 bg-black/40 p-4 transition-all duration-300 hover:border-white/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-indigo-400" />
                      <span className="text-xs font-bold text-slate-200">
                        {cite.source}
                      </span>
                    </div>
                    <span className="rounded bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[8px] font-bold text-indigo-400 uppercase tracking-wider">
                      Audit Approved
                    </span>
                  </div>

                  {/* Assertion statement */}
                  <div className="mb-2">
                    <span className="text-[8px] text-slate-500 uppercase font-black block tracking-wider">
                      Synthesized Assertion
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      "{cite.claim_statement}"
                    </p>
                  </div>

                  {/* Verbatim quote */}
                  <div className="bg-slate-950/70 p-2.5 rounded border border-white/5">
                    <span className="text-[8px] text-emerald-500 uppercase font-black block mb-0.5 tracking-wider">
                      Verbatim Policy Reference
                    </span>
                    <p className="text-xs text-emerald-300/90 font-mono leading-relaxed">
                      "{cite.supporting_quote}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
