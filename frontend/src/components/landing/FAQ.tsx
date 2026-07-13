"use client";

import { useState } from "react";
import { ChevronDown, MessageSquare } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: "How does Project Atlas handle data privacy?",
      answer: "All your company data is fully encrypted at rest (AES-256) and in transit (TLS 1.3). Atlas isolates each tenant inside a private VPC, and we do not train base foundation models on your private workspace files. Your brain is strictly yours."
    },
    {
      question: "Which integrations are currently supported?",
      answer: "We support direct api links to Google Drive, Notion workspaces, GitHub repositories, Slack databases, Confluence wikis, local PDFs, Markdown text, and CSV spreadsheets. Custom APIs can also ingest documents via Webhooks."
    },
    {
      question: "What is a 'Company Brain'?",
      answer: "A Company Brain is a semantic, vectorized index of all your company's documents, conversations, and technical wikis. Instead of querying keywords, users ask complete natural language questions and Atlas responds using synthesized context."
    },
    {
      question: "Can I adjust permissions for specific team members?",
      answer: "Yes, our Professional and Enterprise plans support role-based permission profiles. You can restrict access to certain folder roots (e.g. Finance or HR) so specific users or AI agents cannot retrieve sensitive answers."
    },
    {
      question: "How long does it take to index a large Notion workspace?",
      answer: "Our continuous indexing engines process roughly 100 pages per minute. Initial sync of a large workspace takes less than 10 minutes, and consecutive syncs complete in real-time within 5 seconds of files being edited."
    }
  ];

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 bg-[#FAF9F6] border-b-3 border-black relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 font-sans">
        <div className="text-center mb-16 flex flex-col items-center">
          <h2 className="inline-block px-4 py-1.5 rounded-lg border-2 border-black bg-cyan-200 text-xs font-black text-black uppercase tracking-widest mb-4 shadow-[2px_2px_0px_#000000]">
            Got Questions?
          </h2>
          <p className="text-3xl sm:text-4xl font-black text-black tracking-tight uppercase">
            Frequently Asked Questions
          </p>
          <p className="mt-4 text-slate-800 font-extrabold text-base">
            Everything you need to know about setting up your secure Company Brain.
          </p>
        </div>

        {/* Accordions */}
        <div className="space-y-6">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className="rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0px_#000000] overflow-hidden"
              >
                <button
                  onClick={() => toggleAccordion(i)}
                  className={`w-full flex items-center justify-between p-6 text-left focus:outline-none cursor-pointer transition-colors ${
                    isOpen ? "bg-purple-50" : "bg-white"
                  }`}
                >
                  <span className="font-extrabold text-black text-base uppercase tracking-wide">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5.5 h-5.5 text-black stroke-[3px] transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  className={`transition-all duration-200 ease-in-out ${
                    isOpen ? "max-h-60 border-t-2 border-black" : "max-h-0"
                  } overflow-hidden`}
                >
                  <p className="p-6 text-sm text-slate-850 font-bold leading-relaxed bg-[#FAF9F6]/50">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA help box */}
        <div className="mt-16 p-5 rounded-2xl bg-white border-2 border-black max-w-xl mx-auto flex items-center justify-center space-x-3 text-xs text-black shadow-[3px_3px_0px_#000000]">
          <MessageSquare className="w-5 h-5 text-black stroke-[2px]" />
          <span className="font-bold">Still have questions? Email us at <a href="mailto:support@projectatlas.io" className="underline font-black text-purple-650">support@projectatlas.io</a></span>
        </div>
      </div>
    </section>
  );
}
