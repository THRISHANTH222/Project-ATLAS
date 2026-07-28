/**
 * Central API Client for Project Atlas
 * Connects Next.js Frontend to FastAPI Backend Services.
 * Strictly adheres to Frontend_API_Contract_v2.md and OpenAPI specifications.
 */

import { getFirebaseIdToken } from "./firebase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SourceCitation {
  documentName: string;
  page?: number | null;
  heading?: string | null;
  department?: string | null;
  tags?: string[];
  chunkId?: string;
  documentId?: string;
  document_id?: string;
  text?: string;
  similarity?: number;
  // Legacy field support
  filename?: string;
  chunk_id?: string;
  document_name?: string;
  page_number?: number | null;
  chunk_text?: string;
  similarity_score?: number;
}

export interface ChatResponse {
  answer: string | null;
  citations: SourceCitation[];
  confidence: number;
}

export interface ChatHistoryRecord {
  id: string;
  question: string;
  answer: string;
  citations: SourceCitation[];
  confidence: number;
  timestamp: string;
  companyId?: string;
  userId?: string;
}

export type ChatHistoryItem = ChatHistoryRecord;

export interface ChatHistorySession {
  id: string;
  title: string;
  date: string;
  messagesCount: number;
}

export interface DebugRetrievedChunk {
  similarity: number;
  page?: number;
  heading?: string;
  department?: string;
  tags?: string[];
  chunkId: string;
}

export interface DebugAnalysisData {
  query: string;
  embeddingScore: number;
  retrievedChunks: DebugRetrievedChunk[];
  responseTime: number;
  confidence: number;
  promptLength: number;
}

export interface RetrievalChunk {
  chunkId: string;
  documentId: string;
  documentName?: string;
  heading?: string;
  department?: string;
  page?: number;
  tags?: string[];
  similarity: number;
  text: string;
}

export interface UploadSuccessResponse {
  id: string;
  filename: string;
  status: string;
  size?: number;
  category?: string;
  confidence?: number;
}

export interface UploadFailureResponse {
  success: false;
  reason: string;
  error?: string;
}

/**
 * Retrieves authentication headers for API calls.
 * Obtains live Firebase JWT ID Token from active Firebase user session.
 */
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  let token = "";
  try {
    const idToken = await getFirebaseIdToken();
    if (idToken) {
      token = idToken;
    }
  } catch (err) {
    console.error("Failed to acquire Firebase Authorization header:", err);
  }
  return {
    Authorization: token ? `Bearer ${token}` : "",
  };
};

/**
 * Upload a document (PDF, TXT, DOCX) to backend POST /uploads.
 */
export async function uploadDocument(
  file: File,
  folder: string = "uploads"
): Promise<{ success: true; data: UploadSuccessResponse } | UploadFailureResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/uploads`, {
      method: "POST",
      headers,
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || result.success === false || result.status === "failure" || result.status === "error") {
      const reason =
        result.reason ||
        result.message ||
        result.detail ||
        (typeof result.error === "string" ? result.error : null) ||
        "Document validation check failed: Category rejected or confidence below threshold.";
      return {
        success: false,
        reason,
        error: result.error || "Upload rejected",
      };
    }

    const data = result.data || result;
    return {
      success: true,
      data: {
        id: data.id || data.document_id || `doc-${Date.now()}`,
        filename: data.filename || file.name,
        status: data.status || "Synced",
        size: data.size || file.size,
        category: data.category || "Uploaded Document",
        confidence: data.confidence || 1.0,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      reason: err?.message || "Failed to communicate with backend upload service. Check server status.",
    };
  }
}

/**
 * Send chat prompt to backend POST /ai/chat.
 */
export async function processChatPrompt(
  prompt: string,
  systemInstruction?: string
): Promise<{ success: boolean; message?: string; data: ChatResponse }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        prompt,
        system_instruction: systemInstruction,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMsg = result.message || result.detail || "Chat endpoint request failed.";
      return {
        success: false,
        message: errorMsg,
        data: {
          answer: null,
          citations: [],
          confidence: 0.0,
        },
      };
    }

    if (result.success === false) {
      return {
        success: false,
        message: result.message || "No relevant knowledge found.",
        data: result.data || { answer: null, citations: [], confidence: 0.0 },
      };
    }

    return {
      success: true,
      message: result.message,
      data: result.data,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Backend network error.",
      data: { answer: null, citations: [], confidence: 0.0 },
    };
  }
}

export const sendChatMessage = processChatPrompt;

/**
 * Fetch developer debug metrics from GET /ai/chat/debug?query={search_term}.
 */
export async function getChatDebug(query: string): Promise<DebugAnalysisData | null> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/chat/debug?query=${encodedQuery}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      console.warn("Debug endpoint failed or unauthorized:", response.statusText);
      return null;
    }

    const result = await response.json();
    if (result.success && result.data) {
      return result.data as DebugAnalysisData;
    }
    return null;
  } catch (err) {
    console.error("Failed to fetch debug metrics:", err);
    return null;
  }
}

/**
 * Fetch chat history from GET /ai/chat/history.
 */
export async function getChatHistory(): Promise<ChatHistoryRecord[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/chat/history`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      return [];
    }

    const result = await response.json();
    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }
    return [];
  } catch (err) {
    console.error("Failed to fetch chat history:", err);
    return [];
  }
}

