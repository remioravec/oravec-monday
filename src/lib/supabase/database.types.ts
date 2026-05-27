export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      automations: {
        Row: {
          action_json: Json
          active: boolean
          created_at: string
          household_id: string
          id: string
          trigger_json: Json
        }
        Insert: {
          action_json: Json
          active?: boolean
          created_at?: string
          household_id: string
          id?: string
          trigger_json: Json
        }
        Update: {
          action_json?: Json
          active?: boolean
          created_at?: string
          household_id?: string
          id?: string
          trigger_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "automations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      battery_snapshots: {
        Row: {
          created_at: string
          cycle_end: string
          cycle_start: string
          id: string
          profile_id: string
          used_pct: number
        }
        Insert: {
          created_at?: string
          cycle_end: string
          cycle_start: string
          id?: string
          profile_id: string
          used_pct: number
        }
        Update: {
          created_at?: string
          cycle_end?: string
          cycle_start?: string
          id?: string
          profile_id?: string
          used_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "battery_snapshots_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          color: string | null
          created_at: string
          household_id: string
          icon: string | null
          id: string
          name: string
          position: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          household_id: string
          icon?: string | null
          id?: string
          name: string
          position?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          household_id?: string
          icon?: string | null
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "folders_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          profile_id: string
          read_at: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          profile_id: string
          read_at?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          profile_id?: string
          read_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_credentials: {
        Row: {
          pin_hash: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          pin_hash: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          pin_hash?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_credentials_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          battery_cycle: string
          child_mode: string | null
          color: string
          created_at: string
          display_name: string
          household_id: string
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          avatar?: string | null
          battery_cycle?: string
          child_mode?: string | null
          color?: string
          created_at?: string
          display_name: string
          household_id: string
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          avatar?: string | null
          battery_cycle?: string
          child_mode?: string | null
          color?: string
          created_at?: string
          display_name?: string
          household_id?: string
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          profile_id: string
          project_id: string
        }
        Insert: {
          profile_id: string
          project_id: string
        }
        Update: {
          profile_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          end_at: string | null
          folder_id: string
          id: string
          name: string
          position: number
          start_at: string | null
          view_default: string
        }
        Insert: {
          created_at?: string
          end_at?: string | null
          folder_id: string
          id?: string
          name: string
          position?: number
          start_at?: string | null
          view_default?: string
        }
        Update: {
          created_at?: string
          end_at?: string | null
          folder_id?: string
          id?: string
          name?: string
          position?: number
          start_at?: string | null
          view_default?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          active: boolean
          created_at: string
          household_id: string
          id: string
          name: string
          task_template_ids: Json
          trigger_time: string | null
          trigger_type: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          household_id: string
          id?: string
          name: string
          task_template_ids?: Json
          trigger_time?: string | null
          trigger_type: string
        }
        Update: {
          active?: boolean
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          task_template_ids?: Json
          trigger_time?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      subtasks: {
        Row: {
          done: boolean
          id: string
          position: number
          task_id: string
          title: string
        }
        Insert: {
          done?: boolean
          id?: string
          position?: number
          task_id: string
          title: string
        }
        Update: {
          done?: boolean
          id?: string
          position?: number
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          profile_id: string
          task_id: string
        }
        Insert: {
          profile_id: string
          task_id: string
        }
        Update: {
          profile_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          audio_url: string | null
          auto_complete_on_subtasks: boolean
          battery_cost: number
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          pictogram_url: string | null
          priority: string
          project_id: string
          recurrence_rule: Json | null
          status: string
          title: string
        }
        Insert: {
          audio_url?: string | null
          auto_complete_on_subtasks?: boolean
          battery_cost?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          pictogram_url?: string | null
          priority?: string
          project_id: string
          recurrence_rule?: Json | null
          status?: string
          title: string
        }
        Update: {
          audio_url?: string | null
          auto_complete_on_subtasks?: boolean
          battery_cost?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          pictogram_url?: string | null
          priority?: string
          project_id?: string
          recurrence_rule?: Json | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_project: { Args: { p_project_id: string }; Returns: boolean }
      can_access_task: { Args: { p_task_id: string }; Returns: boolean }
      current_child_is_reader: { Args: never; Returns: boolean }
      current_household_id: { Args: never; Returns: string }
      current_profile_id: { Args: never; Returns: string }
      is_assigned_to_task: { Args: { p_task_id: string }; Returns: boolean }
      is_parent: { Args: never; Returns: boolean }
      setup_household: {
        Args: {
          p_color?: string
          p_display_name: string
          p_household_name: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

