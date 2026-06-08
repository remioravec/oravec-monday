// Types Supabase générés à la main pour le schéma Monday-clone.
// Si tu régénères automatiquement (`supabase gen types typescript --linked`),
// remplace ce fichier par la sortie.
//
// IMPORTANT : chaque table/view doit avoir `Relationships: []` même vide,
// sinon `@supabase/postgrest-js` ne matche pas le shape `GenericTable` et
// les types `Insert`/`Update` tombent à `never`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TaskStatus = "a_faire" | "en_cours" | "fait";
export type RoutineFrequency = "daily" | "weekly" | "monthly";
export type UserRole = "admin" | "member";
export type HiddenItemKind = "folder" | "project" | "task";
export type AttachmentSource = "storage" | "drive";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          color: string;
          role: UserRole;
          onboarded_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          color?: string;
          role?: UserRole;
          onboarded_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          color?: string;
          role?: UserRole;
          onboarded_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      responsibilities: {
        Row: {
          parent_id: string;
          child_id: string;
          created_at: string;
        };
        Insert: {
          parent_id: string;
          child_id: string;
          created_at?: string;
        };
        Update: {
          parent_id?: string;
          child_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notification_prefs: {
        Row: {
          user_id: string;
          push_enabled: boolean;
          notify_on_assigned: boolean;
          notify_on_status_change: boolean;
          notify_on_due_today: boolean;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          push_enabled?: boolean;
          notify_on_assigned?: boolean;
          notify_on_status_change?: boolean;
          notify_on_due_today?: boolean;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          push_enabled?: boolean;
          notify_on_assigned?: boolean;
          notify_on_status_change?: boolean;
          notify_on_due_today?: boolean;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      task_attachments: {
        Row: {
          id: string;
          task_id: string;
          storage_path: string | null;
          file_name: string;
          file_size: number | null;
          mime_type: string | null;
          uploaded_by: string | null;
          created_at: string;
          source: AttachmentSource;
          external_url: string | null;
          drive_file_id: string | null;
        };
        Insert: {
          id?: string;
          task_id: string;
          storage_path?: string | null;
          file_name: string;
          file_size?: number | null;
          mime_type?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          source?: AttachmentSource;
          external_url?: string | null;
          drive_file_id?: string | null;
        };
        Update: {
          id?: string;
          task_id?: string;
          storage_path?: string | null;
          file_name?: string;
          file_size?: number | null;
          mime_type?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          source?: AttachmentSource;
          external_url?: string | null;
          drive_file_id?: string | null;
        };
        Relationships: [];
      };
      hidden_items: {
        Row: {
          user_id: string;
          item_kind: HiddenItemKind;
          item_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          item_kind: HiddenItemKind;
          item_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          item_kind?: HiddenItemKind;
          item_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      folders: {
        Row: {
          id: string;
          name: string;
          position: number;
          created_at: string;
          workspace_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          position?: number;
          created_at?: string;
          workspace_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          position?: number;
          created_at?: string;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          folder_id: string | null;
          name: string;
          color: string | null;
          position: number;
          is_routine: boolean;
          recurrence_frequency: RoutineFrequency | null;
          recurrence_days_of_week: number[] | null;
          recurrence_day_of_month: number | null;
          recurrence_time_of_day: string | null;
          created_at: string;
          workspace_id: string | null;
        };
        Insert: {
          id?: string;
          folder_id?: string | null;
          name: string;
          color?: string | null;
          position?: number;
          is_routine?: boolean;
          recurrence_frequency?: RoutineFrequency | null;
          recurrence_days_of_week?: number[] | null;
          recurrence_day_of_month?: number | null;
          recurrence_time_of_day?: string | null;
          created_at?: string;
          workspace_id?: string | null;
        };
        Update: {
          id?: string;
          folder_id?: string | null;
          name?: string;
          color?: string | null;
          position?: number;
          is_routine?: boolean;
          recurrence_frequency?: RoutineFrequency | null;
          recurrence_days_of_week?: number[] | null;
          recurrence_day_of_month?: number | null;
          recurrence_time_of_day?: string | null;
          created_at?: string;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string | null;
          parent_task_id: string | null;
          title: string;
          description: string | null;
          status: TaskStatus;
          due_date: string | null;
          time_of_day: string | null;
          position: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          google_event_id: string | null;
          google_calendar_id: string | null;
          google_synced_at: string | null;
          workspace_id: string | null;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          parent_task_id?: string | null;
          title: string;
          description?: string | null;
          status?: TaskStatus;
          due_date?: string | null;
          time_of_day?: string | null;
          position?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          google_event_id?: string | null;
          google_calendar_id?: string | null;
          google_synced_at?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          parent_task_id?: string | null;
          title?: string;
          description?: string | null;
          status?: TaskStatus;
          due_date?: string | null;
          time_of_day?: string | null;
          position?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          google_event_id?: string | null;
          google_calendar_id?: string | null;
          google_synced_at?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      task_assignees: {
        Row: { task_id: string; user_id: string };
        Insert: { task_id: string; user_id: string };
        Update: { task_id?: string; user_id?: string };
        Relationships: [];
      };
      routines: {
        Row: {
          id: string;
          project_id: string | null;
          title: string;
          description: string | null;
          frequency: RoutineFrequency;
          days_of_week: number[] | null;
          day_of_month: number | null;
          time_of_day: string | null;
          active: boolean;
          last_generated_date: string | null;
          created_by: string | null;
          created_at: string;
          workspace_id: string | null;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          title: string;
          description?: string | null;
          frequency: RoutineFrequency;
          days_of_week?: number[] | null;
          day_of_month?: number | null;
          time_of_day?: string | null;
          active?: boolean;
          last_generated_date?: string | null;
          created_by?: string | null;
          created_at?: string;
          workspace_id?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          title?: string;
          description?: string | null;
          frequency?: RoutineFrequency;
          days_of_week?: number[] | null;
          day_of_month?: number | null;
          time_of_day?: string | null;
          active?: boolean;
          last_generated_date?: string | null;
          created_by?: string | null;
          created_at?: string;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      routine_completions: {
        Row: {
          routine_id: string;
          completed_on: string;
          completed_by: string | null;
          created_at: string;
        };
        Insert: {
          routine_id: string;
          completed_on: string;
          completed_by?: string | null;
          created_at?: string;
        };
        Update: {
          routine_id?: string;
          completed_on?: string;
          completed_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [];
      };
      workspace_invites: {
        Row: {
          id: string;
          token: string;
          workspace_id: string;
          role: UserRole;
          created_by: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          token?: string;
          workspace_id: string;
          role?: UserRole;
          created_by?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          token?: string;
          workspace_id?: string;
          role?: UserRole;
          created_by?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      routine_assignees: {
        Row: { routine_id: string; user_id: string };
        Insert: { routine_id: string; user_id: string };
        Update: { routine_id?: string; user_id?: string };
        Relationships: [];
      };
      google_connections: {
        Row: {
          user_id: string;
          google_email: string | null;
          access_token: string | null;
          refresh_token: string | null;
          token_expires_at: string | null;
          scopes: string | null;
          write_calendar_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          google_email?: string | null;
          access_token?: string | null;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          scopes?: string | null;
          write_calendar_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          google_email?: string | null;
          access_token?: string | null;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          scopes?: string | null;
          write_calendar_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      google_calendars: {
        Row: {
          id: string;
          user_id: string;
          google_calendar_id: string;
          summary: string | null;
          bg_color: string | null;
          selected: boolean;
          sync_token: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          google_calendar_id: string;
          summary?: string | null;
          bg_color?: string | null;
          selected?: boolean;
          sync_token?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          google_calendar_id?: string;
          summary?: string | null;
          bg_color?: string | null;
          selected?: boolean;
          sync_token?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      person_workload: {
        Row: {
          user_id: string;
          full_name: string | null;
          color: string;
          a_faire: number;
          en_cours: number;
          fait: number;
          total: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
