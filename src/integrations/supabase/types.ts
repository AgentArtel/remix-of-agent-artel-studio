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
      fragment_archive: {
        Row: {
          analysis: Json | null
          certainty_level: string
          connections: Json | null
          created_at: string
          fragment_type: string
          id: string
          is_processed: boolean
          player_id: string
          raw_content: string | null
          storage_path: string | null
          tags: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          analysis?: Json | null
          certainty_level?: string
          connections?: Json | null
          created_at?: string
          fragment_type?: string
          id?: string
          is_processed?: boolean
          player_id: string
          raw_content?: string | null
          storage_path?: string | null
          tags?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          analysis?: Json | null
          certainty_level?: string
          connections?: Json | null
          created_at?: string
          fragment_type?: string
          id?: string
          is_processed?: boolean
          player_id?: string
          raw_content?: string | null
          storage_path?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      n8n_webhook_registry: {
        Row: {
          action_key: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          method: string | null
          response_mode: string | null
          timeout_ms: number | null
          updated_at: string | null
          webhook_url: string
        }
        Insert: {
          action_key: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          method?: string | null
          response_mode?: string | null
          timeout_ms?: number | null
          updated_at?: string | null
          webhook_url: string
        }
        Update: {
          action_key?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          method?: string | null
          response_mode?: string | null
          timeout_ms?: number | null
          updated_at?: string | null
          webhook_url?: string
        }
        Relationships: []
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
      object_instances: {
        Row: {
          created_at: string | null
          custom_config: Json | null
          custom_name: string | null
          id: string
          is_enabled: boolean | null
          map_id: string
          position: Json
          template_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_config?: Json | null
          custom_name?: string | null
          id?: string
          is_enabled?: boolean | null
          map_id: string
          position?: Json
          template_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_config?: Json | null
          custom_name?: string | null
          id?: string
          is_enabled?: boolean | null
          map_id?: string
          position?: Json
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "object_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "object_templates"
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
      picoclaw_agent_skills: {
        Row: {
          agent_id: string
          config_overrides: Json
          skill_id: string
        }
        Insert: {
          agent_id: string
          config_overrides?: Json
          skill_id: string
        }
        Update: {
          agent_id?: string
          config_overrides?: Json
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "picoclaw_agent_skills_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "picoclaw_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picoclaw_agent_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "picoclaw_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      picoclaw_agents: {
        Row: {
          agent_config_id: string | null
          agents_md: string
          allowed_subagents: Json
          channel: string | null
          created_at: string
          cron_schedules: Json
          deployment_status: string
          fallback_models: Json
          guild_id: string | null
          heartbeat_interval_seconds: number | null
          id: string
          identity_md: string
          last_deployed_at: string | null
          last_error: string | null
          llm_backend: string
          llm_model: string
          long_term_memory_enabled: boolean
          max_tokens: number
          max_tool_iterations: number
          memory_enabled: boolean
          parent_agent_id: string | null
          picoclaw_agent_id: string
          soul_md: string
          temperature: number
          updated_at: string
          user_md: string
        }
        Insert: {
          agent_config_id?: string | null
          agents_md?: string
          allowed_subagents?: Json
          channel?: string | null
          created_at?: string
          cron_schedules?: Json
          deployment_status?: string
          fallback_models?: Json
          guild_id?: string | null
          heartbeat_interval_seconds?: number | null
          id?: string
          identity_md?: string
          last_deployed_at?: string | null
          last_error?: string | null
          llm_backend?: string
          llm_model?: string
          long_term_memory_enabled?: boolean
          max_tokens?: number
          max_tool_iterations?: number
          memory_enabled?: boolean
          parent_agent_id?: string | null
          picoclaw_agent_id: string
          soul_md?: string
          temperature?: number
          updated_at?: string
          user_md?: string
        }
        Update: {
          agent_config_id?: string | null
          agents_md?: string
          allowed_subagents?: Json
          channel?: string | null
          created_at?: string
          cron_schedules?: Json
          deployment_status?: string
          fallback_models?: Json
          guild_id?: string | null
          heartbeat_interval_seconds?: number | null
          id?: string
          identity_md?: string
          last_deployed_at?: string | null
          last_error?: string | null
          llm_backend?: string
          llm_model?: string
          long_term_memory_enabled?: boolean
          max_tokens?: number
          max_tool_iterations?: number
          memory_enabled?: boolean
          parent_agent_id?: string | null
          picoclaw_agent_id?: string
          soul_md?: string
          temperature?: number
          updated_at?: string
          user_md?: string
        }
        Relationships: []
      }
      picoclaw_skills: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          is_builtin: boolean
          name: string
          skill_md: string
          slug: string
          tools: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_builtin?: boolean
          name: string
          skill_md?: string
          slug: string
          tools?: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_builtin?: boolean
          name?: string
          skill_md?: string
          slug?: string
          tools?: Json
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
      studio_credentials: {
        Row: {
          created_at: string
          encrypted_key: string
          id: string
          is_active: boolean
          key_hint: string | null
          last_used_at: string | null
          name: string
          service: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          encrypted_key: string
          id?: string
          is_active?: boolean
          key_hint?: string | null
          last_used_at?: string | null
          name: string
          service: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          encrypted_key?: string
          id?: string
          is_active?: boolean
          key_hint?: string | null
          last_used_at?: string | null
          name?: string
          service?: string
          updated_at?: string
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
      workflow_schedules: {
        Row: {
          created_at: string | null
          cron_expression: string | null
          id: string
          interval_minutes: number | null
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          npc_id: string | null
          schedule_type: string
          user_id: string
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          cron_expression?: string | null
          id?: string
          interval_minutes?: number | null
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          npc_id?: string | null
          schedule_type: string
          user_id: string
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          cron_expression?: string | null
          id?: string
          interval_minutes?: number | null
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          npc_id?: string | null
          schedule_type?: string
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_schedules_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          run_count: number | null
          steps: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          run_count?: number | null
          steps?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          run_count?: number | null
          steps?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      insert_encrypted_credential: {
        Args: {
          p_api_key: string
          p_key_hint: string
          p_name: string
          p_passphrase: string
          p_service: string
        }
        Returns: Json
      }
      update_encrypted_credential: {
        Args: {
          p_api_key: string
          p_id: string
          p_key_hint: string
          p_name: string
          p_passphrase: string
          p_service: string
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
