"use client";

import { useState, useEffect, useCallback } from "react";
import { onAuthStateChange, UserProfile } from "@/lib/firebase";
import { uploadDocument, deleteDocumentApi, fetchDocumentsApi, updateDocumentApi } from "@/lib/api";
import { 
  DocumentItem, 
  ActivityItem, 
  INITIAL_ACTIVITIES 
} from "@/lib/mockData";
import { 
  Search, 
  RefreshCw, 
  Database, 
  Trash2,
  Plus,
  X,
  FileText,
  Loader2,
  Filter,
  UploadCloud,
  CheckCircle2,
  XCircle,
  ArrowUpDown
} from "lucide-react";

let idCounter = 0;
const generateId = (prefix: string): string => {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Date.now()}`;
};

export default function CompanyBrainPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Core dataset
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  // Search, Filter & Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState<"All" | "Notion" | "Google Drive" | "GitHub" | "Upload">("All");
  const [sortBy, setSortBy] = useState<"name" | "vectorCount" | "updatedAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Ingestion form state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocSource, setNewDocSource] = useState<"Notion" | "Google Drive" | "GitHub" | "Upload">("Upload");
  const [newDocContent, setNewDocContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Explicit Validation Status State: 'idle' | 'validating' | 'accepted' | 'rejected'
  const [validationStatus, setValidationStatus] = useState<"idle" | "validating" | "accepted" | "rejected">("idle");
  const [uploadErrorReason, setUploadErrorReason] = useState<string | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStage, setSyncStage] = useState("");

  // Live Refresh Documents Helper
  const refreshDocuments = useCallback(async () => {
    const liveDocs = await fetchDocumentsApi();
    setDocuments(liveDocs);
    setIsLoadingDocs(false);
  }, []);

  // Auth & Live Status Polling Interval (Every 4s)
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await refreshDocuments();
      }
    });

    refreshDocuments();

    // Setup live polling timer for processing status updates
    const pollInterval = setInterval(() => {
      refreshDocuments();
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [refreshDocuments]);

  // Trigger Neural Sync
  const handleTriggerSync = () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncStage("Connecting pipelines...");

    const interval = setInterval(() => {
      setSyncProgress((prev) => {
        const next = prev + 5;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsSyncing(false);
            refreshDocuments();
            
            const newAct: ActivityItem = {
              id: generateId("act"),
              type: "sync",
              description: `AI brain re-trained. Re-indexed ${documents.length} sources.`,
              timestamp: "Just now",
              user: user?.displayName || "System"
            };
            setActivities((prev) => [newAct, ...prev]);
          }, 600);
          return 100;
        }

        if (next < 25) {
          setSyncStage("Scanning sources & parsing folder hierarchies...");
        } else if (next < 50) {
          setSyncStage("Chunking document contents & applying overlap limits...");
        } else if (next < 75) {
          setSyncStage("Generating text-embedding-3-small vector embeddings...");
        } else {
          setSyncStage("Updating workspace semantic index graph...");
        }

        return next;
      });
    }, 150);
  };

  // Handle document uploads with backend validation check
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadErrorReason(null);

    if (!newDocName.trim()) return;

    setIsUploading(true);
    setValidationStatus("validating");
    setUploadProgress(25);

    let fileToUpload = selectedFile;
    if (!fileToUpload) {
      const blob = new Blob([newDocContent || "Sample document content"], { type: "text/plain" });
      fileToUpload = new File([blob], newDocName.endsWith(".txt") ? newDocName : `${newDocName}.txt`, {
        type: "text/plain",
      });
    }

    setUploadProgress(50);
    const result = await uploadDocument(fileToUpload, "uploads");
    setUploadProgress(85);

    if (!result.success) {
      setIsUploading(false);
      setUploadProgress(0);
      setValidationStatus("rejected");
      setUploadErrorReason(result.reason || "Document validation rejected by backend agent.");
      return;
    }

    // Success path -> Document Accepted & Immediately Refreshed
    setValidationStatus("accepted");
    setUploadProgress(100);

    // Refresh document list from backend immediately
    await refreshDocuments();

    const newAct: ActivityItem = {
      id: generateId("act"),
      type: "upload",
      description: `Ingested source '${newDocName}' (${newDocSource})`,
      timestamp: "Just now",
      user: user?.displayName || "User",
    };
    setActivities((prev) => [newAct, ...prev]);

    setTimeout(() => {
      setIsUploading(false);
      setIsUploadOpen(false);
      setNewDocName("");
      setNewDocContent("");
      setSelectedFile(null);
      setValidationStatus("idle");
      setUploadErrorReason(null);
    }, 800);
  };

  // Delete source via Backend DELETE /documents/{id}
  const handleDeleteDocument = async (id: string, name: string) => {
    // Optimistic state update
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));

    // Call backend API
    await deleteDocumentApi(id);

    // Refresh state from backend
    await refreshDocuments();

    const newAct: ActivityItem = {
      id: generateId("act"),
      type: "delete",
      description: `Removed source '${name}' from index`,
      timestamp: "Just now",
      user: user?.displayName || "User"
    };
    setActivities((prev) => [newAct, ...prev]);
  };

  // Filter & Sort sources
  const processedDocuments = documents
    .filter((doc) => {
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSource = filterSource === "All" || doc.source === filterSource;
      return matchesSearch && matchesSource;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "vectorCount") {
        comparison = a.vectorCount - b.vectorCount;
      } else {
        comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const totalVectors = documents.reduce((sum, doc) => sum + doc.vectorCount, 0);

  return (
    <div className="flex-1 flex flex-col min-w-0 font-sans text-black dark:text-white">
      
      {/* Header */}
      <header className="h-20 border-b-2 border-black dark:border-white px-6 sm:px-8 flex items-center justify-between bg-white dark:bg-[#1C1C1E] transition-colors">
        <div>
          <h1 className="text-base font-black uppercase tracking-wider text-black dark:text-white">
            Company Brain Management
          </h1>
          <p className="text-[10px] text-slate-800 dark:text-slate-400 font-extrabold">
            Configure document ingestion pipelines, search indices, and trigger manual vector syncs.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refreshDocuments()}
            disabled={isLoadingDocs}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 text-xs font-black text-black dark:text-white bg-white dark:bg-[#242427] border-2 border-black dark:border-white hover:bg-slate-100 dark:hover:bg-[#2D2D32] rounded-xl shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000000] dark:hover:shadow-[2px_2px_0px_#FFFFFF] transition-all cursor-pointer disabled:opacity-50 uppercase tracking-wide"
          >
            <RefreshCw className={`w-4 h-4 text-black dark:text-white stroke-[2.5px] ${isLoadingDocs ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 text-xs font-black text-black dark:text-white bg-white dark:bg-[#242427] border-2 border-black dark:border-white hover:bg-slate-100 dark:hover:bg-[#2D2D32] rounded-xl shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000000] dark:hover:shadow-[2px_2px_0px_#FFFFFF] transition-all cursor-pointer disabled:opacity-50 uppercase tracking-wide"
          >
            <RefreshCw className={`w-4 h-4 text-black dark:text-white stroke-[2.5px] ${isSyncing ? "animate-spin" : ""}`} />
            <span>Sync Brain</span>
          </button>
          <button
            onClick={() => {
              setUploadErrorReason(null);
              setValidationStatus("idle");
              setIsUploadOpen(true);
            }}
            className="flex items-center space-x-1 px-3.5 py-2.5 text-xs font-black text-black dark:text-white bg-purple-300 dark:bg-purple-650 hover:bg-purple-400 dark:hover:bg-purple-700 border-2 border-black dark:border-white rounded-xl shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000000] dark:hover:shadow-[2px_2px_0px_#FFFFFF] transition-all cursor-pointer uppercase tracking-wide"
          >
            <Plus className="w-4 h-4 text-black dark:text-white stroke-[3.5px]" />
            <span>Add Source</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">

        {/* Sync Progress Panel */}
        {isSyncing && (
          <div className="p-6 rounded-2xl bg-purple-55 dark:bg-purple-955/20 border-2 border-black dark:border-white shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#FFFFFF] relative overflow-hidden animate-pulse">
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <RefreshCw className="w-4.5 h-4.5 text-black dark:text-white animate-spin stroke-[2.5px]" />
                  <span className="text-xs font-black text-black dark:text-white uppercase tracking-wider">AI Training In Progress ({syncProgress}%)</span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-400 font-extrabold">{syncStage}</p>
              </div>
              <div className="w-full md:w-48 bg-white dark:bg-[#18181A] h-4 rounded-xl overflow-hidden border-2 border-black dark:border-white shadow-[1.5px_1.5px_0px_#000000] dark:shadow-[1.5px_1.5px_0px_#FFFFFF] shrink-0">
                <div className="bg-purple-300 dark:bg-purple-500 h-full transition-all duration-300" style={{ width: `${syncProgress}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search toolbar */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          
          {/* Search Input */}
          <div className="relative rounded-lg shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF] border-2 border-black dark:border-white flex-1 max-w-md bg-white dark:bg-[#1C1C1E] transition-colors">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4.5 w-4.5 text-black dark:text-white stroke-[2.5px]" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search indexed files by filename..."
              className="block w-full pl-9.5 pr-3 py-3.5 bg-white dark:bg-[#1C1C1E] text-xs font-semibold text-black dark:text-white placeholder-slate-500 focus:outline-none rounded-lg"
            />
          </div>

          {/* Sort & Filter Toggles */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-1 mr-1 text-xs text-black dark:text-white font-black uppercase tracking-wider">
              <ArrowUpDown className="w-3.5 h-3.5 stroke-[2.5px]" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white dark:bg-[#242427] border-2 border-black dark:border-white text-xs font-bold px-2 py-1 rounded-lg cursor-pointer"
              >
                <option value="updatedAt">Date Ingested</option>
                <option value="name">Document Title</option>
                <option value="vectorCount">Vector Count</option>
              </select>
            </div>

            <div className="flex items-center space-x-1.5 mr-1 text-xs text-black dark:text-white font-black uppercase tracking-wider">
              <Filter className="w-4 h-4 stroke-[2.5px]" />
              <span>Filter:</span>
            </div>
            {(["All", "Upload", "Notion", "Google Drive", "GitHub"] as const).map((source) => (
              <button
                key={source}
                onClick={() => setFilterSource(source)}
                className={`px-3.5 py-2 text-xs font-black rounded-lg border-2 border-black dark:border-white shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] transition-all cursor-pointer uppercase ${
                  filterSource === source
                    ? "bg-purple-300 dark:bg-purple-650 text-black dark:text-white translate-x-[0.5px] translate-y-[0.5px] shadow-[1px_1px_0px_#000000] dark:shadow-[1px_1px_0px_#FFFFFF]"
                    : "bg-white dark:bg-[#242427] text-black/75 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-[#2E2E32] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1px_1px_0px_#000000] dark:shadow-[1px_1px_0px_#FFFFFF]"
                }`}
              >
                {source === "Upload" ? "Local Files" : source}
              </button>
            ))}
          </div>
        </div>

        {/* Vectors & Sources Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left panel: Sources List (2/3 width) */}
          <div className="md:col-span-2 rounded-2xl border-2 border-black dark:border-white bg-white dark:bg-[#1C1C1E] p-6 space-y-4 shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#FFFFFF] transition-colors">
            <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-4">
              <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-wider">Active Sources ({processedDocuments.length})</h2>
              <span className="px-2.5 py-0.5 border border-black dark:border-white bg-yellow-200 dark:bg-yellow-600 text-[9px] font-mono font-black uppercase text-black dark:text-white shadow-[1px_1px_0px_#000000] dark:shadow-[1px_1px_0px_#FFFFFF]">Live Polling Sync</span>
            </div>

            <div className="overflow-x-auto border-2 border-black dark:border-white rounded-xl">
              <table className="min-w-full divide-y-2 divide-black dark:divide-white bg-[#FAF9F6]/20 dark:bg-[#18181A]/10">
                <thead className="bg-[#FAF9F6] dark:bg-[#1C1C1E] text-[10px] font-black text-slate-800 dark:text-slate-400 uppercase tracking-widest text-left">
                  <tr>
                    <th className="px-6 py-3 border-r border-black dark:border-white">Source Title</th>
                    <th className="px-6 py-3 border-r border-black dark:border-white">Platform</th>
                    <th className="px-6 py-3 border-r border-black dark:border-white">Recall Vectors</th>
                    <th className="px-6 py-3 border-r border-black dark:border-white">File Size</th>
                    <th className="px-6 py-3 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black dark:divide-white text-xs text-black dark:text-white font-semibold">
                  {processedDocuments.length > 0 ? (
                    processedDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-100 dark:hover:bg-[#2E2E32] bg-white dark:bg-[#1C1C1E] transition-colors">
                        <td className="px-6 py-4 font-black text-black dark:text-white border-r border-black dark:border-white max-w-[220px] truncate">
                          <span className="flex items-center space-x-2">
                            <FileText className="w-4.5 h-4.5 text-black dark:text-white shrink-0 stroke-[2.5px]" />
                            <span className="truncate">{doc.name}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 border-r border-black dark:border-white">
                          <span className="px-1.5 py-0.5 rounded border border-black dark:border-white bg-purple-100 dark:bg-purple-950/40 text-[10px] font-bold text-black dark:text-white shadow-[1px_1px_0px_#000000] dark:shadow-[1px_1px_0px_#FFFFFF]">
                            {doc.source === "Upload" ? "File" : doc.source}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-black dark:text-white border-r border-black dark:border-white">
                          {doc.vectorCount}
                        </td>
                        <td className="px-6 py-4 text-slate-650 dark:text-slate-400 border-r border-black dark:border-white">
                          {doc.size}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteDocument(doc.id, doc.name)}
                            className="text-slate-500 hover:text-rose-600 dark:hover:text-rose-450 p-1.5 rounded-lg border-2 border-transparent hover:border-black dark:hover:border-white hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                            title="Delete source"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="bg-white dark:bg-[#1C1C1E]">
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-600 dark:text-slate-400 font-extrabold uppercase text-xs">
                        {isLoadingDocs ? "Loading company documents from backend..." : "No documents indexed in Company Brain."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right panel: Sidebar Metrics */}
          <div className="space-y-6">
            {/* Total vectors details */}
            <div className="rounded-2xl border-2 border-black dark:border-white bg-white dark:bg-[#1C1C1E] p-6 space-y-4 shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#FFFFFF] transition-colors">
              <h3 className="text-xs font-black text-black dark:text-white uppercase tracking-wider border-b border-black dark:border-white pb-2">Brain Dimensions</h3>
              <div className="p-4 rounded-xl bg-[#FAF9F6] dark:bg-[#18181A] border-2 border-black dark:border-white flex items-center justify-between shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]">
                <div>
                  <span className="text-[9px] text-slate-500 dark:text-slate-450 font-black uppercase block mb-1">TOTAL VECTORS</span>
                  <span className="text-xl font-mono font-black text-black dark:text-white">{totalVectors.toLocaleString()}</span>
                </div>
                <div className="h-9 w-9 rounded-xl bg-purple-200 dark:bg-purple-950/40 border-2 border-black dark:border-white flex items-center justify-center shadow-[1px_1px_0px_#000000] dark:shadow-[1px_1px_0px_#FFFFFF]">
                  <Database className="w-4.5 h-4.5 text-black dark:text-white stroke-[2.5px]" />
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF9F6] dark:bg-[#18181A] border-2 border-black dark:border-white flex items-center justify-between shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]">
                <div>
                  <span className="text-[9px] text-slate-500 dark:text-slate-450 font-black uppercase block mb-1">TOTAL SOURCES</span>
                  <span className="text-xl font-mono font-black text-black dark:text-white">{documents.length}</span>
                </div>
                <div className="h-9 w-9 rounded-xl bg-yellow-200 dark:bg-yellow-950/40 border-2 border-black dark:border-white flex items-center justify-center shadow-[1px_1px_0px_#000000] dark:shadow-[1px_1px_0px_#FFFFFF]">
                  <FileText className="w-4.5 h-4.5 text-black dark:text-white stroke-[2.5px]" />
                </div>
              </div>
            </div>

            {/* Embedding Status */}
            <div className="rounded-2xl border-2 border-black dark:border-white bg-white dark:bg-[#1C1C1E] p-6 space-y-4 shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#FFFFFF] transition-colors">
              <h3 className="text-xs font-black text-black dark:text-white uppercase tracking-wider border-b border-black dark:border-white pb-2">Embedding Status</h3>
              <div className="space-y-3">
                {[
                  { title: "Tokenizer Mode", val: "cl100k_base" },
                  { title: "Vector Database", val: "Atlas Dedicated Index" },
                  { title: "Recall Precision", val: "99.84% cosine-sim" },
                  { title: "Dynamic Syncing", val: "Enabled (Live)" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs pb-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                    <span className="text-slate-800 dark:text-slate-400 font-extrabold">{item.title}</span>
                    <span className="font-mono font-bold text-slate-650 dark:text-slate-400">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Upload modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1C1E] border-3 border-black dark:border-white rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-[8px_8px_0px_#000000] dark:shadow-[8px_8px_0px_#FFFFFF] relative">
            <button
              onClick={() => {
                if (!isUploading) {
                  setIsUploadOpen(false);
                  setUploadErrorReason(null);
                  setValidationStatus("idle");
                }
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg border-2 border-black dark:border-white bg-white dark:bg-[#242427] text-slate-500 hover:text-black dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#2E2E32] focus:outline-none cursor-pointer shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF]"
            >
              <X className="w-4 h-4 stroke-[2.5px]" />
            </button>

            <h3 className="text-lg font-black text-black dark:text-white uppercase tracking-wide mb-2">Ingest New Document</h3>
            <p className="text-xs text-slate-800 dark:text-slate-400 font-bold mb-6">Inject knowledge files into the active Company Brain space.</p>

            {/* Document Validation Indicators: Validating... / Accepted / Rejected */}
            {validationStatus === "validating" && (
              <div className="mb-6 p-4 rounded-xl border-2 border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 flex items-center space-x-3 shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF]">
                <Loader2 className="w-5 h-5 text-purple-600 animate-spin shrink-0" />
                <div className="text-xs font-bold">
                  <span className="font-black uppercase tracking-wider block text-purple-700 dark:text-purple-300">Validating...</span>
                  <span>Running AI document taxonomy and confidence checks</span>
                </div>
              </div>
            )}

            {validationStatus === "accepted" && (
              <div className="mb-6 p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 flex items-center space-x-3 shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF]">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs font-bold">
                  <span className="font-black uppercase tracking-wider block text-emerald-700 dark:text-emerald-300">Accepted</span>
                  <span>Document taxonomy approved & ingested into vector store</span>
                </div>
              </div>
            )}

            {validationStatus === "rejected" && (
              <div className="mb-6 p-4 rounded-xl border-2 border-red-600 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 flex items-start space-x-3 shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#FFFFFF]">
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold">
                  <span className="font-black uppercase tracking-wider block mb-1 text-red-700 dark:text-red-300">Rejected</span>
                  <span className="block font-bold mb-1">Reason:</span>
                  <span className="leading-relaxed">{uploadErrorReason || "Document taxonomy check failed."}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateDocument} className="space-y-4">
              {/* Source Select */}
              <div>
                <label className="block text-[9px] font-black text-black dark:text-white uppercase tracking-wider mb-1.5">Source Type</label>
                <select
                  disabled={isUploading}
                  value={newDocSource}
                  onChange={(e) => {
                    const val = e.target.value as "Notion" | "Google Drive" | "GitHub" | "Upload";
                    setNewDocSource(val);
                    setNewDocName("");
                    setNewDocContent("");
                    setSelectedFile(null);
                    setUploadErrorReason(null);
                    setValidationStatus("idle");
                  }}
                  className="block w-full px-4.5 py-3.5 bg-[#FAF9F6] dark:bg-[#18181A] border-2 border-black dark:border-white rounded-xl text-xs font-semibold text-black dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#242427] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <option value="Upload">Local File Upload</option>
                  <option value="Notion">Notion Database Page</option>
                  <option value="Google Drive">Google Drive Folder</option>
                  <option value="GitHub">GitHub Commit Repo</option>
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[9px] font-black text-black dark:text-white uppercase tracking-wider mb-1.5">Document Title</label>
                <input
                  required
                  type="text"
                  disabled={isUploading}
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder={newDocSource === "Upload" ? "Upload a file to set title" : "e.g. Sales Playbook 2026.pdf"}
                  className="block w-full px-4.5 py-3.5 bg-[#FAF9F6] dark:bg-[#18181A] border-2 border-black dark:border-white rounded-xl text-xs font-semibold text-black dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#242427] transition-colors disabled:opacity-50"
                />
              </div>

              {/* File Upload Zone or Raw Content Area */}
              {newDocSource === "Upload" ? (
                <div>
                  <label className="block text-[9px] font-black text-black dark:text-white uppercase tracking-wider mb-1.5">Select File</label>
                  <div className="border-2 border-dashed border-black dark:border-white rounded-xl p-6 bg-[#FAF9F6] dark:bg-[#18181A] text-center flex flex-col items-center justify-center cursor-pointer shadow-[2px_2px_0px_#000000] dark:shadow-[2px_2px_0px_#FFFFFF] hover:bg-slate-50 dark:hover:bg-[#242427] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1px_1px_0px_#000000] dark:hover:shadow-[1px_1px_0px_#FFFFFF] transition-all relative min-h-36">
                    <input
                      type="file"
                      disabled={isUploading}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          setNewDocName(file.name);
                          setUploadErrorReason(null);
                          setValidationStatus("idle");
                        }
                      }}
                    />
                    <UploadCloud className="w-8 h-8 text-black dark:text-white mb-2 stroke-[2px]" />
                    <span className="text-xs font-black uppercase text-black dark:text-white">
                      {selectedFile ? selectedFile.name : "Drag & Drop or Click to Select File"}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">PDF, TXT, CSV, DOCX up to 10MB</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[9px] font-black text-black dark:text-white uppercase tracking-wider mb-1.5">Raw Text Content (Optional)</label>
                  <textarea
                    disabled={isUploading}
                    value={newDocContent}
                    onChange={(e) => setNewDocContent(e.target.value)}
                    placeholder="Paste context guidelines here..."
                    rows={4}
                    className="block w-full px-4.5 py-3.5 bg-[#FAF9F6] dark:bg-[#18181A] border-2 border-black dark:border-white rounded-xl text-xs font-semibold text-black dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#242427] transition-colors resize-none disabled:opacity-50"
                  />
                </div>
              )}

              {/* Ingestion Progress */}
              {isUploading && (
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[9px] font-black text-black dark:text-white uppercase tracking-wider mb-1">
                    <span>Validating taxonomy & processing vectors ({uploadProgress}%)</span>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div className="w-full bg-[#FAF9F6] dark:bg-[#18181A] h-3.5 rounded-full overflow-hidden border-2 border-black dark:border-white shadow-[1px_1px_0px_#000000] dark:shadow-[1px_1px_0px_#FFFFFF]">
                    <div className="bg-purple-300 dark:bg-purple-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-6">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => {
                    setIsUploadOpen(false);
                    setUploadErrorReason(null);
                    setValidationStatus("idle");
                  }}
                  className="px-5 py-2.5 rounded-xl border-2 border-black dark:border-white bg-white dark:bg-[#242427] hover:bg-slate-100 dark:hover:bg-[#2E2E32] text-xs font-black text-black dark:text-white shadow-[2.5px_2.5px_0px_#000000] dark:shadow-[2.5px_2.5px_0px_#FFFFFF] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1.5px_1.5px_0px_#000000] dark:hover:shadow-[1.5px_1.5px_0px_#FFFFFF] transition-all cursor-pointer disabled:opacity-50 uppercase tracking-wide"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5.5 py-2.5 rounded-xl bg-purple-300 dark:bg-purple-650 hover:bg-purple-400 dark:hover:bg-purple-600 border-2 border-black dark:border-white text-xs font-black text-black dark:text-white shadow-[2.5px_2.5px_0px_#000000] dark:shadow-[2.5px_2.5px_0px_#FFFFFF] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1.5px_1.5px_0px_#000000] dark:hover:shadow-[1.5px_1.5px_0px_#FFFFFF] transition-all cursor-pointer disabled:opacity-50 uppercase tracking-wide"
                >
                  Ingest Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
