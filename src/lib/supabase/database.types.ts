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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          color: string;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          color?: string;
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
        };
        Insert: {
          id?: string;
          name: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          position?: number;
          created_at?: string;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          folder_id?: string | null;
          name: string;
          color?: string | null;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          folder_id?: string | null;
          name?: string;
          color?: string | null;
          position?: number;
          created_at?: string;
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
          position: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          parent_task_id?: string | null;
          title: string;
          description?: string | null;
          status?: TaskStatus;
          due_date?: string | null;
          position?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          parent_task_id?: string | null;
          title?: string;
          description?: string | null;
          status?: TaskStatus;
          due_date?: string | null;
          position?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
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
        };
        Relationships: [];
      };
      routine_assignees: {
        Row: { routine_id: string; user_id: string };
        Insert: { routine_id: string; user_id: string };
        Update: { routine_id?: string; user_id?: string };
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
