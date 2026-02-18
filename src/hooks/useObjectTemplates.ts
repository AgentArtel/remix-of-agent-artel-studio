import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ObjectTemplateAction {
  description: string;
  inputs: string[];
  outputs: string[];
  credentials?: string[];
}

export interface ObjectTemplate {
  id: string;
  name: string;
  category: string;
  base_entity_type: string;
  default_sprite: string | null;
  icon: string;
  description: string | null;
  is_enabled: boolean;
  actions: Record<string, ObjectTemplateAction> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ObjectInstance {
  id: string;
  template_id: string;
  map_id: string;
  position: { x: number; y: number };
  custom_name: string | null;
  custom_config: Record<string, unknown> | null;
  is_enabled: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export const useObjectTemplates = (enabledOnly = true) =>
  useQuery({
    queryKey: ['game-object-templates', enabledOnly],
    queryFn: async () => {
      try {
        let query = (supabase as any).from('object_templates').select('*').order('category');
        if (enabledOnly) query = query.eq('is_enabled', true);
        const { data, error } = await query;
        if (error) return [] as ObjectTemplate[];
        return data as ObjectTemplate[];
      } catch {
        return [] as ObjectTemplate[];
      }
    },
  });

export const useObjectInstances = () =>
  useQuery({
    queryKey: ['game-object-instances'],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('object_instances')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) return [] as ObjectInstance[];
        return (data as any[]).map((d: any) => ({
          ...d,
          position: typeof d.position === 'string' ? JSON.parse(d.position) : d.position ?? { x: 0, y: 0 },
        })) as ObjectInstance[];
      } catch {
        return [] as ObjectInstance[];
      }
    },
  });
