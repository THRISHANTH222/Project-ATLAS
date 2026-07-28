"use client";

import { useState, useRef, useEffect } from "react";
import { onAuthStateChange, UserProfile } from "@/lib/firebase";
import { 
  processChatPrompt, 
  getChatDebug, 
  getChatHistory, 
  deleteChatHistoryItem, 
  getDocumentDownloadUrl,
  SourceCitation, 
  DebugAnalysisData 
} from "@/lib/api";
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
  X,
  Code,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Layers,
  Building,
  Tag,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  Cpu,
  Bookmark
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  citations?: SourceCitation[];
  confidence?: number;
  failureMessage?: string;
}

export default function AIChatPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
      sender: "ai",
      text: "Hello! I am your Atlas AI Assistant. Ask me anything about your project plans, engineering guidelines, or company knowledge.",
      timestamp: "Just now"
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // Selected citation details modal (Enhanced Source Viewer)
  const [selectedCitation, setSelectedCitation] = useState<SourceCitation | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  
  // Active citation sidebar
  const [activeCitations, setActiveCitations] = useState<SourceCitation[]>([]);

  // Developer Mode State (Toggleable, Hidden by default)
  const [isDevModeEnabled, setIsDevModeEnabled] = useState(false);
  const [debugMetrics, setDebugMetrics] = useState<DebugAnalysisData | null>(null);
  const [isDebugLoading, setIsDebugLoading] = useState(false);
  const [showChunkDetails, setShowChunkDetails] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
    });

    // Fetch past chat history from backend GET /ai/chat/history
    const loadHistory = async () => {
      const records = await getChatHistory();
      if (records && records.length > 0) {
        const historyMsgs: Message[] = [];
        records.reverse().forEach((rec) => {
          historyMsgs.push({
            id: `usr_${rec.id}`,
            sender: "user",
            text: rec.question,
            timestamp: rec.timestamp ? new Date(rec.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Past",
          });
          historyMsgs.push({
            id: rec.id,
            sender: "ai",
            text: rec.answer || "No response generated.",
            timestamp: rec.timestamp ? new Date(rec.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Past",
            citations: rec.citations || [],
            confidence: rec.confidence,
          });
        });
        setMessages(historyMsgs);
        if (records[0].citations && records[0].citations.length > 0) {
          setActiveCitations(records[0].citations);
        }
      }
    };

    loadHistory();

    return () => unsubscribe();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Enhanced Helper for Confidence Badge with Hover Tooltip
  const getConfidenceBadge = (confidence?: number) => {
    if (confidence === undefined || confidence === null) return null;
    
    let colorClass = "bg-red-100 text-red-700 border-red-500 dark:bg-red-950/40 dark:text-red-300";
    let label = "Low Confidence";
    let tierText = "Below 60";

    if (confidence >= 80) {
      colorClass = "bg-emerald-100 text-emerald-800 border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300";
      label = "High Confidence";
      tierText = "80+";
    } else if (confidence >= 60) {
      colorClass = "bg-amber-100 text-amber-800 border-amber-500 dark:bg-amber-950/40 dark:text-amber-300";
      label = "Medium Confidence";
      tierText = "60-79";
    }

    const tooltipExplanation = `RAG Confidence Score (${confidence.toFixed(1)}%): Multi-factor metric calculated from Vector Cosine Similarity (50%), Chunk Quality (30%), and Context Coverage (20%). Green = 80+, Yellow = 60-79, Red = Below 60.`;

    return (
      <div className="relative group inline-block">
        <span 
          title={tooltipExplanation}
          className={`px-2.5 py-1 rounded border text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 shadow-[1px_1px_0px_#000000] dark:shadow-[1px_1px_0px_#FFFFFF] cursor-help ${colorClass}`}
        >
          {confidence >= 80 ? (
            <CheckCircle className="w-3 h-3 stroke-[2.5px]" />
          ) : confidence >= 60 ? (
            <Info className="w-3 h-3 stroke-[2.5px]" />
          ) : (
            <AlertCircle className="w-3 h-3 stroke-[2.5px]" />
          )}
          <span>{confidence.toFixed(1)}% ({label} • {tierText})</span>
          <HelpCircle className="w-3 h-3 opacity-60 group-hover:opacity-100 stroke-[2px]" />
        </span>

        {/* Interactive Tooltip Card on Hover */}
        <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block z-50 w-72 p-3 bg-slate-900 text-white rounded-xl border-2 border-black dark:border-white shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#FFFFFF] text-[10px] leading-relaxed">
          <div className="flex items-center space-x-1.5 mb-1 text-yellow-300 font-black uppercase tracking-wider">
            <Info className="w-3.5 h-3.5 stroke-[2.5px]" />
            <span>Confidence Score Breakdown</span>
          </div>
          <p className="font-semibold text-slate-200 mb-2">
            Multi-factor RAG confidence calculated by evaluating chunk relevance against your question:
          </p>
          <ul className="space-y-1 font-mono text-[9.5px] text-slate-300 border-t border-slate-700 pt-1.5">
            <li><span className="text-emerald-400 font-bold">● Green (80+)</span>: High relevance & similarity</li>
            <li><span className="text-amber-400 font-bold">● Yellow (60-79)</span>: Moderate context match</li>
            <li><span className="text-red-400 font-bold">● Red (Below 60)</span>: Low retrieval alignment</li>
          </ul>
        </div>
      </div>
    );
  };

  // Open PDF Document Helper
  const handleOpenPdf = async (cit: SourceCitation) => {
    setPdfLoading(true);
    const docId = cit.documentId || cit.document_id || cit.chunkId || "doc-1";
    const pageNum = cit.page ?? cit.page_number ?? 1;

    // Fetch signed URL from backend GET /documents/{id}
    const signedUrl = await getDocumentDownloadUrl(docId);
    setPdfLoading(false);

    if (signedUrl) {
      const fullPdfUrl = `${signedUrl}#page=${pageNum}`;
      window.open(fullPdfUrl, "_blank");
    } else {
      // Fallback preview URL
      const fallbackUrl = `/documents/${docId}.pdf#page=${pageNum}`;
      window.open(fallbackUrl, "_blank");
    }
  };

  // Handle Real RAG Message sending to Backend API
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
    setActiveCitations([]);

    // Call Backend POST /ai/chat
    const apiResult = await processChatPrompt(userQuery);

    // If Developer Mode is enabled, also fetch GET /ai/chat/debug
    if (isDevModeEnabled) {
      setIsDebugLoading(true);
      const debugResult = await getChatDebug(userQuery);
      setDebugMetrics(debugResult);
      setIsDebugLoading(false);
    }

    setIsTyping(false);

    if (!apiResult.success || !apiResult.data.answer) {
      const refusalMessage = apiResult.message || "No relevant company knowledge found. Please upload company documents.";
      const failureMsg: Message = {
        id: "msg_ai_" + Date.now(),
        sender: "ai",
        text: refusalMessage,
        timestamp: timestampStr,
        citations: [],
        confidence: 0.0,
        failureMessage: refusalMessage
      };
      setMessages((prev) => [...prev, failureMsg]);
      return;
    }

    // Success response with citations and confidence
    const citationsList = apiResult.data.citations || [];
    const aiMessage: Message = {
      id: "msg_ai_" + Date.now(),
      sender: "ai",
      text: apiResult.data.answer,
      timestamp: timestampStr,
      citations: citationsList,
      confidence: apiResult.data.confidence
    };

    setMessages((prev) => [...prev, aiMessage]);
    setActiveCitations(citationsList);
  };

  // Click Suggestion Prompts
  const handleSelectPrompt = (promptText: string) => {
    setInputText(promptText);
  };

  const handleClearHistory = async () => {
    setMessages([
      {
        id: "msg-init",
        sender: "ai",
        text: "Chat history cleared. Ask a new question.",
        timestamp: "Just now"
      }
    ]);
    setActiveCitations([]);
    setDebugMetrics(null);
  };

  // Extract Pages list from debug metrics
  const getPagesList = () => {
    if (!debugMetrics?.retrievedChunks) return "None";
    const pages = debugMetrics.retrievedChunks
      .map((c) => c.page)
      .filter((p): p is number => p !== undefined && p !== null);
    if (pages.length === 0) return "p.1";
    const uniquePages = Array.from(new Set(pages)).sort((a, b) => a - b);
    return uniquePages.map((p) => `p.${p}`).join(", ");
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full relative font-sans text-black dark:text-white">
      
      {/* Header */}
      <header className="h-20 border-b-2 border-black dark:border-white px-6 sm:px-8 flex items-center justify-between bg-white dark:bg-[#1C1C1E] z-10 transition-colors">
        <div>
          <h1 className="text-base font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
            <span>AI Cognitive Chat</span>
            <span className="text-[9px] px-2 py-0.5 rounded border border-black dark:border-white bg-yellow-200 dark:bg-yellow-600 font-mono">Atlas RAG v2.0</span>
          </h1>
          <p className="text-[10px] text-slate-800 dark:text-slate-400 font-extrabold">
            Search, retrieve and summarize information from your active Company Brain.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Developer Mode Toggle (Hidden by Default) */}
          <button
            onClick={async () => {
              const nextState = !isDevModeEnabled;
              setIsDevModeEnabled(nextState);
              if (nextState && messages.length > 1) {
                const lastUserMsg = [...messages].reverse().find((m) => m.sender === "user");
                if (lastUserMsg) {
                  setIsDebugLoading(true);
                  const debugData = await getChatDebug(lastUserMsg.text);
                  setDebugMetrics(debugData);
                  setIsDebugLoading(false);
                }
              }
            }}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-black border-2 border-black dark:border-white rounded-lg shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] transition-all cursor-pointer uppercase ${
              isDevModeEnabled 
                ? "bg-purple-300 dark:bg-purple-650 text-black dark:text-white" 
                : "bg-white dark:bg-[#242427] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
            }`}
          >
            <Code className="w-3.5 h-3.5 stroke-[2.5px]" />
            <span>Developer Mode {isDevModeEnabled ? "(ON)" : "(OFF)"}</span>
          </button>

          <button
            onClick={handleClearHistory}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-black text-black dark:text-white border-2 border-black dark:border-white bg-white dark:bg-[#242427] hover:bg-slate-100 dark:hover:bg-[#2E2E32] rounded-lg shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] transition-all cursor-pointer uppercase"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2px]" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </header>

      {/* Developer Mode Dashboard Panel (Visible ONLY in Developer Mode) */}
      {isDevModeEnabled && (
        <div className="bg-purple-950 text-white px-6 py-4 border-b-2 border-black dark:border-white text-xs font-mono transition-all">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-purple-300 stroke-[2.5px]" />
              <span className="font-black text-purple-200 uppercase tracking-wide text-xs">Developer Mode Inspection</span>
              <span className="px-2 py-0.5 rounded bg-purple-800 text-[9px] font-bold">GET /ai/chat/debug</span>
            </div>

            <button
              onClick={() => setShowChunkDetails(!showChunkDetails)}
              className="flex items-center space-x-1 text-[10px] uppercase font-bold text-purple-300 hover:text-white transition-colors"
            >
              <span>{showChunkDetails ? "Hide Chunk Inspection" : "Inspect Chunks"}</span>
              {showChunkDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {isDebugLoading ? (
            <div className="flex items-center space-x-2 text-purple-300 animate-pulse font-bold text-xs py-2">
              <Activity className="w-4 h-4 animate-spin" />
              <span>Fetching retrieval debug telemetry...</span>
            </div>
          ) : debugMetrics ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2 border-t border-purple-800">
              {/* 1. Retrieved Chunks */}
              <div className="bg-purple-900/60 p-2.5 rounded-lg border border-purple-700">
                <span className="text-purple-300 uppercase block text-[9px] font-bold">Retrieved Chunks:</span>
                <span className="text-sm font-black text-white">{debugMetrics.retrievedChunks?.length || 0} chunks</span>
              </div>

              {/* 2. Similarity */}
              <div className="bg-purple-900/60 p-2.5 rounded-lg border border-purple-700">
                <span className="text-purple-300 uppercase block text-[9px] font-bold">Similarity Score:</span>
                <span className="text-sm font-black text-emerald-300">{(debugMetrics.embeddingScore || 0).toFixed(3)}</span>
              </div>

              {/* 3. Confidence */}
              <div className="bg-purple-900/60 p-2.5 rounded-lg border border-purple-700">
                <span className="text-purple-300 uppercase block text-[9px] font-bold">Confidence:</span>
                <span className="text-sm font-black text-yellow-300">{debugMetrics.confidence || 0}%</span>
              </div>

              {/* 4. Pages */}
              <div className="bg-purple-900/60 p-2.5 rounded-lg border border-purple-700">
                <span className="text-purple-300 uppercase block text-[9px] font-bold">Pages:</span>
                <span className="text-xs font-bold text-white truncate block">{getPagesList()}</span>
              </div>

              {/* 5. Prompt Tokens */}
              <div className="bg-purple-900/60 p-2.5 rounded-lg border border-purple-700">
                <span className="text-purple-300 uppercase block text-[9px] font-bold">Prompt Tokens:</span>
                <span className="text-sm font-black text-purple-200">{debugMetrics.promptLength || 0} tokens</span>
              </div>

              {/* 6. Response Time */}
              <div className="bg-purple-900/60 p-2.5 rounded-lg border border-purple-700">
                <span className="text-purple-300 uppercase block text-[9px] font-bold">Response Time:</span>
                <span className="text-sm font-black text-cyan-300">{debugMetrics.responseTime || 0} ms</span>
              </div>
            </div>
          ) : (
            <span className="text-purple-400 font-semibold text-xs">Submit a user prompt to inspect debug telemetry metrics</span>
          )}

          {/* Expandable Chunk Inspection Breakdown */}
          {showChunkDetails && debugMetrics?.retrievedChunks && (
            <div className="mt-3 pt-3 border-t border-purple-800 space-y-2">
              <span className="text-[9px] uppercase font-black text-purple-300 block">Retrieved Vector Chunk Breakdown:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {debugMetrics.retrievedChunks.map((chk, idx) => (
                  <div key={idx} className="p-2 bg-purple-900/80 rounded border border-purple-700 text-[10px]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-purple-200 truncate">{chk.chunkId}</span>
                      <span className="text-emerald-400 font-mono">{(chk.similarity * 100).toFixed(1)}%</span>
                    </div>
                    <div className="text-[9px] text-purple-300">
                      <span>{chk.heading || "Section"}</span> • <span>p.{chk.page || 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
                  <div className="max-w-2xl space-y-2">
                    {/* Confidence score badge with hover explanation tooltip */}
                    {isAI && msg.confidence !== undefined && (
                      <div className="flex items-center space-x-2">
                        {getConfidenceBadge(msg.confidence)}
                      </div>
                    )}

                    <div className={`px-5 py-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed border-2 border-black dark:border-white shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] ${
                      isAI
                        ? msg.failureMessage 
                          ? "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-500" 
                          : "bg-white dark:bg-[#1C1C1E] text-black dark:text-white"
                        : "bg-purple-100 dark:bg-purple-950/40 text-black dark:text-white"
                    }`}>
                      {msg.text}

                      {/* Enhanced Citation Cards List under Message */}
                      {isAI && msg.citations && msg.citations.length > 0 && (
                        <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-col space-y-2">
                          <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-black dark:text-white stroke-[2px]" /> Citations ({msg.citations.length}) - Click to Open Source:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.citations.map((cit, idx) => {
                              const docName = cit.documentName || cit.document_name || cit.filename || "Document";
                              const tagsList = cit.tags || ["policy", "guidelines"];
                              return (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setActiveCitations(msg.citations || []);
                                    setSelectedCitation(cit);
                                  }}
                                  className="p-3 rounded-xl border-2 border-black dark:border-white bg-[#FAF9F6] dark:bg-[#18181A] hover:bg-yellow-200 dark:hover:bg-yellow-600 hover:translate-x-[0.5px] hover:translate-y-[0.5px] transition-all shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] text-left cursor-pointer flex flex-col justify-between space-y-2 group"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-black dark:text-white flex items-center gap-1.5 truncate pr-2 uppercase">
                                      <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                                      <span className="truncate">{docName}</span>
                                    </span>
                                    <ExternalLink className="w-3 h-3 text-black dark:text-white stroke-[2.5px] shrink-0 opacity-70 group-hover:opacity-100" />
                                  </div>

                                  {/* Enhanced Fields: Heading, Page, Department */}
                                  <div className="flex flex-wrap items-center gap-1 text-[9px]">
                                    {cit.heading && (
                                      <span className="px-1.5 py-0.2 rounded border border-black dark:border-white bg-purple-100 dark:bg-purple-950 text-black dark:text-white font-extrabold flex items-center gap-0.5">
                                        <Layers className="w-2.5 h-2.5" /> {cit.heading}
                                      </span>
                                    )}
                                    {cit.department && (
                                      <span className="px-1.5 py-0.2 rounded border border-black dark:border-white bg-blue-100 dark:bg-blue-950 text-black dark:text-white font-extrabold flex items-center gap-0.5">
                                        <Building className="w-2.5 h-2.5" /> {cit.department}
                                      </span>
                                    )}
                                    {cit.page !== undefined && cit.page !== null && (
                                      <span className="px-1.5 py-0.2 rounded border border-black dark:border-white bg-yellow-300 dark:bg-yellow-700 text-black dark:text-white font-bold">
                                        p.{cit.page}
                                      </span>
                                    )}
                                  </div>

                                  {/* Tags Badge list */}
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {tagsList.map((tg, tagIdx) => (
                                      <span key={tagIdx} className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[8px] font-mono text-slate-700 dark:text-slate-300 flex items-center gap-0.5">
                                        <Tag className="w-2 h-2 text-slate-500" /> #{tg}
                                      </span>
                                    ))}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
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
                  <span className="text-xs font-extrabold text-black dark:text-white">Querying vector index & executing RAG pipeline</span>
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
                  { title: "Vacation policy guidelines", txt: "What are the company vacation allowance guidelines?" },
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

        {/* Right Side: Citation Cards Sidebar */}
        <div className="w-84 border-l-3 border-black dark:border-white bg-white dark:bg-[#1C1C1E] p-6 hidden lg:flex flex-col justify-between shrink-0 transition-colors">
          <div>
            <div className="flex items-center space-x-2 border-b-2 border-black dark:border-white pb-4 mb-5">
              <BookOpen className="w-4.5 h-4.5 text-black dark:text-white stroke-[2.5px]" />
              <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-wider">Semantic Citations</h2>
            </div>
            
            <p className="text-[10px] text-slate-800 dark:text-slate-400 font-bold leading-relaxed mb-4">
              Real-time vector references. Click any card to open complete source viewer:
            </p>

            <div className="space-y-3.5">
              {activeCitations.length > 0 ? (
                activeCitations.map((cit, index) => {
                  const docName = cit.documentName || cit.document_name || cit.filename || "Source Document";
                  const textSnippet = cit.text || cit.chunk_text || "No snippet text available.";
                  const tagsList = cit.tags || ["policy", "knowledge"];
                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedCitation(cit)}
                      className="p-4 rounded-xl border-2 border-black dark:border-white bg-[#FAF9F6] dark:bg-[#18181A] hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[2px_2px_0px_#000000] dark:hover:shadow-[2px_2px_0px_#FFFFFF] transition-all shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] cursor-pointer relative group space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-[9px] font-black text-purple-650 dark:text-purple-400 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wide">
                          Open Source <ExternalLink className="w-2.5 h-2.5 stroke-[2.5px]" />
                        </span>
                      </div>
                      
                      {/* Document */}
                      <h3 className="text-xs font-black text-black dark:text-white truncate pr-6 uppercase tracking-wide flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span className="truncate">{docName}</span>
                      </h3>

                      {/* Enhanced Metadata: Heading, Department, Page */}
                      <div className="flex flex-wrap gap-1 text-[9px]">
                        {cit.heading && (
                          <span className="px-1.5 py-0.3 rounded border border-black dark:border-white bg-purple-100 dark:bg-purple-950 text-black dark:text-white font-extrabold flex items-center gap-1">
                            <Layers className="w-2.5 h-2.5" /> {cit.heading}
                          </span>
                        )}
                        {cit.department && (
                          <span className="px-1.5 py-0.3 rounded border border-black dark:border-white bg-blue-100 dark:bg-blue-950 text-black dark:text-white font-extrabold flex items-center gap-1">
                            <Building className="w-2.5 h-2.5" /> {cit.department}
                          </span>
                        )}
                        {cit.page !== undefined && cit.page !== null && (
                          <span className="px-1.5 py-0.3 rounded border border-black dark:border-white bg-yellow-200 dark:bg-yellow-600 text-black dark:text-white font-bold">
                            Page {cit.page}
                          </span>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {tagsList.map((tg, tagIdx) => (
                          <span key={tagIdx} className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[8px] font-mono text-slate-700 dark:text-slate-300 flex items-center gap-0.5">
                            <Tag className="w-2 h-2 text-slate-500" /> #{tg}
                          </span>
                        ))}
                      </div>

                      <p className="text-[11px] text-slate-800 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed">
                        {textSnippet}
                      </p>
                    </div>
                  );
                })
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
            <span className="leading-relaxed">Click any citation card to launch full Source Viewer inspection.</span>
          </div>
        </div>

      </div>

      {/* Enhanced Source Viewer Modal Dialog (Open PDF, Highlight Page, Highlight Heading, Display Metadata) */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1C1E] border-3 border-black dark:border-white rounded-2xl w-full max-w-2xl p-6 sm:p-8 shadow-[8px_8px_0px_#000000] dark:shadow-[8px_8px_0px_#FFFFFF] relative max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pr-8 border-b-2 border-black dark:border-white pb-4 mb-4">
              <div>
                <span className="px-2 py-0.5 rounded border border-black dark:border-white bg-purple-300 dark:bg-purple-650 text-[9px] font-black text-black dark:text-white uppercase tracking-wide inline-block mb-2 shadow-[1px_1px_0px_#000000] dark:shadow-[1px_1px_0px_#FFFFFF]">
                  Source Viewer Engine
                </span>
                <h3 className="text-base font-black text-black dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400 stroke-[2.5px]" />
                  <span>{selectedCitation.documentName || selectedCitation.document_name || selectedCitation.filename || "Document Context"}</span>
                </h3>
              </div>

              {/* Action Button: Open PDF File */}
              <button
                onClick={() => handleOpenPdf(selectedCitation)}
                disabled={pdfLoading}
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-black text-black dark:text-white bg-yellow-300 dark:bg-yellow-600 hover:bg-yellow-400 border-2 border-black dark:border-white rounded-xl shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] hover:translate-x-[0.5px] hover:translate-y-[0.5px] transition-all cursor-pointer uppercase shrink-0"
              >
                <ExternalLink className={`w-3.5 h-3.5 stroke-[2.5px] ${pdfLoading ? "animate-spin" : ""}`} />
                <span>{pdfLoading ? "Opening PDF..." : "Open PDF File"}</span>
              </button>

              <button
                onClick={() => setSelectedCitation(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg border-2 border-black dark:border-white bg-[#FAF9F6] dark:bg-[#242427] text-slate-500 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#2E2E32] focus:outline-none cursor-pointer shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]"
              >
                <X className="w-4 h-4 stroke-[2.5px]" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">

              {/* Highlighted Section Heading Banner */}
              {selectedCitation.heading && (
                <div className="p-3.5 rounded-xl border-l-4 border-purple-600 bg-purple-100 dark:bg-purple-950/80 border-y border-r border-black dark:border-white flex items-center justify-between shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]">
                  <div className="flex items-center space-x-2">
                    <Bookmark className="w-4 h-4 text-purple-700 dark:text-purple-300 stroke-[2.5px]" />
                    <span className="text-xs font-black uppercase text-purple-950 dark:text-purple-100 tracking-wide">
                      Heading: {selectedCitation.heading}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200">
                    Target Section
                  </span>
                </div>
              )}

              {/* Highlighted Cited Page Banner */}
              <div className="p-3.5 rounded-xl border-2 border-black dark:border-white bg-amber-100 dark:bg-amber-950/60 flex items-center justify-between shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-amber-700 dark:text-amber-300 stroke-[2.5px]" />
                  <span className="text-xs font-black uppercase text-amber-950 dark:text-amber-100 tracking-wide">
                    Cited Page: Page {selectedCitation.page ?? selectedCitation.page_number ?? 1}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-lg border-2 border-black bg-amber-300 dark:bg-amber-500 text-black font-black text-xs uppercase shadow-[1px_1px_0px_#000]">
                  Page {selectedCitation.page ?? selectedCitation.page_number ?? 1} Highlighted
                </span>
              </div>

              {/* Full Metadata Grid Panel */}
              <div className="p-4 rounded-xl bg-[#FAF9F6] dark:bg-[#18181A] border-2 border-black dark:border-white shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]">
                <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-2 tracking-wider border-b border-slate-200 dark:border-slate-800 pb-1">
                  Metadata Telemetry
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[9px] uppercase text-slate-500 dark:text-slate-400 font-black block">Document:</span>
                    <span className="font-bold truncate block">{selectedCitation.documentName || selectedCitation.document_name || selectedCitation.filename || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-500 dark:text-slate-400 font-black block">Section Heading:</span>
                    <span className="font-bold truncate block">{selectedCitation.heading || "General Context"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-500 dark:text-slate-400 font-black block">Cited Page:</span>
                    <span className="font-mono font-bold block">Page {selectedCitation.page ?? selectedCitation.page_number ?? 1}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-500 dark:text-slate-400 font-black block">Department:</span>
                    <span className="font-bold truncate block">{selectedCitation.department || "Organization"}</span>
                  </div>
                </div>

                {/* Tags Badges */}
                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] uppercase text-slate-500 font-black flex items-center gap-1 mr-1">
                    <Tag className="w-3 h-3 text-purple-600" /> Metadata Tags:
                  </span>
                  {(selectedCitation.tags || ["policy", "guidelines", "v2.0"]).map((tg, tagIdx) => (
                    <span key={tagIdx} className="px-2 py-0.5 rounded border border-black dark:border-white bg-purple-100 dark:bg-purple-950 text-[9px] font-mono font-bold text-black dark:text-white shadow-[1px_1px_0px_#000000] dark:shadow-[1px_1px_0px_#FFFFFF]">
                      #{tg}
                    </span>
                  ))}
                </div>
              </div>

              {/* Chunk Text Content Box */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block">
                  Indexed Vector Chunk Text:
                </span>
                <div className="bg-[#FAF9F6] dark:bg-[#18181A] rounded-xl border-2 border-black dark:border-white p-5 font-mono text-xs font-bold text-black dark:text-white leading-relaxed max-h-56 overflow-y-auto shadow-[inset_1.5px_1.5px_3px_rgba(0,0,0,0.06)]">
                  {selectedCitation.text || selectedCitation.chunk_text || "No chunk text available."}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 mt-4 shrink-0">
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                Cosine Similarity Score: {((selectedCitation.similarity || selectedCitation.similarity_score || 0) * 100).toFixed(1)}%
              </span>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleOpenPdf(selectedCitation)}
                  className="px-4 py-2 rounded-xl bg-yellow-300 hover:bg-yellow-400 border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_#000] uppercase tracking-wide flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open PDF</span>
                </button>
                <button
                  onClick={() => setSelectedCitation(null)}
                  className="px-4 py-2 rounded-xl bg-purple-300 dark:bg-purple-650 hover:bg-purple-400 border-2 border-black dark:border-white text-xs font-black text-black dark:text-white shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] uppercase tracking-wide"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
