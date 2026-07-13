export interface DocumentItem {
  id: string;
  name: string;
  source: "Notion" | "Google Drive" | "GitHub" | "Upload";
  size: string;
  vectorCount: number;
  updatedAt: string;
  status: "Synced" | "Syncing" | "Pending";
}

export interface ActivityItem {
  id: string;
  type: "upload" | "sync" | "auth" | "delete";
  description: string;
  timestamp: string;
  user: string;
}

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: "doc-1",
    name: "Project Atlas PRD.pdf",
    source: "Upload",
    size: "2.4 MB",
    vectorCount: 420,
    updatedAt: "2026-07-13 09:12",
    status: "Synced"
  },
  {
    id: "doc-2",
    name: "Engineering Guidelines Wiki",
    source: "Notion",
    size: "420 KB",
    vectorCount: 1250,
    updatedAt: "2026-07-12 18:34",
    status: "Synced"
  },
  {
    id: "doc-3",
    name: "auth-service.ts",
    source: "GitHub",
    size: "48 KB",
    vectorCount: 120,
    updatedAt: "2026-07-13 05:22",
    status: "Synced"
  },
  {
    id: "doc-4",
    name: "Q3 Strategy Slide-Deck.pdf",
    source: "Google Drive",
    size: "8.1 MB",
    vectorCount: 680,
    updatedAt: "2026-07-10 14:15",
    status: "Synced"
  },
  {
    id: "doc-5",
    name: "Company HR Policy handbook.pdf",
    source: "Upload",
    size: "1.2 MB",
    vectorCount: 290,
    updatedAt: "2026-07-09 10:00",
    status: "Synced"
  }
];

export const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: "act-1",
    type: "upload",
    description: "Uploaded document 'Project Atlas PRD.pdf'",
    timestamp: "18 minutes ago",
    user: "Alex Carter"
  },
  {
    id: "act-2",
    type: "sync",
    description: "GitHub repository index complete",
    timestamp: "4 hours ago",
    user: "System Core"
  },
  {
    id: "act-3",
    type: "sync",
    description: "Notion wiki folder synced",
    timestamp: "15 hours ago",
    user: "Alex Carter"
  },
  {
    id: "act-4",
    type: "auth",
    description: "User workspace session initialized",
    timestamp: "1 day ago",
    user: "Alex Carter"
  }
];
