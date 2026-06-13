"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Database, Layers, Brain, ShieldAlert, CheckCircle, Clock, Zap } from "lucide-react";

interface TimelineStep {
  name: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface OrchestrationTimelineProps {
  currentStep: string;
  executionTrace: Array<{
    node: string;
    latency_sec?: number;
    description?: string;
    output_summary?: string;
  }>;
  nodeLatencies?: Record<string, number>;
  isRunning: boolean;
}

const STEPS: TimelineStep[] = [
  { name: "understand_query", label: "Query Expansion", icon: Search },
  { name: "retrieve_documents", label: "ChromaDB Search", icon: Database },
  { name: "process_knowledge", label: "Context Compress", icon: Layers },
  { name: "reasoning", label: "Deep Reasoning", icon: Brain },
  { name: "governance", label: "Compliance Audit", icon: ShieldAlert },
  { name: "generate_response", label: "Report Synthesis", icon: CheckCircle },
];

export default function OrchestrationTimeline({
  currentStep,
  executionTrace,
  nodeLatencies = {},
  isRunning,
}: OrchestrationTimelineProps) {
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const [startTimestamp, setStartTimestamp] = useState<string | null>(null);
  const [endTimestamp, setEndTimestamp] = useState<string | null>(null);

  // Compute total duration and timestamps
  useEffect(() => {
    if (isRunning) {
      const now = new Date();
      setStartTimestamp(now.toLocaleTimeString());
      setEndTimestamp(null);
      setTotalDuration(null);
    } else if (executionTrace.length > 0) {
      // Completed or failed
      const sum = Object.values(nodeLatencies).reduce((a, b) => a + b, 0);
      setTotalDuration(round(sum, 2));
      
      const now = new Date();
      setEndTimestamp(now.toLocaleTimeString());
    }
  }, [isRunning, executionTrace, nodeLatencies]);

  const round = (num: number, dec: number) => {
    return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
  };

  const getStepStatus = (stepName: string, index: number) => {
    const matchingNodeNameMap: Record<string, string> = {
      understand_query: "Understand Query",
      retrieve_documents: "Retrieve Documents",
      process_knowledge: "Process Knowledge",
      reasoning: "Contextual Reasoning",
      governance: "Governance Guard",
      generate_response: "Final Response Synthesis",
    };
    
    const nodeLabel = matchingNodeNameMap[stepName];
    const isCompleted = executionTrace.some((t) => t.node === nodeLabel);
    
    if (isCompleted) return "completed";
    
    const stepNames = STEPS.map((s) => s.name);
    const currentIndex = stepNames.indexOf(currentStep);
    
    if (isRunning && index === currentIndex) return "running";
    return "idle";
  };

  return (
    <div className="rounded-xl border border-white/5 bg-slate-950/40 p-6 backdrop-blur-md relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
      {/* Visual neon ambient background */}
      <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-cyan-500/2 blur-[80px] pointer-events-none" />

      {/* Header controls & Timestamps */}
      <div className="mb-6 flex flex-col justify-between gap-2 border-b border-white/5 pb-4 sm:flex-row sm:items-center sm:gap-0">
        <div>
          <h2 className="text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            Consensus Orchestration Gateway
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Cinematic node-level compilation timers. Multi-agent state compliance mapping active.
          </p>
        </div>
        
        {/* Dynamic Timings Box */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
          {startTimestamp && (
            <div className="rounded bg-black/40 border border-white/5 px-2 py-1">
              <span>START: </span>
              <span className="text-slate-300 font-bold">{startTimestamp}</span>
            </div>
          )}
          
          {endTimestamp && (
            <div className="rounded bg-black/40 border border-white/5 px-2 py-1">
              <span>END: </span>
              <span className="text-slate-300 font-bold">{endTimestamp}</span>
            </div>
          )}

          {totalDuration !== null && (
            <div className="rounded border border-cyan-500/20 bg-cyan-950/20 px-2 py-1 text-cyan-400 font-bold flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>TOTAL: {totalDuration}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Steps Pipeline Container */}
      <div className="relative flex flex-col items-stretch justify-between gap-6 md:flex-row md:items-center md:gap-0 mt-4 px-2">
        
        {/* Cinematic horizontal connection path (desktop) */}
        <div className="absolute top-[28px] left-[5%] right-[5%] hidden h-[2px] bg-white/5 md:block" />
        
        {/* Glowing animated line during active execution */}
        {isRunning && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 5, ease: "easeInOut" }}
            className="absolute top-[28px] left-[5%] right-[5%] hidden h-[2px] bg-gradient-to-r from-cyan-500 via-indigo-500 to-transparent origin-left md:block shadow-[0_0_8px_rgba(6,182,212,0.5)]"
          />
        )}

        {STEPS.map((step, index) => {
          const status = getStepStatus(step.name, index);
          const Icon = step.icon;
          
          // Get Latency
          const latencyKeyMap: Record<string, string> = {
            understand_query: "understand_query",
            retrieve_documents: "retrieve_documents",
            process_knowledge: "process_knowledge",
            reasoning: "reasoning",
            governance: "governance",
            generate_response: "generate_response",
          };
          const latency = nodeLatencies[latencyKeyMap[step.name]];

          return (
            <div
              key={step.name}
              className="relative z-10 flex flex-1 flex-row items-center gap-4 md:flex-col md:gap-2.5"
            >
              {/* Circle Graphic Container */}
              <div className="relative flex h-14 w-14 items-center justify-center">
                {status === "completed" && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 rounded-full bg-emerald-500/5 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]"
                  />
                )}
                {status === "running" && (
                  <motion.div
                    animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 rounded-full bg-cyan-500/20 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  />
                )}
                
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300 relative ${
                    status === "completed"
                      ? "border-emerald-500 bg-slate-900 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                      : status === "running"
                      ? "border-cyan-400 bg-cyan-950 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.3)] animate-pulse"
                      : "border-white/10 bg-slate-900 text-slate-500"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  
                  {/* Status tiny corner dot */}
                  {status === "completed" && (
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-emerald-500 border border-black rounded-full flex items-center justify-center text-[7px] text-black font-black">
                      ✓
                    </span>
                  )}
                  {status === "running" && (
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-cyan-500 border border-black rounded-full animate-ping" />
                  )}
                </div>
              </div>

              {/* Step info block */}
              <div className="flex flex-col md:items-center text-left md:text-center">
                <span
                  className={`text-xs font-bold tracking-tight ${
                    status === "completed"
                      ? "text-slate-200"
                      : status === "running"
                      ? "text-cyan-400"
                      : "text-slate-500"
                  }`}
                >
                  {step.label}
                </span>
                
                {/* Node Latency tags */}
                {latency !== undefined ? (
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 border border-emerald-500/10 rounded mt-0.5">
                    {latency}s
                  </span>
                ) : status === "running" ? (
                  <span className="text-[9px] uppercase tracking-wider font-bold text-cyan-400 animate-pulse mt-0.5 bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-500/20">
                    running
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-600 mt-0.5">
                    queued
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
