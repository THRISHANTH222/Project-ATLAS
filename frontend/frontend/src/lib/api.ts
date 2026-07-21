import { getAuth } from "firebase/auth";
import { isMockAuth } from "./firebase";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export interface ProblemDetails {
  timestamp: string;
  level: string;
  logger?: string;
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  error_code: string;
  correlation_id?: string;
  invalid_params?: Array<{ name: string; reason: string }>;
}

export class ApiError extends Error {
  status: number;
  problemDetails?: ProblemDetails;

  constructor(message: string, status: number, problemDetails?: ProblemDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.problemDetails = problemDetails;
  }
}

export const getAuthToken = async (): Promise<string | null> => {
  if (isMockAuth) {
    return "mock-token-usr-987654";
  }
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return await currentUser.getIdToken(true);
  } catch (error) {
    console.warn("Could not get Firebase ID Token, using mock fallback:", error);
    return "mock-token-usr-987654";
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fetchWithAuth = async (path: string, options: RequestInit = {}): Promise<any> => {
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  const url = `${BASE_URL}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    throw new ApiError(`Network connection failed: ${errMsg}`, 0);
  }

  if (!response.ok) {
    let problemDetails: ProblemDetails | undefined;
    try {
      problemDetails = await response.json();
    } catch {
      // Response was not JSON
    }
    const message = problemDetails?.detail || problemDetails?.title || `HTTP error ${response.status}`;
    throw new ApiError(message, response.status, problemDetails);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

// System Health API
export interface SystemServiceHealth {
  status: string;
  latency_ms: number;
}

export interface SystemHealth {
  status: string;
  version: string;
  environment: string;
  timestamp: string;
  services: {
    database: SystemServiceHealth;
    storage: SystemServiceHealth;
    ai_service: SystemServiceHealth;
  };
}

export const getSystemHealth = async (): Promise<SystemHealth> => {
  const response = await fetch(`${BASE_URL}/api/v1/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return response.json();
};

// Company Info
export interface CompanyInfo {
  id: string;
  companyName: string;
  organizationType: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  logo?: string;
  timezone: string;
  country: string;
  state: string;
  city: string;
  is_active: boolean;
}

export const getCompanyInfo = async (): Promise<CompanyInfo> => {
  const res = await fetchWithAuth("/api/company");
  return res.data;
};

// Company Brain Statistics
export interface CompanyStats {
  total_documents: number;
  total_chunks: number;
  storage_used_bytes: number;
  processing_failed: number;
  processing_active: number;
}

export const getCompanyStats = async (): Promise<CompanyStats> => {
  const res = await fetchWithAuth("/api/company-brain/stats");
  return res.data;
};

// Document Items
export interface DocumentStageStatus {
  upload: "completed" | "pending" | "processing" | "failed";
  parsing: "completed" | "pending" | "processing" | "failed";
  chunking: "completed" | "pending" | "processing" | "failed";
  embedding: "completed" | "pending" | "processing" | "failed";
  indexing: "completed" | "pending" | "processing" | "failed";
}

export interface DocumentItem {
  id: string;
  filename: string;
  file_size?: number;
  status: "queued" | "processing" | "completed" | "failed";
  created_at: string;
  stages?: DocumentStageStatus;
  total_chunks?: number;
  storage_path?: string;
  error_message?: string | null;
  page_count?: number;
  uploaded_by?: string;
}

export interface PaginatedDocuments {
  items: DocumentItem[];
  total_items: number;
  page: number;
  total_pages: number;
}

export const getDocuments = async (
  page = 1,
  limit = 20,
  status?: string
): Promise<PaginatedDocuments> => {
  let query = `?page=${page}&limit=${limit}`;
  if (status) {
    query += `&status=${status}`;
  }
  const res = await fetchWithAuth(`/api/company-brain/documents${query}`);
  return res.data;
};

export const getDocumentDetails = async (id: string): Promise<DocumentItem> => {
  const res = await fetchWithAuth(`/api/company-brain/documents/${id}`);
  return res.data;
};

export const deleteDocument = async (id: string): Promise<void> => {
  await fetchWithAuth(`/api/company-brain/documents/${id}`, {
    method: "DELETE",
  });
};

export interface PollingStatus {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  current_stage: "upload" | "parsing" | "chunking" | "embedding" | "indexing";
  progress_percent: number;
  error_message: string | null;
}

export const pollDocumentStatus = async (id: string): Promise<PollingStatus> => {
  const res = await fetchWithAuth(`/api/company-brain/status/${id}`);
  return res.data;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const retryDocumentIngestion = async (id: string): Promise<any> => {
  const res = await fetchWithAuth(`/api/company-brain/retry/${id}`, {
    method: "POST",
  });
  return res.data;
};

export const downloadDocument = async (id: string, filename: string): Promise<void> => {
  const token = await getAuthToken();
  const url = `${BASE_URL}/api/company-brain/download/${id}`;
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
};

export interface SearchResult {
  document_id: string;
  filename: string;
  chunk_id: string;
  text: string;
  similarity_score: number;
}

export const searchDocuments = async (q: string, limit = 5): Promise<SearchResult[]> => {
  const res = await fetchWithAuth(`/api/company-brain/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  return res.data;
};

// AI Chat Integration
export interface ChatMessagePart {
  text: string;
}

export interface ChatHistoryItem {
  role: "user" | "model";
  parts: ChatMessagePart[];
}

export const sendChatMessage = async (
  prompt: string,
  chatHistory: ChatHistoryItem[] = []
): Promise<string> => {
  const body = {
    prompt,
    chat_history: chatHistory,
  };
  const res = await fetchWithAuth("/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return res.data;
};

export const uploadDocumentWithProgress = (
  file: File,
  folder?: string,
  onProgress?: (percent: number) => void,
  onXhrCreated?: (xhr: XMLHttpRequest) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      const token = await getAuthToken();
      const xhr = new XMLHttpRequest();
      if (onXhrCreated) {
        onXhrCreated(xhr);
      }
      const url = `${BASE_URL}/api/company-brain/upload`;

      xhr.open("POST", url, true);
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      if (onProgress && xhr.upload) {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        });
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          let problemDetails: ProblemDetails | undefined;
          try {
            problemDetails = JSON.parse(xhr.responseText);
          } catch {
            // response not JSON
          }
          const message = problemDetails?.detail || problemDetails?.title || `HTTP error ${xhr.status}`;
          reject(new ApiError(message, xhr.status, problemDetails));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network connection error."));
      };

      const formData = new FormData();
      formData.append("file", file);
      if (folder) {
        formData.append("folder", folder);
      }

      xhr.send(formData);
    } catch (e) {
      reject(e);
    }
  });
};

export interface ChatHistorySession {
  id: string;
  title: string;
  lastQuestion: string;
  timestamp: string;
  messages: Array<{
    id: string;
    sender: "user" | "ai";
    text: string;
    timestamp: string;
    error?: boolean;
    citations?: any[];
  }>;
}

export interface PaginatedHistory {
  items: ChatHistorySession[];
  total_items: number;
  page: number;
  total_pages: number;
}

// Loads chat history from GET /chat/history with automatic LocalStorage fallback (Never Modify Backend)
export const getChatHistory = async (
  page = 1,
  limit = 5,
  search?: string
): Promise<PaginatedHistory> => {
  try {
    let query = `?page=${page}&limit=${limit}`;
    if (search) {
      query += `&search=${encodeURIComponent(search)}`;
    }
    const res = await fetchWithAuth(`/chat/history${query}`);
    return res.data;
  } catch (err) {
    console.warn("GET /chat/history not available on backend, falling back to client-side localStorage store:", err);
    
    if (typeof window === "undefined") {
      return { items: [], total_items: 0, page, total_pages: 1 };
    }

    const raw = localStorage.getItem("atlas_chat_history") || "[]";
    let history: ChatHistorySession[] = JSON.parse(raw);

    if (search && search.trim() !== "") {
      const q = search.toLowerCase();
      history = history.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.lastQuestion.toLowerCase().includes(q)
      );
    }

    // Sort by newest first
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total_items = history.length;
    const total_pages = Math.max(1, Math.ceil(total_items / limit));
    const startIndex = (page - 1) * limit;
    const items = history.slice(startIndex, startIndex + limit);

    return {
      items,
      total_items,
      page,
      total_pages,
    };
  }
};

export const deleteConversation = async (id: string): Promise<void> => {
  try {
    await fetchWithAuth(`/chat/history/${id}`, { method: "DELETE" });
  } catch (err) {
    console.warn("DELETE /chat/history/:id not supported on backend, falling back to localStorage:", err);
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("atlas_chat_history") || "[]";
    const history: ChatHistorySession[] = JSON.parse(raw);
    const updated = history.filter((item) => item.id !== id);
    localStorage.setItem("atlas_chat_history", JSON.stringify(updated));
  }
};

export const saveConversation = async (session: ChatHistorySession): Promise<void> => {
  try {
    await fetchWithAuth("/chat/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session)
    });
  } catch (err) {
    // Client-side save fallback
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("atlas_chat_history") || "[]";
    const history: ChatHistorySession[] = JSON.parse(raw);
    const index = history.findIndex((item) => item.id === session.id);
    if (index > -1) {
      history[index] = session;
    } else {
      history.push(session);
    }
    localStorage.setItem("atlas_chat_history", JSON.stringify(history));
  }
};
