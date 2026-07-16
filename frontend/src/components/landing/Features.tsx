"use client";

import { 
  Database, 
  Search, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  GitMerge 
} from "lucide-react";

export default function Features() {
  const featuresList = [
    {
      icon: <Database className="w-6 h-6 text-black stroke-[2.5px]" />,
      title: "Omnichannel Connectors",
      description: "Seamlessly ingest unstructured files, Slack archives, Notion pages, and database tables in a single click.",
      color: "bg-purple-200"
    },
    {
      icon: <Search className="w-6 h-6 text-black stroke-[2.5px]" />,
      title: "Semantic Vector Search",
      description: "Ask queries in natural language and get immediate context-aware responses rather than just keyword matches.",
      color: "bg-blue-200"
    },
    {
      icon: <Cpu className="w-6 h-6 text-black stroke-[2.5px]" />,
      title: "Self-Training Model",
      description: "Your Company Brain automatically refines itself whenever documents are updated or new chats occur.",
      color: "bg-pink-200"
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-black stroke-[2.5px]" />,
      title: "Enterprise Security",
      description: "Keep private data safe with SSO, field-level access control, and granular role permissions.",
      color: "bg-yellow-250"
    },
    {
      icon: <Zap className="w-6 h-6 text-black stroke-[2.5px]" />,
      title: "Ultra-Low Latency",
      description: "Retrieval and response compilation take less than 150ms, powered by our edge vector indices.",
      color: "bg-cyan-200"
    },
    {
      icon: <GitMerge className="w-6 h-6 text-black stroke-[2.5px]" />,
      title: "Flexible Integrations",
      description: "Inject your Company Brain into Slack Bots, custom websites, customer portals, or IDE plugins.",
      color: "bg-emerald-200"
    }
  ];

  return (
    <section id="features" className="py-24 bg-[#FAF9F6] border-b-3 border-black relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="inline-block px-4 py-1.5 rounded-lg border-2 border-black bg-purple-300 text-xs font-black text-black uppercase tracking-widest mb-4 shadow-[2px_2px_0px_#000000]">
            Features & Capabilities
          </h2>
          <p className="text-3xl sm:text-4xl font-black text-black tracking-tight uppercase">
            Designed for secure, distributed intelligence
          </p>
          <p className="mt-4 text-slate-800 font-extrabold text-base">
            Atlas works quietly in the background, transforming fragmented knowledge silos into a fast, unified intelligence layer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuresList.map((feature, i) => (
            <div
              key={i}
              className="group p-8 rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0px_#000000] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[2.5px_2.5px_0px_#000000] transition-all relative flex flex-col justify-between"
            >
              <div>
                <div className={`h-14 w-14 rounded-xl border-2 border-black flex items-center justify-center mb-6 shadow-[2px_2px_0px_#000000] ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-black text-black mb-3 group-hover:text-purple-650 transition-colors uppercase tracking-wide">
                  {feature.title}
                </h3>
                <p className="text-slate-800 text-xs font-semibold leading-relaxed">
                  {feature.description}
                </p>
              </div>

              <div className="mt-6 flex items-center text-xs font-black text-black uppercase underline underline-offset-4 decoration-purple-400">
                <span>Learn more &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
