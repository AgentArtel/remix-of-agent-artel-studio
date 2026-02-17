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

export const useObjectTemplates = (enabledOnly = true) =>
  useQuery({
    queryKey: ['game-object-templates', enabledOnly],
    queryFn: async () => {
      // object_templates table may not exist in this project
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
