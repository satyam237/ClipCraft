export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type VideoStatus = "uploading" | "processing" | "ready" | "failed";

export type VideoVisibility = "public" | "unlisted" | "workspace" | "password";

export type VideoAssetType =
  | "raw_webm"
  | "mp4"
  | "hls"
  | "thumbnail"
  | "srt"
  | "vtt"
  | "transcript_json"
  | "summary_md"
  | "chapters_json"
  | "highlights_mp4";

export type ProcessingJobType = "transcode" | "transcribe" | "thumbnail";

export type ProcessingJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export type AnalyticsEventType = "view" | "play" | "pause" | "seek" | "complete";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          plan: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          plan?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          plan?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          owner_id?: string;
          updated_at?: string;
        };
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          created_at?: string;
        };
        Update: {
          role?: WorkspaceRole;
        };
      };
      folders: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          parent_folder_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          parent_folder_id?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          parent_folder_id?: string | null;
        };
      };
      videos: {
        Row: {
          id: string;
          workspace_id: string;
          folder_id: string | null;
          owner_id: string;
          title: string;
          description: string | null;
          status: VideoStatus;
          duration: number | null;
          visibility: VideoVisibility;
          password_hash: string | null;
          thumbnail_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          folder_id?: string | null;
          owner_id: string;
          title?: string;
          description?: string | null;
          status?: VideoStatus;
          duration?: number | null;
          visibility?: VideoVisibility;
          password_hash?: string | null;
          thumbnail_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          status?: VideoStatus;
          duration?: number | null;
          visibility?: VideoVisibility;
          password_hash?: string | null;
          thumbnail_url?: string | null;
          folder_id?: string | null;
          updated_at?: string;
        };
      };
      video_assets: {
        Row: {
          id: string;
          video_id: string;
          asset_type: VideoAssetType;
          storage_path: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          asset_type: VideoAssetType;
          storage_path: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          metadata?: Json | null;
        };
      };
      comments: {
        Row: {
          id: string;
          video_id: string;
          user_id: string;
          timestamp_ms: number | null;
          body: string;
          parent_id: string | null;
          resolved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          user_id: string;
          timestamp_ms?: number | null;
          body: string;
          parent_id?: string | null;
          resolved?: boolean;
          created_at?: string;
        };
        Update: {
          body?: string;
          resolved?: boolean;
        };
      };
      reactions: {
        Row: {
          id: string;
          video_id: string;
          user_id: string;
          emoji: string;
          timestamp_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          user_id: string;
          emoji: string;
          timestamp_ms?: number | null;
          created_at?: string;
        };
        Update: never;
      };
      analytics_events: {
        Row: {
          id: string;
          video_id: string;
          viewer_id: string | null;
          event_type: AnalyticsEventType;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          viewer_id?: string | null;
          event_type: AnalyticsEventType;
          payload?: Json | null;
          created_at?: string;
        };
        Update: never;
      };
      processing_jobs: {
        Row: {
          id: string;
          video_id: string;
          job_type: ProcessingJobType;
          status: ProcessingJobStatus;
          attempts: number;
          error_log: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          job_type: ProcessingJobType;
          status?: ProcessingJobStatus;
          attempts?: number;
          error_log?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: ProcessingJobStatus;
          attempts?: number;
          error_log?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}
