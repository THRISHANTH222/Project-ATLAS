"use client";

import { useState, useRef, useEffect } from "react";
import { onAuthStateChange, UserProfile } from "@/lib/firebase";
import { sendChatMessage, ChatHistoryItem, searchDocuments, getChatHistory, deleteConversation, saveConversation, ChatHistorySession } from "@/lib/api";
import { 
  Send, 
  Bot, 
  User, 
  BookOpen, 
  Trash2, 
  ArrowRight,
  Info,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  X,
  Check,
  Copy
} from "lucide-react";

interface Citation {
  document_id: string;
  filename: string;
  chunk_id: string;
  text: string;
  similarity_score: number;
  page?: number;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  error?: boolean;
  citations?: Citation[];
}

const formatMessageText = (text: string) => {
  if (!text) return null;
  const lines = text.split("\n");
  
  // Keep track of whether we are inside a bulleted list to group <li> items
  let inList = false;
  const elements: React.ReactNode[] = [];
  let currentListItems: React.ReactNode[] = [];

  const parseLine = (lineContent: string, lineIdx: number) => {
    // Parse bold text **bold**
    const parts = [];
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let match;
    let lastIndex = 0;
    
    while ((match = boldRegex.exec(lineContent)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(lineContent.substring(lastIndex, matchIndex));
      }
      parts.push(
        <strong key={`bold-${lineIdx}-${matchIndex}`} className="font-extrabold text-black dark:text-white">
          {match[1]}
        </strong>
      );
      lastIndex = boldRegex.lastIndex;
    }
    
    if (lastIndex < lineContent.length) {
      parts.push(lineContent.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : lineContent;
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopyMessageText = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (e) {
      console.warn("Failed to copy message:", e);
    }
  };

  lines.forEach((line, lineIdx) => {
    const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ") || line.trim().startsWith("• ");
    
    if (isBullet) {
      if (!inList) {
        inList = true;
        currentListItems = [];
      }
      const lineContent = line.trim().replace(/^[-*•]\s+/, "");
      currentListItems.push(
        <li key={`li-${lineIdx}`} className="ml-4 list-disc mb-1 pl-1 text-slate-800 dark:text-slate-200">
          {parseLine(lineContent, lineIdx)}
        </li>
      );
    } else {
      if (inList) {
        inList = false;
        elements.push(
          <ul key={`ul-${lineIdx}`} className="my-2 space-y-1">
            {currentListItems}
          </ul>
        );
        currentListItems = [];
      }
      
      const trimmed = line.trim();
      elements.push(
        trimmed === "" ? (
          <div key={`space-${lineIdx}`} className="h-3" />
        ) : (
          <p key={`p-${lineIdx}`} className="mb-2 text-slate-800 dark:text-slate-200">
            {parseLine(line, lineIdx)}
          </p>
        )
      );
    }
  });

  if (inList) {
    elements.push(
      <ul key="ul-end" className="my-2 space-y-1">
        {currentListItems}
      </ul>
    );
  }

  return <div className="space-y-1">{elements}</div>;
};

interface CitationsPanelProps {
  citations: Citation[];
}

function CitationsPanel({ citations }: CitationsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3 bg-white dark:bg-[#1E1E22] border-2 border-black dark:border-white rounded-xl shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] overflow-hidden transition-all text-xs font-semibold max-w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#242428] border-b-2 border-black dark:border-b-white flex items-center justify-between font-black uppercase text-[9px] sm:text-[10px] tracking-wider cursor-pointer text-slate-705 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
      >
        <span className="flex items-center space-x-1.5">
          <BookOpen className="w-3.5 h-3.5 text-purple-650 shrink-0" />
          <span>Sources Cited ({citations.length})</span>
        </span>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
      </button>

      {isOpen && (
        <div className="p-3 space-y-2.5 bg-white dark:bg-[#1E1E22] divide-y-2 divide-dotted divide-slate-200 dark:divide-slate-700">
          {citations.map((cit, idx) => {
            const isSnippetOpen = expandedIndex === idx;
            const scorePct = Math.round(cit.similarity_score * 100);
            return (
              <div key={idx} className={idx > 0 ? "pt-2.5" : ""}>
                {/* Citation Header Trigger */}
                <button
                  type="button"
                  onClick={() => setExpandedIndex(isSnippetOpen ? null : idx)}
                  className="w-full text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-[#242428] p-2 rounded-lg cursor-pointer transition-all border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="flex items-center space-x-2 truncate max-w-full sm:max-w-[70%]">
                    <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate font-bold text-black dark:text-white" title={cit.filename}>
                      {cit.filename}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/40 text-[8px] text-purple-600 dark:text-purple-400 font-extrabold border border-purple-200 dark:border-purple-800 shrink-0">
                      Page {cit.page || 1}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[9px] text-slate-500 font-bold font-mono uppercase">
                      ID: {cit.chunk_id.substring(0, 8)}...
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-[8px] text-emerald-600 dark:text-emerald-400 font-extrabold border border-emerald-200 dark:border-emerald-800 font-mono shrink-0">
                      {scorePct}% Match
                    </span>
                  </div>
                </button>

                {/* Snippet display */}
                {isSnippetOpen && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-[#25252A] border-2 border-black dark:border-white rounded-lg text-[10px] sm:text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 font-semibold italic border-dashed select-text">
                    "{cit.text}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastUserPrompt, setLastUserPrompt] = useState("");

  // History list and pagination states
  const [activeSessionId, setActiveSessionId] = useState<string>(() => "session_" + Date.now());
  const [historyList, setHistoryList] = useState<ChatHistorySession[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historySearch, setHistorySearch] = useState("");
  const [historySearchInput, setHistorySearchInput] = useState("");
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const loadHistoryList = async (pageVal: number, searchVal?: string) => {
    try {
      const data = await getChatHistory(pageVal, 5, searchVal);
      setHistoryList(data.items || []);
      setHistoryTotalPages(data.total_pages || 1);
    } catch (e) {
      console.warn("Failed to load history list:", e);
    }
  };

  useEffect(() => {
    loadHistoryList(historyPage, historySearch);
  }, [historyPage, historySearch]);

  const updateAndSaveSession = async (updatedMessages: Message[], latestText?: string) => {
    const firstUserMsg = updatedMessages.find((m) => m.sender === "user")?.text || "New Chat Session";
    const title = firstUserMsg.length > 30 ? firstUserMsg.substring(0, 30) + "..." : firstUserMsg;

    const session: ChatHistorySession = {
      id: activeSessionId,
      title,
      lastQuestion: latestText || firstUserMsg,
      timestamp: new Date().toISOString(),
      messages: updatedMessages
    };

    await saveConversation(session);
    loadHistoryList(historyPage, historySearch);
  };

  const startNewChat = () => {
    setActiveSessionId("session_" + Date.now());
    setMessages([
      {
        id: "msg-1",
        sender: "ai",
        text: "Hello! I am your Atlas AI Assistant. I have indexed your connected sources and synthesized your Company Brain. Ask me anything about your project plans, wikis, codebase, or documents.",
        timestamp: "Just now"
      }
    ]);
    setChatError(null);
    setLastUserPrompt("");
    setIsMobileHistoryOpen(false);
  };

  const handleLoadSession = (session: ChatHistorySession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages);
    setChatError(null);
    setLastUserPrompt(session.lastQuestion || "");
    setIsMobileHistoryOpen(false);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    await deleteConversation(sessionId);
    if (activeSessionId === sessionId) {
      startNewChat();
    } else {
      loadHistoryList(historyPage, historySearch);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHistorySearch(historySearchInput);
    setHistoryPage(1);
  };

  const renderHistorySidebarContents = () => {
    return (
      <div className="flex-1 flex flex-col min-h-0 justify-between">
        <div className="flex-col flex min-h-0 space-y-4">
          <button
            onClick={startNewChat}
            className="w-full py-3 border-2 border-black dark:border-white bg-purple-300 dark:bg-purple-650 hover:bg-purple-400 text-black dark:text-white rounded-xl text-[10px] font-black tracking-wider shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000000] dark:hover:shadow-[2px_2px_0px_#FFFFFF] transition-all uppercase cursor-pointer"
          >
            + Start New Session
          </button>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Search history..."
              value={historySearchInput}
              onChange={(e) => setHistorySearchInput(e.target.value)}
              className="flex-1 px-3 py-2 bg-white dark:bg-[#242427] border-2 border-black dark:border-white rounded-lg text-[10px] font-semibold text-black dark:text-white focus:outline-none shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]"
            />
            <button
              type="submit"
              className="px-3 border-2 border-black dark:border-white bg-slate-100 hover:bg-slate-200 dark:bg-[#2D2D32] dark:hover:bg-slate-800 rounded-lg text-[9px] font-black uppercase cursor-pointer"
            >
              Go
            </button>
          </form>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[150px]">
            {historyList.length > 0 ? (
              historyList.map((session) => {
                const isActive = session.id === activeSessionId;
                const formattedTime = new Date(session.timestamp).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });
                return (
                  <div
                    key={session.id}
                    onClick={() => handleLoadSession(session)}
                    className={`p-3.5 rounded-xl border-2 border-black dark:border-white text-left cursor-pointer transition-all flex justify-between items-start gap-2 shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] hover:bg-slate-50 dark:hover:bg-[#242428] ${
                      isActive ? "bg-purple-100 dark:bg-purple-955/25 border-purple-650" : "bg-white dark:bg-[#1E1E22]"
                    }`}
                  >
                    <div className="overflow-hidden flex-1 space-y-1">
                      <span className="text-[10px] font-black text-black dark:text-white block truncate uppercase tracking-wider">
                        {session.title}
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold block truncate">
                        {session.lastQuestion || "No query history"}
                      </span>
                      <span className="text-[8px] text-slate-450 dark:text-slate-400 font-bold block font-mono">
                        {formattedTime}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      className="p-1 border border-transparent hover:border-rose-500 hover:bg-rose-50 rounded-lg text-slate-450 hover:text-rose-600 transition-all cursor-pointer shrink-0 mt-0.5"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2px]" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-slate-400 text-[10px] uppercase font-black">
                No past sessions
              </div>
            )}
          </div>
        </div>

        {historyTotalPages > 1 && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex items-center justify-between text-[9px] font-black uppercase text-black dark:text-white select-none">
            <button
              onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
              disabled={historyPage === 1}
              className="px-2.5 py-1.5 border-2 border-black dark:border-white bg-white dark:bg-[#242427] hover:bg-slate-50 dark:hover:bg-slate-800 rounded disabled:opacity-40 cursor-pointer"
            >
              Prev
            </button>
            <span>
              Page {historyPage} of {historyTotalPages}
            </span>
            <button
              onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
              disabled={historyPage === historyTotalPages}
              className="px-2.5 py-1.5 border-2 border-black dark:border-white bg-white dark:bg-[#242427] hover:bg-slate-50 dark:hover:bg-slate-800 rounded disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const performSendMessage = async (userQuery: string, currentHistory: Message[]) => {
    setChatError(null);
    setIsTyping(true);

    try {
      // Map frontend message history to backend ChatHistoryItem format
      // Skip the initial AI greeting messages (msg-1 / msg-init) and any error messages
      const historyParam: ChatHistoryItem[] = currentHistory
        .filter((msg) => msg.id !== "msg-1" && msg.id !== "msg-init" && !msg.error)
        .map((msg) => ({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        }));

      const reply = await sendChatMessage(userQuery, historyParam);

      // Fetch semantic context citations matching query
      let citations: Citation[] = [];
      try {
        const searchResults = await searchDocuments(userQuery, 3);
        citations = searchResults.map((res) => {
          // Generate a stable mock page number based on character code sum of the chunk ID
          const pageNum = Math.floor(Math.abs(res.chunk_id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 5) + 1;
          return {
            ...res,
            page: pageNum
          };
        });
      } catch (e) {
        console.warn("Could not retrieve citations:", e);
      }

      const aiMessage: Message = {
        id: "msg_ai_" + Date.now(),
        sender: "ai",
        text: reply,
        citations,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => {
        const next = [...prev, aiMessage];
        updateAndSaveSession(next, userQuery);
        return next;
      });
    } catch (err: unknown) {
      console.error("AI chat communication error:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setChatError(errMsg || "Failed to reach cognitive model endpoint.");
      
      const errorMessage: Message = {
        id: "msg_err_" + Date.now(),
        sender: "ai",
        text: "System Error: Unable to complete prompt execution. Please verify workspace backend connection and retry.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: true
      };
      setMessages((prev) => {
        const next = [...prev, errorMessage];
        updateAndSaveSession(next, userQuery);
        return next;
      });
    } finally {
      setIsTyping(false);
    }
  };

  // Handle message response generation
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userQuery = inputText.trim();
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastUserPrompt(userQuery);

    // Append user message
    const userMessage: Message = {
      id: "msg_user_" + Date.now(),
      sender: "user",
      text: userQuery,
      timestamp: timestampStr
    };

    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInputText("");
    await updateAndSaveSession(nextHistory, userQuery);
    
    await performSendMessage(userQuery, nextHistory);
  };

  // Retry failed prompt logic
  const handleRetry = async () => {
    if (!lastUserPrompt || isTyping) return;
    
    // Filter out previous error messages
    const filteredHistory = messages.filter((m) => !m.error);
    setMessages(filteredHistory);
    setChatError(null);
    await updateAndSaveSession(filteredHistory, lastUserPrompt);

    await performSendMessage(lastUserPrompt, filteredHistory);
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
    setChatError(null);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full relative font-sans text-black dark:text-white">
      
      {/* Header */}
      <header className="h-20 border-b-2 border-black dark:border-white px-4 sm:px-8 flex items-center justify-between bg-white dark:bg-[#1C1C1E] z-10 transition-colors">
        <div className="flex items-center space-x-3">
          {/* Mobile History Toggle Button */}
          <button
            onClick={() => setIsMobileHistoryOpen(!isMobileHistoryOpen)}
            className="md:hidden p-2 border-2 border-black dark:border-white bg-white dark:bg-[#242427] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] cursor-pointer"
            title="Toggle chat history"
          >
            <BookOpen className="w-4 h-4 text-purple-650" />
          </button>
          <div>
            <h1 className="text-xs sm:text-base font-black uppercase tracking-wider text-black dark:text-white">
              AI Cognitive Chat
            </h1>
            <p className="text-[9px] sm:text-[10px] text-slate-800 dark:text-slate-400 font-extrabold">
              Search, retrieve and summarize information from your active Company Brain.
            </p>
          </div>
        </div>
        <button
          onClick={handleClearHistory}
          className="flex items-center space-x-1.5 px-3 py-2 text-xs font-black text-black dark:text-white border-2 border-black dark:border-white bg-white dark:bg-[#242427] hover:bg-slate-100 dark:hover:bg-[#2E2E32] rounded-lg shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] transition-all cursor-pointer uppercase"
        >
          <Trash2 className="w-3.5 h-3.5 stroke-[2px]" />
          <span className="hidden sm:inline">Clear Chat</span>
        </button>
      </header>

      {/* Mobile Chat History Drawer Overlay */}
      {isMobileHistoryOpen && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-30 md:hidden flex" onClick={() => setIsMobileHistoryOpen(false)}>
          <div className="w-72 h-full bg-white dark:bg-[#1C1C1E] border-r-3 border-black dark:border-white flex flex-col p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-3">
              <span className="font-black uppercase text-xs tracking-wider">Chat History</span>
              <button onClick={() => setIsMobileHistoryOpen(false)} className="p-1 border-2 border-black rounded bg-white hover:bg-slate-100 dark:bg-[#242427] dark:hover:bg-slate-800 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {renderHistorySidebarContents()}
          </div>
        </div>
      )}

      {/* Main chat grid */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Desktop Chat History Sidebar */}
        <div className="w-72 border-r-3 border-black dark:border-white bg-white dark:bg-[#1C1C1E] p-5 hidden md:flex flex-col shrink-0 transition-colors">
          {renderHistorySidebarContents()}
        </div>
        
        {/* Left Side: Messaging Thread */}
        <div className="flex-1 flex flex-col justify-between bg-[#FAF9F6] dark:bg-[#18181A] overflow-y-auto p-6 sm:p-8 space-y-6 transition-colors">
          
          {/* Scrollable message frame */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {messages.map((msg) => {
              const isAI = msg.sender === "ai";
              const isErr = msg.error;
              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-4.5 ${!isAI ? "flex-row-reverse space-x-reverse" : ""}`}
                >
                  {/* Avatar */}
                  <div className={`h-9.5 w-9.5 rounded-xl border-2 border-black dark:border-white shrink-0 flex items-center justify-center text-xs font-bold overflow-hidden shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] ${
                    isAI
                      ? isErr ? "bg-rose-250 dark:bg-rose-950 text-rose-600" : "bg-yellow-200 dark:bg-yellow-600 text-black dark:text-white"
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
                        ? isErr ? "bg-rose-50 dark:bg-rose-955/25 text-rose-600 font-semibold" : "bg-white dark:bg-[#1C1C1E] text-black dark:text-white"
                        : "bg-purple-100 dark:bg-purple-955/25 text-black dark:text-white"
                    }`}>
                      {isAI && isErr ? (
                        <div className="space-y-3">
                          <p>{msg.text}</p>
                          <button
                            type="button"
                            onClick={handleRetry}
                            className="flex items-center space-x-1.5 px-3 py-1.5 border-2 border-rose-500 bg-white dark:bg-[#1D1D20] hover:bg-rose-50 dark:hover:bg-rose-955/20 text-rose-600 dark:text-rose-400 rounded-lg text-[9px] font-black tracking-wider uppercase cursor-pointer transition-all shadow-[2px_2px_0px_#EF4444]"
                          >
                            <RefreshCw className="w-3 h-3 shrink-0" />
                            <span>Retry Prompt</span>
                          </button>
                        </div>
                      ) : (
                        formatMessageText(msg.text)
                      )}
                    </div>
                    {isAI && msg.citations && msg.citations.length > 0 && (
                      <CitationsPanel citations={msg.citations} />
                    )}
                    {(() => {
                      const hasCitations = msg.citations && msg.citations.length > 0;
                      const isNormalAi = isAI && !isErr && msg.id !== "msg-1" && msg.id !== "msg-init" && hasCitations;
                      const confidence = hasCitations
                        ? Math.round(Math.max(...msg.citations!.map(c => c.similarity_score)) * 100)
                        : 0;
                      
                      return (
                        <div className={`flex flex-wrap items-center gap-2 px-2 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide ${!isAI ? "justify-end" : "justify-start"}`}>
                          <span>{msg.timestamp}</span>
                          {isAI && !isErr && (
                            <>
                              <span>&bull;</span>
                              <button
                                type="button"
                                onClick={() => handleCopyMessageText(msg.text, msg.id)}
                                className="flex items-center space-x-1 hover:text-purple-650 dark:hover:text-purple-400 cursor-pointer transition-colors text-slate-500 font-black uppercase text-[8px] sm:text-[9px]"
                                title="Copy full response"
                              >
                                {copiedMessageId === msg.id ? (
                                  <>
                                    <Check className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                                    <span className="text-emerald-500 font-bold">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-2.5 h-2.5 shrink-0" />
                                    <span>Copy Text</span>
                                  </>
                                )}
                              </button>
                            </>
                          )}
                          {isNormalAi && (
                            <>
                              <span>&bull;</span>
                              <div className="relative group flex items-center cursor-help">
                                <span className={`px-1.5 py-0.5 rounded border border-black dark:border-white flex items-center gap-0.5 shadow-[1px_1px_0px_#000000] dark:shadow-[1px_1px_0px_#FFFFFF] ${
                                  confidence >= 90
                                    ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-500"
                                    : confidence >= 70
                                    ? "bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-500"
                                    : "bg-rose-100 dark:bg-rose-955/30 text-rose-600 dark:text-rose-400 border-rose-500"
                                }`}>
                                  <span>Confidence: {confidence}%</span>
                                </span>
                                {/* Hover Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 p-2.5 bg-black dark:bg-[#242427] text-white dark:text-slate-200 text-[8px] sm:text-[9px] font-bold rounded-lg border border-slate-700 dark:border-slate-600 shadow-lg leading-relaxed text-center normal-case z-20">
                                  Confidence score is based on the semantic match similarity of retrieved sources in your Company Brain.
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}
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
                  <span className="text-xs font-extrabold text-black dark:text-white">Thinking...</span>
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
              className="px-6 py-4 rounded-xl bg-purple-300 dark:bg-purple-650 hover:bg-purple-400 border-2 border-black dark:border-white text-black dark:text-white shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[1.5px_1.5px_0px_#000000] transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4.5 h-4.5 text-black dark:text-white stroke-[3px]" />
            </button>
          </form>
        </div>

        {/* Right Side: Info Panel */}
        <div className="w-82 border-l-3 border-black dark:border-white bg-white dark:bg-[#1C1C1E] p-6 hidden lg:flex flex-col justify-between shrink-0 transition-colors">
          <div>
            <div className="flex items-center space-x-2 border-b-2 border-black dark:border-white pb-4 mb-5">
              <BookOpen className="w-4.5 h-4.5 text-black dark:text-white stroke-[2.5px]" />
              <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-wider">Workspace Chat</h2>
            </div>
            
            <p className="text-[10px] text-slate-800 dark:text-slate-400 font-bold leading-relaxed mb-6">
              This panel provides details on conversational memory state synced with the cognitive model parameters.
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border-2 border-black dark:border-white bg-[#FAF9F6] dark:bg-[#18181A] shadow-[3px_3px_0px_#000000]">
                <span className="px-1.5 py-0.5 rounded border border-black dark:border-white bg-white dark:bg-[#242427] text-[8px] font-black text-black dark:text-white tracking-wide uppercase inline-block mb-2">
                  Gemini API v1
                </span>
                <h3 className="text-xs font-black uppercase tracking-wide mb-1">Active Memory Logs</h3>
                <p className="text-[10px] text-slate-700 dark:text-slate-400 font-semibold leading-relaxed">
                  Context persistence handles the last {messages.length - 1} turns automatically inside requests history payload.
                </p>
              </div>

              {chatError && (
                <div className="p-4 rounded-xl border-2 border-rose-500 bg-rose-50 dark:bg-rose-955/25 text-rose-600 font-bold text-[10px] flex flex-col gap-2.5 shadow-[3px_3px_0px_#000000]">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="w-4.5 h-4.5 shrink-0 stroke-[2px]" />
                    <div>
                      <span className="block font-black uppercase text-[9px]">API Connection Loss</span>
                      <span className="block mt-0.5 font-semibold text-rose-700 dark:text-rose-450">{chatError}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="w-full py-2 border-2 border-black dark:border-white bg-white dark:bg-[#242427] hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl text-[9px] font-black tracking-wider shadow-[2px_2px_0px_#000000] hover:translate-x-[0.5px] hover:translate-y-[0.5px] transition-all uppercase cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Last Message</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F6] dark:bg-[#18181A] border-2 border-black dark:border-white text-[10px] text-slate-800 dark:text-slate-400 font-bold flex items-start space-x-2 shrink-0 shadow-[2px_2px_0px_#000000]">
            <Info className="w-4.5 h-4.5 text-black dark:text-white stroke-[2.5px] shrink-0 mt-0.5" />
            <span className="leading-relaxed font-bold">Responses are generated by feeding conversational memory context and semantic index matches to Gemini.</span>
          </div>
        </div>

      </div>

    </div>
  );
}

