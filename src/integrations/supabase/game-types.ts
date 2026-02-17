import type { Database } from './types';

export type GameDatabase = Database & {
  game: {
    Tables: {
      agent_configs: Database['public']['Tables']['agent_configs'];
      api_integrations: Database['public']['Tables']['api_integrations'];
      agent_memory: Database['public']['Tables']['agent_memory'];
      player_state: Database['public']['Tables']['player_state'];
      map_entities: {
        Row: {
          id: string;
          map_id: string;
          entity_type: string;
          type_id: string | null;
          display_name: string;
          position_x: number;
          position_y: number;
          tiled_class: string | null;
          role: string | null;
          sprite: string | null;
          ai_enabled: boolean;
          tools: string[];
          area_id: string | null;
          metadata: Record<string, unknown>;
          behavior_config: Record<string, unknown>;
          agent_config_id: string | null;
          template_id: string | null;
          source: string | null;
          is_interactive: boolean;
          interaction_radius: number;
          parent_entity_id: string | null;
          synced_at: string;
        };
        Insert: {
          id: string;
          map_id: string;
          entity_type: string;
          type_id?: string | null;
          display_name: string;
          position_x: number;
          position_y: number;
          tiled_class?: string | null;
          role?: string | null;
          sprite?: string | null;
          ai_enabled?: boolean;
          tools?: string[];
          area_id?: string | null;
          metadata?: Record<string, unknown>;
          behavior_config?: Record<string, unknown>;
          agent_config_id?: string | null;
          template_id?: string | null;
          source?: string | null;
          is_interactive?: boolean;
          interaction_radius?: number;
          parent_entity_id?: string | null;
          synced_at?: string;
        };
        Update: {
          id?: string;
          map_id?: string;
          entity_type?: string;
          type_id?: string | null;
          display_name?: string;
          position_x?: number;
          position_y?: number;
          tiled_class?: string | null;
          role?: string | null;
          sprite?: string | null;
          ai_enabled?: boolean;
          tools?: string[];
          area_id?: string | null;
          metadata?: Record<string, unknown>;
          behavior_config?: Record<string, unknown>;
          agent_config_id?: string | null;
          template_id?: string | null;
          source?: string | null;
          is_interactive?: boolean;
          interaction_radius?: number;
          parent_entity_id?: string | null;
          synced_at?: string;
        };
        Relationships: [];
      };
      map_metadata: {
        Row: {
          map_id: string;
          description: string | null;
          theme: string | null;
          ambient: string | null;
          synced_at: string;
        };
        Insert: {
          map_id: string;
          description?: string | null;
          theme?: string | null;
          ambient?: string | null;
          synced_at?: string;
        };
        Update: {
          map_id?: string;
          description?: string | null;
          theme?: string | null;
          ambient?: string | null;
          synced_at?: string;
        };
        Relationships: [];
      };
      object_templates: {
        Row: {
          id: string;
          name: string;
          category: string;
          base_entity_type: string;
          default_sprite: string;
          default_metadata: Record<string, unknown>;
          default_behavior_config: Record<string, unknown>;
          default_skills: string[];
          icon: string;
          description: string;
          is_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          category: string;
          base_entity_type: string;
          default_sprite?: string;
          default_metadata?: Record<string, unknown>;
          default_behavior_config?: Record<string, unknown>;
          default_skills?: string[];
          icon?: string;
          description?: string;
          is_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          base_entity_type?: string;
          default_sprite?: string;
          default_metadata?: Record<string, unknown>;
          default_behavior_config?: Record<string, unknown>;
          default_skills?: string[];
          icon?: string;
          description?: string;
          is_enabled?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
