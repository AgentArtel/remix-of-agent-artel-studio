export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_configs: {
        Row: {
          appearance: Json | null
          base_entity_type: string
          behavior: Json | null
          category: string
          created_at: string | null
          default_sprite: string | null
          description: string | null
          icon: string | null
          id: string
          is_enabled: boolean | null
          memory_config: Json | null
          model: Json | null
          name: string
          personality: Json | null
          prompt: string
          required_tokens: Json | null
          skills: Json | null
          spawn_config: Json | null
          updated_at: string | null
          welcome_message: string | null
        }
        Insert: {
          appearance?: Json | null
          base_entity_type?: string
          behavior?: Json | null
          category?: string
          created_at?: string | null
          default_sprite?: string | null
          description?: string | null
          icon?: string | null
          id: string
          is_enabled?: boolean | null
          memory_config?: Json | null
          model?: Json | null
          name: string
          personality?: Json | null
          prompt: string
          required_tokens?: Json | null
          skills?: Json | null
          spawn_config?: Json | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Update: {
          appearance?: Json | null
          base_entity_type?: string
          behavior?: Json | null
          category?: string
          created_at?: string | null
          default_sprite?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_enabled?: boolean | null
          memory_config?: Json | null
          model?: Json | null
          name?: string
          personality?: Json | null
          prompt?: string
          required_tokens?: Json | null
          skills?: Json | null
          spawn_config?: Json | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Relationships: []
      }
      agent_memory: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          npc_id: string
          player_id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          npc_id: string
          player_id: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          npc_id?: string
          player_id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_npc_id_fkey"
            columns: ["npc_id"]
            isOneToOne: false
            referencedRelation: "agent_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      npc_instances: {
        Row: {
          config_id: string
          current_players: string[] | null
          id: string
          instance_id: string
          last_activity_at: string | null
          map_id: string
          position: Json
          spawned_at: string | null
          status: string | null
        }
        Insert: {
          config_id: string
          current_players?: string[] | null
          id?: string
          instance_id: string
          last_activity_at?: string | null
          map_id: string
          position: Json
          spawned_at?: string | null
          status?: string | null
        }
        Update: {
          config_id?: string
          current_players?: string[] | null
          id?: string
          instance_id?: string
          last_activity_at?: string | null
          map_id?: string
          position?: Json
          spawned_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "npc_instances_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "agent_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      object_templates: {
        Row: {
          actions: Json | null
          base_entity_type: string
          category: string
          created_at: string | null
          default_sprite: string | null
          description: string | null
          icon: string | null
          id: string
          is_enabled: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json | null
          base_entity_type?: string
          category?: string
          created_at?: string | null
          default_sprite?: string | null
          description?: string | null
          icon?: string | null
          id: string
          is_enabled?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json | null
          base_entity_type?: string
          category?: string
          created_at?: string | null
          default_sprite?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      player_state: {
        Row: {
          direction: string | null
          id: string
          last_seen_at: string | null
          map_id: string
          player_id: string
          position: Json
          status: string | null
        }
        Insert: {
          direction?: string | null
          id?: string
          last_seen_at?: string | null
          map_id: string
          player_id: string
          position: Json
          status?: string | null
        }
        Update: {
          direction?: string | null
          id?: string
          last_seen_at?: string | null
          map_id?: string
          player_id?: string
          position?: Json
          status?: string | null
        }
        Relationships: []
      }
      studio_activity_log: {
        Row: {
          created_at: string | null
          id: string
          message: string
          type: string
          user_id: string | null
          workflow_id: string | null
          workflow_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          type: string
          user_id?: string | null
          workflow_id?: string | null
          workflow_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          type?: string
          user_id?: string | null
          workflow_id?: string | null
          workflow_name?: string | null
        }
        Relationships: []
      }
      studio_executions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          node_results: Json | null
          started_at: string | null
          status: string | null
          user_id: string | null
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          node_results?: Json | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          node_results?: Json | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "studio_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_workflows: {
        Row: {
          connections_data: Json | null
          created_at: string | null
          description: string | null
          execution_count: number | null
          id: string
          last_run_at: string | null
          name: string
          node_count: number | null
          nodes_data: Json | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          connections_data?: Json | null
          created_at?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          last_run_at?: string | null
          name: string
          node_count?: number | null
          nodes_data?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          connections_data?: Json | null
          created_at?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          last_run_at?: string | null
          name?: string
          node_count?: number | null
          nodes_data?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sync_status: {
        Row: {
          entity_id: string
          entity_type: string
          error_count: number | null
          error_message: string | null
          id: string
          last_synced_at: string | null
          source: string
          status: string | null
          target: string
        }
        Insert: {
          entity_id: string
          entity_type: string
          error_count?: number | null
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          source: string
          status?: string | null
          target: string
        }
        Update: {
          entity_id?: string
          entity_type?: string
          error_count?: number | null
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          source?: string
          status?: string | null
          target?: string
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          access_token: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          provider: string
          provider_account_id: string | null
          refresh_token: string | null
          scope: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          provider: string
          provider_account_id?: string | null
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          provider_account_id?: string | null
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workflow_context: {
        Row: {
          created_at: string | null
          data_type: string
          expires_at: string | null
          id: string
          payload: Json
          player_id: string
          workflow_run_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_type: string
          expires_at?: string | null
          id?: string
          payload: Json
          player_id: string
          workflow_run_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_type?: string
          expires_at?: string | null
          id?: string
          payload?: Json
          player_id?: string
          workflow_run_id?: string | null
        }
        Relationships: []
      }
      workflow_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          logs: Json | null
          player_id: string
          status: string | null
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          logs?: Json | null
          player_id: string
          status?: string | null
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          logs?: Json | null
          player_id?: string
          status?: string | null
          workflow_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
