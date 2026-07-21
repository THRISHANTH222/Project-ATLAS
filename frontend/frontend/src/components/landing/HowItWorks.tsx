"use client";

import { 
  Link2, 
  Binary, 
  MessageSquareShare, 
  ArrowRight,
  ChevronRight
} from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      num: "01",
      icon: <Link2 className="w-6 h-6 text-black stroke-[2.5px]" />,
      title: "Connect Knowledge Sources",
      description: "Link Notion workspaces, Google drives, Slack channels, or simply drag and drop PDF/txt documents into the workspace.",
      color: "bg-purple-200"
    },
    {
      num: "02",
      icon: <Binary className="w-6 h-6 text-black stroke-[2.5px]" />,
      title: "Real-time Vector Embedding",
      description: "Atlas segments, cleans, and translates text into hyper-dimensional vector embeddings, saving them in a secure database.",
      color: "bg-yellow-250"
    },
    {
      num: "03",
      icon: <MessageSquareShare className="w-6 h-6 text-black stroke-[2.5px]" />,
      title: "Query and Automate",
      description: "Use the semantic search portal to get immediate answers, summarize workspace findings, or deploy automated agents.",
      color: "bg-pink-200"
    }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#FAF9F6] border-b-3 border-black relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="inline-block px-4 py-1.5 rounded-lg border-2 border-black bg-yellow-200 text-xs font-black text-black uppercase tracking-widest mb-4 shadow-[2px_2px_0px_#000000]">
            Workflow Architecture
          </h2>
          <p className="text-3xl sm:text-4xl font-black text-black tracking-tight uppercase">
            How your Company Brain takes form
          </p>
          <p className="mt-4 text-slate-800 font-extrabold text-base">
            A three-step pipeline designed to securely index your company knowledge, making it searchable and actionable instantly.
          </p>
        </div>

        {/* Neo-Brutalist Pipeline Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative max-w-6xl mx-auto">
          {/* Connector Line for Desktop */}
          <div className="hidden lg:block absolute top-14 left-[15%] right-[15%] h-1 bg-black z-0 border border-black" />

          {steps.map((step, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center text-center group bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000000]">
              
              {/* Step Circle */}
              <div className="relative mb-6">
                <div className={`h-16 w-16 rounded-full border-2 border-black flex items-center justify-center relative shadow-[2.5px_2.5px_0px_#000000] ${step.color}`}>
                  {step.icon}
                  {/* Step Badge */}
                  <span className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-white border-2 border-black flex items-center justify-center text-xs font-black text-black shadow-[1px_1px_0px_#000000]">
                    {step.num}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-base font-black text-black mb-3 group-hover:text-purple-650 transition-colors uppercase tracking-wide">
                {step.title}
              </h3>
              <p className="text-slate-800 text-xs font-semibold leading-relaxed max-w-sm">
                {step.description}
              </p>
              
              {/* Chevron for mobile/tablet */}
              {i < 2 && (
                <div className="lg:hidden mt-8 text-black">
                  <ChevronRight className="w-6 h-6 rotate-90 transform stroke-[3px]" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Interactive sandbox box */}
        <div className="mt-20 p-8 rounded-2xl border-2 border-black bg-white max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 shadow-[6px_6px_0px_#000000]">
          <div className="max-w-md">
            <h4 className="text-base font-black text-black uppercase tracking-wider mb-2">Want to see the system in action?</h4>
            <p className="text-xs text-slate-850 font-semibold leading-relaxed">
              Experience the ingestion pipeline by creating a temporary workspace. Try pasting custom knowledge articles or indexing mock Notion directories directly.
            </p>
          </div>
          <a
            href="/signup"
            className="flex items-center space-x-2 px-6 py-3.5 rounded-xl border-2 border-black bg-yellow-200 hover:bg-yellow-300 text-black text-xs font-black shadow-[3px_3px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000000] transition-all cursor-pointer whitespace-nowrap uppercase tracking-wider"
          >
            <span>Start Ingestion Demo</span>
            <ArrowRight className="w-4.5 h-4.5 text-black stroke-[3px]" />
          </a>
        </div>
      </div>
    </section>
  );
}
