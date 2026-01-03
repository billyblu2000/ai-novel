// Node types
export type NodeType = "FOLDER" | "FILE";

export type NodeStatus = "DRAFT" | "FINAL";

export interface FileMetadata {
  timestamp?: string | null;
  location_ref?: string | null;
  status: NodeStatus;
  word_count: number;
  ignored_entities: string[];

  /** 系统保留字段：用于根目录分区（如 正文/笔记） */
  system_root?: boolean;
  root_kind?: "MANUSCRIPT" | "NOTES" | string;
}

export interface FolderMetadata {
  collapsed: boolean;

  /** 系统保留字段：用于根目录分区（如 正文/笔记） */
  system_root?: boolean;
  root_kind?: "MANUSCRIPT" | "NOTES" | string;
}

export type NodeMetadata = FileMetadata | FolderMetadata;

export interface Node {
  id: string;
  project_id: string;
  parent_id: string | null;
  type: NodeType;
  title: string;
  content: string;
  outline: string;
  summary: string;
  order: string;
  metadata: NodeMetadata;
  created_at: string;
  updated_at: string;
}

// Entity types
export type EntityType = "CHARACTER" | "LOCATION" | "ITEM";

export interface Entity {
  id: string;
  project_id: string;
  type: EntityType;
  name: string;
  aliases: string[];
  description: string;
  attributes: Record<string, unknown>;
  avatar_url: string | null;
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

// Project types
export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
}

// Profile types
export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  created_at: string;
}

// Mention types
export interface Mention {
  id: string;
  node_id: string;
  entity_id: string;
  frequency: number;
}

// Node version types
export interface NodeVersion {
  id: string;
  node_id: string;
  content: string;
  word_count: number;
  created_at: string;
}

// API response types
export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;