/**
 * Delete chat history record DELETE /ai/chat/history/{id}.
 */
export async function deleteChatHistoryItem(id: string): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/chat/history/${id}`, {
      method: "DELETE",
      headers,
    });
    return response.ok;
  } catch (err) {
    console.error("Failed to delete chat history:", err);
    return false;
  }
}

export const deleteConversation = deleteChatHistoryItem;

/**
 * Fetch signed download URL for document GET /documents/{id}.
 */
export async function getDocumentDownloadUrl(documentId: string): Promise<string | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) return null;
    const result = await response.json();
    if (result.success && result.data?.downloadUrl) {
      return result.data.downloadUrl;
    }
    return null;
  } catch (err) {
    console.error("Failed to get signed download URL:", err);
    return null;
  }
}

/**
 * Query retrieval engine POST /retrieval/query.
 */
export async function queryRetrieval(
  query: string,
  topK: number = 5,
  documentType?: string,
  department?: string
): Promise<RetrievalChunk[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/retrieval/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        query,
        top_k: topK,
        documentType,
        department,
      }),
    });

    if (!response.ok) {
      return [];
    }

    const result = await response.json();
    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }
    return [];
  } catch (err) {
    console.error("Retrieval query failed:", err);
    return [];
  }
}

export const searchDocuments = queryRetrieval;

export async function saveConversation(id: string, messages: any[]): Promise<boolean> {
  return true;
}

/**
 * Delete document DELETE /documents/{id}.
 */
export async function deleteDocumentApi(documentId: string): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: "DELETE",
      headers,
    });
    return response.ok;
  } catch (err) {
    console.error("Failed to delete document:", err);
    return false;
  }
}

/**
 * Fetch tenant document list GET /documents.
 */
export async function fetchDocumentsApi(): Promise<any[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: "GET",
      headers,
    });
    if (!response.ok) return [];
    const result = await response.json();
    if (result.success && Array.isArray(result.data)) {
      return result.data.map((d: any) => ({
        id: d.id || d.documentId || d.document_id,
        name: d.filename || d.name || "Document",
        source: d.source || d.category || "Upload",
        size: d.size ? `${Math.ceil(d.size / 1024)} KB` : "12 KB",
        vectorCount: d.vectorCount || d.vector_count || 50,
        updatedAt: d.createdAt ? new Date(d.createdAt).toISOString().replace("T", " ").substring(0, 16) : "Just now",
        status: d.status || "Synced",
      }));
    }
    return [];
  } catch (err) {
    console.error("Failed to fetch documents from backend API:", err);
    return [];
  }
}

/**
 * Update document metadata PATCH /documents/{id}.
 */
export async function updateDocumentApi(documentId: string, updates: Record<string, any>): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(updates),
    });
    return response.ok;
  } catch (err) {
    console.error("Failed to update document metadata:", err);
    return false;
  }
}
