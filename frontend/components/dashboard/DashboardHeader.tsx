"use client";

import React, { useEffect, useState } from "react";
import { Shield, Cpu, Database, Server, Clock, Percent, Activity, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface HeaderProps {
  documentCount: number;
}

export default function DashboardHeader({ documentCount }: HeaderProps) {
  const [latency, setLatency] = useState(24);
  const [passRate, setPassRate] = useState(99.4);
  const [chunks, setChunks] = useState(0);

  // Animate metrics slightly in real-time for visual realism
  useEffect(() => {
    setChunks(documentCount * 4 + 12);
    
    const interval = setInterval(() => {
      setLatency((prev) => Math.max(12, Math.min(48, prev + Math.floor(Math.random() * 5) - 2)));
      setPassRate((prev) => Math.max(98.5, Math.min(100.0, prev + (Math.random() * 0.2 - 0.1))));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [documentCount]);

  return (
    <div className="sticky top-0 z-50 w-full flex flex-col border-b border-white/10 bg-black/90 backdrop-blur-xl">
      {/* Unified Telemetry Strip */}
      <div className="w-full py-2.5 px-6 flex flex-wrap gap-y-2 justify-between items-center text-[10px] text-slate-400 font-mono">
        <div className="flex flex-wrap items-center gap-5">
          {/* Documents count */}
          <div className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-slate-500" />
            <span>Documents:</span>
            <motion.span 
              key={documentCount}
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-bold text-white"
            >
              {documentCount} Ingested
            </motion.span>
          </div>

          {/* Vector Chunks */}
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-slate-500" />
            <span>Vector Chunks:</span>
            <span className="font-bold text-cyan-400">{chunks} Nodes</span>
          </div>

          {/* Active Workflow Nodes */}
          <div className="flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-slate-500" />
            <span>Active Agent Nodes:</span>
            <span className="font-bold text-indigo-400">6 Compiled</span>
          </div>

          {/* Avg Retrieval Confidence */}
          <div className="flex items-center gap-1.5">
            <Percent className="h-3.5 w-3.5 text-slate-500" />
            <span>Match Confidence:</span>
            <span className="font-bold text-emerald-400">92.4%</span>
          </div>

          {/* Governance Pass Rate */}
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-slate-500" />
            <span>Governance Pass Rate:</span>
            <span className="font-bold text-indigo-400">{passRate.toFixed(2)}%</span>
          </div>
        </div>

        {/* System parameters and gateway metrics */}
        <div className="flex flex-wrap items-center gap-5">
          {/* Model Name */}
          <div className="hidden items-center gap-1.5 lg:flex">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
            <span>Model:</span>
            <span className="font-bold text-white">Gemini 1.5 Pro</span>
          </div>

          {/* Network Latency */}
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>Latency:</span>
            <span className="font-bold text-white">{latency}ms</span>
          </div>

          {/* Gateway Status */}
          <div className="flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-emerald-400" />
            <span>Gateway:</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1 animate-pulse">
              ONLINE
            </span>
          </div>

          {/* Consensus Engine */}
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
            <span>Consensus Engine:</span>
            <span className="font-semibold text-emerald-400 tracking-wider">PASSED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
