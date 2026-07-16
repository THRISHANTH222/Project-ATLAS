"use client";

import Link from "next/link";
import { ArrowRight, Play, CheckCircle, Sparkles, Activity } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-36 overflow-hidden bg-[#FAF9F6] border-b-3 border-black">
      {/* Decorative large neo-brutalist shapes */}
      <div className="absolute top-10 right-10 w-48 h-48 bg-purple-200 border-2 border-black rounded-3xl rotate-12 shadow-[4px_4px_0px_#000000] pointer-events-none hidden lg:block opacity-60" />
      <div className="absolute bottom-10 left-10 w-36 h-36 bg-yellow-250 border-2 border-black rounded-full rotate-45 shadow-[4px_4px_0px_#000000] pointer-events-none hidden lg:block opacity-60" />

      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.06)_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto flex flex-col items-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-xl border-2 border-black bg-yellow-200 text-xs text-black font-black uppercase tracking-wide mb-8 shadow-[2px_2px_0px_#000000]">
            <Sparkles className="w-4 h-4 text-black stroke-[2.5px]" />
            <span>Introducing Atlas Brain v2.0</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-black tracking-tight mb-8 uppercase leading-[1.05]">
            <span className="block">Synthesize Your</span>
            <span className="block bg-purple-300 border-3 border-black px-6 py-2 inline-block rotate-[-2deg] my-3 shadow-[6px_6px_0px_#000000] tracking-wide text-black text-3xl sm:text-5xl lg:text-6xl font-black">
              Company Brain
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-slate-800 font-extrabold max-w-2xl mb-10 leading-relaxed">
            Project Atlas aggregates your files, wikis, and integrations into a single, real-time semantic knowledge graph. Empowers your team to search, synthesize, and deploy AI agents in seconds.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto mb-16">
            <Link
              href="/signup"
              className="flex items-center justify-center space-x-2 w-full sm:w-auto px-8 py-4 rounded-xl bg-purple-300 hover:bg-purple-400 border-2 border-black text-black text-base font-black shadow-[4px_4px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000000] transition-all cursor-pointer uppercase"
            >
              <span>Build Your Brain Free</span>
              <ArrowRight className="h-5 w-5 text-black stroke-[3px]" />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center justify-center space-x-2 w-full sm:w-auto px-8 py-4 rounded-xl border-2 border-black bg-white hover:bg-slate-100 text-black text-base font-black shadow-[4px_4px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000000] transition-all cursor-pointer uppercase"
            >
              <Play className="h-4.5 w-4.5 text-black fill-black" />
              <span>Explore Platform</span>
            </a>
          </div>

          {/* Social Proof */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs font-black text-black tracking-wider uppercase mb-16">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-black bg-white"><CheckCircle className="w-4 h-4 text-black stroke-[3px]" /> GDG Approved</span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-black bg-white"><CheckCircle className="w-4 h-4 text-black stroke-[3px]" /> Vector Indexed</span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-black bg-white"><CheckCircle className="w-4 h-4 text-black stroke-[3px]" /> SOC2 Certified</span>
          </div>
        </div>

        {/* Premium Dashboard Mockup Graphic in Neo-Brutalism */}
        <div className="relative max-w-5xl mx-auto rounded-2xl border-3 border-black bg-white p-3 sm:p-5 shadow-[8px_8px_0px_#000000]">
          
          {/* Inner Panel Header */}
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-5 px-2">
            <div className="flex space-x-2">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border border-black block shadow-[1px_1px_0px_#000000]" />
              <span className="w-3.5 h-3.5 rounded-full bg-amber-450 border border-black block shadow-[1px_1px_0px_#000000]" />
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-black block shadow-[1px_1px_0px_#000000]" />
            </div>
            <div className="px-3.5 py-1 rounded-lg bg-yellow-200 border-2 border-black flex items-center space-x-2 shadow-[2px_2px_0px_#000000]">
              <span className="w-2 h-2 rounded-full bg-black block animate-ping" />
              <span className="text-[10px] font-mono font-bold text-black uppercase tracking-widest">atlas-brain-01.local</span>
            </div>
            <div className="w-12 h-3" />
          </div>

          {/* Mockup Dashboard Content */}
          <div className="rounded-xl bg-[#FAF9F6] p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-2 border-black relative">
            {/* Grid background overlay inside mockup */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.04)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            {/* Column 1: Connected Sources */}
            <div className="rounded-xl border-2 border-black bg-white p-5 flex flex-col justify-between shadow-[4px_4px_0px_#000000] relative z-10">
              <div>
                <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-200">
                  <h3 className="text-sm font-black text-black uppercase tracking-wider">Active Pipelines</h3>
                  <span className="px-2 py-0.5 rounded border border-black bg-emerald-400 font-mono text-[9px] font-bold text-black shadow-[1px_1px_0px_#000000]">LIVE</span>
                </div>
                <div className="space-y-3">
                  {[
                    { name: "Notion Workspace", docs: 142, color: "bg-purple-200" },
                    { name: "GitHub Repository", docs: 954, color: "bg-blue-200" },
                    { name: "Google Drive folder", docs: 310, color: "bg-yellow-200" },
                    { name: "Slack Chats archive", docs: 18000, color: "bg-pink-200" },
                  ].map((source, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-black shadow-[1.5px_1.5px_0px_#000000]">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full border border-black ${source.color}`} />
                        <span className="text-xs font-extrabold text-black">{source.name}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-500">{source.docs} docs</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-black flex items-center justify-between">
                <span className="text-[11px] text-black font-extrabold">Sync Interval</span>
                <span className="text-[11px] font-mono font-bold bg-yellow-200 border border-black px-1.5 py-0.5 rounded shadow-[1px_1px_0px_#000000]">5 min</span>
              </div>
            </div>

            {/* Column 2: Vector Status / AI Core */}
            <div className="rounded-xl border-2 border-black bg-white p-5 flex flex-col justify-between md:col-span-2 shadow-[4px_4px_0px_#000000] relative z-10">
              <div>
                <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4.5 h-4.5 text-black stroke-[2.5px]" />
                    <h3 className="text-sm font-black text-black uppercase tracking-wider">Brain Index Activity</h3>
                  </div>
                  <span className="font-mono text-xs text-black font-black bg-purple-300 border border-black px-2 py-0.5 rounded shadow-[1.5px_1.5px_0px_#000000]">19,406 vectors</span>
                </div>

                {/* Graph mockup in Neo-Brutalism */}
                <div className="h-32 flex items-end justify-between gap-1.5 px-3 bg-white border-2 border-black rounded-lg p-3 mb-4 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)]">
                  {[20, 45, 30, 80, 55, 90, 60, 40, 75, 95, 45, 60, 85, 100, 70, 50, 90].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                      <div
                        className="w-full rounded-t-sm border-t border-x border-black bg-purple-300 hover:bg-yellow-250 transition-colors cursor-pointer"
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#FAF9F6] border-2 border-black p-2.5 rounded-lg shadow-[2px_2px_0px_#000000]">
                    <span className="text-[10px] text-slate-500 font-extrabold block">SEMANTIC RECALL</span>
                    <span className="text-sm font-mono font-black text-black">99.84%</span>
                  </div>
                  <div className="bg-[#FAF9F6] border-2 border-black p-2.5 rounded-lg shadow-[2px_2px_0px_#000000]">
                    <span className="text-[10px] text-slate-500 font-extrabold block">SYNC LATENCY</span>
                    <span className="text-sm font-mono font-black text-black">142ms</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-black flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-450 border border-black animate-pulse" />
                  <span className="text-xs text-black font-extrabold">Atlas AI Core: Online</span>
                </div>
                <Link
                  href="/dashboard"
                  className="text-xs text-black hover:text-purple-650 font-black flex items-center gap-1 transition-colors uppercase tracking-wider underline underline-offset-4"
                >
                  Open Dashboard &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
