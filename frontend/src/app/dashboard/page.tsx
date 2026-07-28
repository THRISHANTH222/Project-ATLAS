"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { onAuthStateChange, UserProfile } from "@/lib/firebase";
import { fetchDocumentsApi } from "@/lib/api";
import { DocumentItem, ActivityItem } from "@/lib/mockData";
import { 
  Plus, 
  MessageSquare, 
  Database, 
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle,
  HelpCircle
} from "lucide-react";

export default function DashboardOverview() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const liveDocs = await fetchDocumentsApi();
        setDocuments(liveDocs);
      }
    });

    const loadBackendData = async () => {
      const liveDocs = await fetchDocumentsApi();
      setDocuments(liveDocs);
    };

    loadBackendData();

    return () => unsubscribe();
  }, []);

  const totalVectors = documents.reduce((sum, doc) => sum + doc.vectorCount, 0);

  return (
    <div className="flex-1 flex flex-col min-w-0 font-sans text-black dark:text-white">
      
      {/* Page Header */}
      <header className="h-20 border-b-2 border-black dark:border-white px-6 sm:px-8 flex items-center justify-between bg-white dark:bg-[#1C1C1E] transition-colors">
        <div>
          <h1 className="text-base font-black uppercase tracking-wider text-black dark:text-white">
            Workspace Hub
          </h1>
          <p className="text-[10px] text-slate-800 dark:text-slate-400 font-extrabold">
            Overview statistics and shortcuts for {user?.displayName || "Admin"}.
          </p>
        </div>
        <div className="px-3.5 py-1 rounded-lg bg-yellow-200 dark:bg-yellow-600 border-2 border-black dark:border-white text-[9px] font-mono font-black text-black dark:text-white shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]">
          Node: <span className="underline">atlas-node-east-01</span>
        </div>
      </header>

      {/* Main Container */}
      <div className="p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
        
        {/* Top greeting notification */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1E] border-2 border-black dark:border-white shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#FFFFFF] flex items-center justify-between">
          <div className="space-y-1 pr-4">
            <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-wide">Welcome to Project Atlas, {user?.displayName || "Workspace Owner"}!</h2>
            <p className="text-xs text-slate-800 dark:text-slate-400 font-extrabold">Your Company Brain is synced and active. Ready to ingest documents and run prompt semantic retrievals.</p>
          </div>
          <Link
            href="/dashboard/chat"
            className="hidden sm:flex items-center space-x-1.5 px-4.5 py-2.5 text-xs font-black text-black dark:text-white bg-purple-300 dark:bg-purple-650 border-2 border-black dark:border-white hover:bg-purple-400 dark:hover:bg-purple-700 rounded-xl shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000000] dark:hover:shadow-[2px_2px_0px_#FFFFFF] transition-all cursor-pointer whitespace-nowrap uppercase tracking-wider"
          >
            <span>Ask AI Brain</span>
            <ArrowRight className="w-3.5 h-3.5 text-black dark:text-white stroke-[3px]" />
          </Link>
        </div>

        {/* 1. Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Connected Sources",
              value: documents.length,
              desc: "Files, sites and wikis",
              icon: <Database className="w-5 h-5 text-black dark:text-white stroke-[2.5px]" />,
              color: "bg-purple-200 dark:bg-purple-950/30"
            },
            {
              title: "Brain Vectors",
              value: totalVectors.toLocaleString(),
              desc: "Deep embedding size",
              icon: <TrendingUp className="w-5 h-5 text-black dark:text-white stroke-[2.5px]" />,
              color: "bg-blue-200 dark:bg-blue-950/30"
            },
            {
              title: "Retrieval Recall",
              value: "99.84%",
              desc: "Semantic lookup recall",
              icon: <Activity className="w-5 h-5 text-black dark:text-white stroke-[2.5px]" />,
              color: "bg-pink-200 dark:bg-pink-950/30"
            },
            {
              title: "System Status",
              value: "ONLINE",
              desc: "All systems operational",
              icon: <CheckCircle className="w-5 h-5 text-black dark:text-white stroke-[2.5px]" />,
              color: "bg-emerald-250 dark:bg-emerald-950/30"
            }
          ].map((metric, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white dark:bg-[#1C1C1E] border-2 border-black dark:border-white shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#FFFFFF] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">{metric.title}</span>
                <span className="text-2xl font-black text-black dark:text-white block mb-0.5 tracking-tight">{metric.value}</span>
                <span className="text-[10px] text-slate-800 dark:text-slate-400 font-extrabold">{metric.desc}</span>
              </div>
              <div className={`h-11 w-11 rounded-xl border-2 border-black dark:border-white flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] ${metric.color}`}>
                {metric.icon}
              </div>
            </div>
          ))}
        </div>

        {/* 2. Shortcuts Panel Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Brain Manager */}
          <div className="rounded-2xl border-2 border-black dark:border-white bg-white dark:bg-[#1C1C1E] p-6 flex flex-col justify-between shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#FFFFFF] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[2.5px_2.5px_0px_#000000] dark:shadow-[2.5px_2.5px_0px_#FFFFFF] transition-all">
            <div>
              <div className="h-12 w-12 rounded-xl bg-purple-200 dark:bg-purple-950/30 border-2 border-black dark:border-white flex items-center justify-center mb-6 shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]">
                <Database className="w-5 h-5 text-black dark:text-white stroke-[2.5px]" />
              </div>
              <h3 className="text-sm font-black text-black dark:text-white uppercase tracking-wider mb-2">Company Brain Manager</h3>
              <p className="text-xs text-slate-850 dark:text-slate-400 font-bold leading-relaxed mb-6">
                Connect and manage Notion databases, local documents, Google drive folders, or GitHub repository pipelines. Track indexing operations and trigger manual vector syncs.
              </p>
            </div>
            <Link
              href="/dashboard/brain"
              className="flex items-center justify-center space-x-2 w-full py-3 rounded-xl bg-white dark:bg-[#242427] border-2 border-black dark:border-white hover:bg-slate-100 dark:hover:bg-[#2D2D32] text-xs font-black text-black dark:text-white shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] transition-all uppercase tracking-wider"
            >
              <span>Manage Knowledge Bases</span>
              <ArrowRight className="w-4 h-4 text-black dark:text-white stroke-[3px]" />
            </Link>
          </div>

          {/* Card 2: AI Chat Portal */}
          <div className="rounded-2xl border-2 border-black dark:border-white bg-white dark:bg-[#1C1C1E] p-6 flex flex-col justify-between shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#FFFFFF] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[2.5px_2.5px_0px_#000000] dark:shadow-[2.5px_2.5px_0px_#FFFFFF] transition-all">
            <div>
              <div className="h-12 w-12 rounded-xl bg-yellow-200 dark:bg-yellow-950/30 border-2 border-black dark:border-white flex items-center justify-center mb-6 shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]">
                <MessageSquare className="w-5 h-5 text-black dark:text-white stroke-[2.5px]" />
              </div>
              <h3 className="text-sm font-black text-black dark:text-white uppercase tracking-wider mb-2">Semantic AI Chat</h3>
              <p className="text-xs text-slate-850 dark:text-slate-400 font-bold leading-relaxed mb-6">
                Interact with the aggregated Company Brain in real-time. Ask technical questions, write strategy outlines, summarize documentation, or debug service architectures.
              </p>
            </div>
            <Link
              href="/dashboard/chat"
              className="flex items-center justify-center space-x-2 w-full py-3 rounded-xl bg-purple-300 dark:bg-purple-650 hover:bg-purple-400 dark:hover:bg-purple-600 border-2 border-black dark:border-white text-xs font-black text-black dark:text-white shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] transition-all uppercase tracking-wider"
            >
              <span>Launch Conversational Chat</span>
              <ArrowRight className="w-4 h-4 text-black dark:text-white stroke-[3px]" />
            </Link>
          </div>
        </div>

        {/* 3. Recent Activity Listing */}
        <div className="rounded-2xl border-2 border-black dark:border-white bg-white dark:bg-[#1C1C1E] p-6 space-y-6 shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#FFFFFF]">
          <div className="flex items-center justify-between border-b border-black dark:border-white pb-4">
            <div>
              <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-wider">Recent Activities</h2>
              <p className="text-[10px] text-slate-800 dark:text-slate-400 font-extrabold">Real-time audit trails of your workspace operations.</p>
            </div>
            <Link
              href="/dashboard/brain"
              className="text-xs font-black text-purple-650 dark:text-purple-450 hover:text-purple-700 underline underline-offset-4 decoration-2 uppercase tracking-wide"
            >
              Configure sources
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activities.slice(0, 4).map((act) => (
              <div key={act.id} className="p-4 rounded-xl bg-[#FAF9F6] dark:bg-[#18181A] border-2 border-black dark:border-white flex items-start space-x-3 shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]">
                <div className="mt-0.5 text-black dark:text-white">
                  {act.type === "upload" && <Plus className="w-4.5 h-4.5 stroke-[3px]" />}
                  {act.type === "sync" && <TrendingUp className="w-4.5 h-4.5 stroke-[3px]" />}
                  {act.type === "auth" && <CheckCircle className="w-4.5 h-4.5 stroke-[3px]" />}
                  {act.type === "delete" && <HelpCircle className="w-4.5 h-4.5 stroke-[3px]" />}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-black text-black dark:text-white truncate">{act.description}</p>
                  <div className="flex items-center space-x-2 mt-1.5 text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <span>{act.user}</span>
                    <span>&bull;</span>
                    <span>{act.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
