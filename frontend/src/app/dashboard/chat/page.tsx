"use client";

import { useState, useRef, useEffect } from "react";
import { onAuthStateChange, UserProfile } from "@/lib/firebase";
import { 
  Send, 
  Bot, 
  User, 
  BookOpen, 
  Trash2, 
  ArrowRight,
  Sparkles,
  ExternalLink,
  Info,
  X
} from "lucide-react";

interface Citation {
  sourceName: string;
  sourceType: string;
  snippet: string;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  citations?: Citation[];
}

export default function AIChatPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
      sender: "ai",
      text: "Hello! I am your Atlas AI Assistant. I have indexed your connected sources and synthesized your Company Brain. Ask me anything about your project plans, wikis, codebase, or documents.",
      timestamp: "Just now"
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // Selected citation details modal
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  
  // Active citation sidebar (maps to the last selected/active message)
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Handle message response generation
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userQuery = inputText.trim();
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append user message
    const userMessage: Message = {
      id: "msg_user_" + Date.now(),
      sender: "user",
      text: userQuery,
      timestamp: timestampStr
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);
    setActiveCitations([]); // Clear current citations until AI speaks

    // Simulate network calculation lag
    setTimeout(() => {
      let responseText = "";
      let matchedCitations: Citation[] = [];

      // Simple keyword matching for interactive feel
      const queryLower = userQuery.toLowerCase();
      if (queryLower.includes("prd") || queryLower.includes("project atlas") || queryLower.includes("atlas")) {
        responseText = "Project Atlas is a continuous intelligence platform designed to aggregate company folders, Slack chat databases, and developer wikis. According to the product requirements document, the target release for the brain-sync index architecture v2.0 is scheduled to support real-time token embeddings inside VPC environments.";
        matchedCitations = [
          {
            sourceName: "Project Atlas PRD.pdf",
            sourceType: "Upload",
            snippet: "Section 3.1: The synchronization coordinator triggers embedding pipeline computations for connected Notion, GitHub, and Drive sources immediately when document nodes are updated. Data is vectorized using the text-embedding-3-small model with a chunk size of 150 words."
          }
        ];
      } else if (queryLower.includes("guidelines") || queryLower.includes("engineering") || queryLower.includes("standards")) {
        responseText = "Our engineering standards dictate that all front-end assets must be styled using Tailwind CSS v4 to maintain performance compatibility. Furthermore, clean TypeScript compilation is required for all Next.js App Router hooks, and cascading state renders should be deferred using asynchronous timers.";
        matchedCitations = [
          {
            sourceName: "Engineering Guidelines Wiki",
            sourceType: "Notion",
            snippet: "Section 1.4: React Purity Compliance. Impure function calls such as Math.random() must occur outside of rendering lifecycles. All state updates inside mounting effects should be wrapped inside requestAnimationFrame or setTimeout ticks to prevent rendering cascades."
          }
        ];
      } else if (queryLower.includes("auth") || queryLower.includes("firebase") || queryLower.includes("login")) {
        responseText = "The workspace portal utilizes Firebase Auth to handle both Google Sign-In and Email/Password flows. If the environment variables are not populated in the workspace backend, the system falls back to a simulated localStorage auth helper so that local previews can run seamlessly.";
        matchedCitations = [
          {
            sourceName: "auth-service.ts",
            sourceType: "GitHub",
            snippet: "Line 42-55: Initialize Firebase App instance using public environmental keys. If process.env.NEXT_PUBLIC_FIREBASE_API_KEY is missing, auth resolves to null and triggers Mock Authentication fallback handlers."
          }
        ];
      } else {
        responseText = "I've scanned the Company Brain database for your query. The semantic recall index points to general strategy guidelines. To get optimal results, try asking about the 'Project Atlas PRD', 'engineering guidelines wiki', or the 'auth service code implementation'.";
        matchedCitations = [
          {
            sourceName: "Q3 Strategy Slide-Deck.pdf",
            sourceType: "Google Drive",
            snippet: "Slide 12: Knowledge Synthesis goals. Consolidating engineering wikis and code repository files into vector databases to decrease team onboarding lookup times by 75%."
          }
        ];
      }

      const aiMessage: Message = {
        id: "msg_ai_" + Date.now(),
        sender: "ai",
        text: responseText,
        timestamp: timestampStr,
        citations: matchedCitations
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
      setActiveCitations(matchedCitations);
    }, 1200);
  };

  // Click Suggestion Prompts
  const handleSelectPrompt = (promptText: string) => {
    setInputText(promptText);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: "msg-init",
        sender: "ai",
        text: "Chat database cleared. Ready for new workspace queries.",
        timestamp: "Just now"
      }
    ]);
    setActiveCitations([]);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full relative font-sans text-black dark:text-white">
      
      {/* Header */}
      <header className="h-20 border-b-2 border-black dark:border-white px-6 sm:px-8 flex items-center justify-between bg-white dark:bg-[#1C1C1E] z-10 transition-colors">
        <div>
          <h1 className="text-base font-black uppercase tracking-wider text-black dark:text-white">
            AI Cognitive Chat
          </h1>
          <p className="text-[10px] text-slate-800 dark:text-slate-400 font-extrabold">
            Search, retrieve and summarize information from your active Company Brain.
          </p>
        </div>
        <button
          onClick={handleClearHistory}
          className="flex items-center space-x-1.5 px-3 py-2 text-xs font-black text-black dark:text-white border-2 border-black dark:border-white bg-white dark:bg-[#242427] hover:bg-slate-100 dark:hover:bg-[#2E2E32] rounded-lg shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] transition-all cursor-pointer uppercase"
        >
          <Trash2 className="w-3.5 h-3.5 stroke-[2px]" />
          <span className="hidden sm:inline">Clear Chat</span>
        </button>
      </header>

      {/* Main chat grid */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Messaging Thread */}
        <div className="flex-1 flex flex-col justify-between bg-[#FAF9F6] dark:bg-[#18181A] overflow-y-auto p-6 sm:p-8 space-y-6 transition-colors">
          
          {/* Scrollable message frame */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {messages.map((msg) => {
              const isAI = msg.sender === "ai";
              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-4.5 ${!isAI ? "flex-row-reverse space-x-reverse" : ""}`}
                >
                  {/* Avatar */}
                  <div className={`h-9.5 w-9.5 rounded-xl border-2 border-black dark:border-white shrink-0 flex items-center justify-center text-xs font-bold overflow-hidden shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] ${
                    isAI
                      ? "bg-yellow-200 dark:bg-yellow-600 text-black dark:text-white"
                      : "bg-purple-300 dark:bg-purple-650 text-black dark:text-white"
                  }`}>
                    {isAI ? (
                      <Bot className="w-5 h-5 stroke-[2px]" />
                    ) : user?.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 stroke-[2px]" />
                    )}
                  </div>

                  {/* Message Bubble Container */}
                  <div className="max-w-2xl space-y-1.5">
                    <div className={`px-5 py-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed border-2 border-black dark:border-white shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] ${
                      isAI
                        ? "bg-white dark:bg-[#1C1C1E] text-black dark:text-white"
                        : "bg-purple-100 dark:bg-purple-950/40 text-black dark:text-white"
                    }`}>
                      {msg.text}

                      {/* Cited Sources */}
                      {isAI && msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3.5 pt-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 items-center">
                          <span className="text-[9px] font-black text-slate-500 dark:text-slate-405 uppercase tracking-wide mr-1.5 flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-black dark:text-white stroke-[2px]" /> Cited Sources:
                          </span>
                          {msg.citations.map((cit, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setActiveCitations(msg.citations || []);
                                setSelectedCitation(cit);
                              }}
                              className="px-2.5 py-1 rounded border-2 border-black dark:border-white bg-[#FAF9F6] dark:bg-[#18181A] text-[10px] text-black dark:text-white font-black hover:bg-yellow-200 dark:hover:bg-yellow-600 hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1px_1px_0px_#000000] dark:hover:shadow-[1px_1px_0px_#FFFFFF] transition-all shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] cursor-pointer flex items-center gap-1.5"
                            >
                              <span>{cit.sourceName}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-black dark:text-white stroke-[2.5px]" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={`block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-2 ${!isAI ? "text-right" : ""}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* AI Typing Indicator */}
            {isTyping && (
              <div className="flex items-start space-x-4.5">
                <div className="h-9.5 w-9.5 rounded-xl border-2 border-black dark:border-white bg-yellow-200 dark:bg-yellow-600 shrink-0 flex items-center justify-center text-black dark:text-white shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]">
                  <Bot className="w-5 h-5 stroke-[2px]" />
                </div>
                <div className="bg-white dark:bg-[#1C1C1E] border-2 border-black dark:border-white px-5 py-3.5 rounded-2xl flex items-center space-x-2 shrink-0 shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF]">
                  <span className="text-xs font-extrabold text-black dark:text-white">Atlas is formulating response</span>
                  <div className="flex space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Suggested Prompts */}
          {messages.length === 1 && (
            <div className="space-y-3.5 shrink-0">
              <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1.5">Suggested Prompts</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4.5">
                {[
                  { title: "Atlas architecture PRD", txt: "Explain the Project Atlas architecture from the PRD" },
                  { title: "Engineering standards", txt: "Summarize the frontend engineering guidelines wiki" },
                  { title: "Auth implementation", txt: "Where is the authentication service code located?" }
                ].map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectPrompt(p.txt)}
                    className="p-4.5 rounded-xl border-2 border-black dark:border-white bg-white dark:bg-[#1C1C1E] hover:bg-slate-50 dark:hover:bg-[#242427] text-left text-xs font-black text-black dark:text-white shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000000] dark:hover:shadow-[2px_2px_0px_#FFFFFF] transition-all cursor-pointer flex justify-between items-center"
                  >
                    <span>{p.title}</span>
                    <ArrowRight className="w-4 h-4 text-black dark:text-white stroke-[3px] shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box Form */}
          <form onSubmit={handleSendMessage} className="flex gap-3.5 pt-4 border-t-2 border-black dark:border-white shrink-0">
            <input
              type="text"
              required
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask your Company Brain a question..."
              className="flex-1 px-4.5 py-4 bg-white dark:bg-[#1C1C1E] border-2 border-black dark:border-white rounded-xl text-xs sm:text-sm font-semibold text-black dark:text-white placeholder-slate-550 focus:outline-none shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] focus:shadow-[2px_2px_0px_#000000] dark:focus:shadow-[2px_2px_0px_#FFFFFF] focus:translate-x-[0.5px] focus:translate-y-[0.5px] transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="px-6 py-4 rounded-xl bg-purple-300 dark:bg-purple-650 hover:bg-purple-400 dark:hover:bg-purple-600 border-2 border-black dark:border-white text-black dark:text-white shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[1.5px_1.5px_0px_#000000] dark:hover:shadow-[1.5px_1.5px_0px_#FFFFFF] transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4.5 h-4.5 text-black dark:text-white stroke-[3px]" />
            </button>
          </form>
        </div>

        {/* Right Side: Citations Context Panel */}
        <div className="w-82 border-l-3 border-black dark:border-white bg-white dark:bg-[#1C1C1E] p-6 hidden lg:flex flex-col justify-between shrink-0 transition-colors">
          <div>
            <div className="flex items-center space-x-2 border-b-2 border-black dark:border-white pb-4 mb-5">
              <BookOpen className="w-4.5 h-4.5 text-black dark:text-white stroke-[2.5px]" />
              <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-wider">Semantic Citations</h2>
            </div>
            
            <p className="text-[10px] text-slate-800 dark:text-slate-400 font-bold leading-relaxed mb-6">
              This panel displays references that the AI core fetched from your vector index to compile the response.
            </p>

            <div className="space-y-5">
              {activeCitations.length > 0 ? (
                activeCitations.map((cit, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedCitation(cit)}
                    className="p-4.5 rounded-xl border-2 border-black dark:border-white bg-[#FAF9F6] dark:bg-[#18181A] hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[2px_2px_0px_#000000] dark:hover:shadow-[2px_2px_0px_#FFFFFF] transition-all shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#FFFFFF] cursor-pointer relative group"
                  >
                    <span className="absolute top-3.5 right-3.5 text-[9px] font-black text-purple-650 dark:text-purple-400 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wide">
                      Open <ExternalLink className="w-2.5 h-2.5 stroke-[2.5px]" />
                    </span>
                    <span className="px-1.5 py-0.5 rounded border border-black dark:border-white bg-white dark:bg-[#242427] text-[9px] font-black text-black dark:text-white tracking-wide uppercase inline-block mb-3.5 shadow-[1px_1px_0px_#000000] dark:shadow-[1px_1px_0px_#FFFFFF]">
                      {cit.sourceType}
                    </span>
                    <h3 className="text-xs font-black text-black dark:text-white mb-1.5 truncate pr-8 uppercase tracking-wide">{cit.sourceName}</h3>
                    <p className="text-[11px] text-slate-800 dark:text-slate-400 font-medium line-clamp-3 leading-relaxed">
                      {cit.snippet}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-16 px-4 border-2 border-dashed border-slate-350 dark:border-slate-800 rounded-xl text-center text-slate-600 dark:text-slate-450 flex flex-col items-center">
                  <Sparkles className="w-6 h-6 text-slate-400 mb-3.5 stroke-[2px]" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Awaiting query context</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F6] dark:bg-[#18181A] border-2 border-black dark:border-white text-[10px] text-slate-855 dark:text-slate-400 font-bold flex items-start space-x-2 shrink-0 shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]">
            <Info className="w-4.5 h-4.5 text-black dark:text-white stroke-[2.5px] shrink-0 mt-0.5" />
            <span className="leading-relaxed">Citations are generated in real-time by aligning your semantic prompt against chunked source indices.</span>
          </div>
        </div>

      </div>

      {/* Selected Citation Snippet Modal Dialog */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1C1E] border-3 border-black dark:border-white rounded-2xl w-full max-w-xl p-6 sm:p-8 shadow-[8px_8px_0px_#000000] dark:shadow-[8px_8px_0px_#FFFFFF] relative">
            <button
              onClick={() => setSelectedCitation(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg border-2 border-black dark:border-white bg-[#FAF9F6] dark:bg-[#242427] text-slate-500 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#2E2E32] focus:outline-none cursor-pointer shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]"
            >
              <X className="w-4 h-4 stroke-[2.5px]" />
            </button>

            <span className="px-2 py-0.5 rounded border border-black dark:border-white bg-yellow-200 dark:bg-yellow-600 text-[9px] font-black text-black dark:text-white uppercase tracking-wide inline-block mb-3.5 shadow-[1px_1px_0px_#000000] dark:shadow-[1px_1px_0px_#FFFFFF]">
              {selectedCitation.sourceType} Source Document
            </span>
            <h3 className="text-base font-black text-black dark:text-white uppercase tracking-wider mb-2">{selectedCitation.sourceName}</h3>
            <hr className="border-black dark:border-white border my-4" />

            <div className="bg-[#FAF9F6] dark:bg-[#18181A] rounded-xl border-2 border-black dark:border-white p-5 font-mono text-xs font-bold text-black dark:text-white leading-relaxed max-h-80 overflow-y-auto shadow-[inset_1.5px_1.5px_3px_rgba(0,0,0,0.06)]">
              {selectedCitation.snippet}
            </div>

            <div className="flex items-center justify-end pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
              <button
                onClick={() => setSelectedCitation(null)}
                className="px-5.5 py-2.5 rounded-xl bg-purple-300 dark:bg-purple-650 hover:bg-purple-400 dark:hover:bg-purple-600 border-2 border-black dark:border-white text-xs font-black text-black dark:text-white shadow-[2.5px_2.5px_0px_#000000] dark:shadow-[2.5px_2.5px_0px_#FFFFFF] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1.5px_1.5px_0px_#000000] dark:hover:shadow-[1.5px_1.5px_0px_#FFFFFF] transition-all cursor-pointer uppercase tracking-wider"
              >
                Close Reference
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
