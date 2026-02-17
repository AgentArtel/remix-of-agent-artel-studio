import { useQuery } from '@tanstack/react-query';
import { gameDb } from '@/lib/gameSchema';

export interface ObjectTemplate {
  id: string;
  name: string;
  category: string;
  base_entity_type: string;
  default_sprite: string;
  icon: string;
  description: string;
  is_enabled: boolean;
}

export const useObjectTemplates = (enabledOnly = true) =>
  useQuery({
    queryKey: ['game-object-templates', enabledOnly],
    queryFn: async () => {
      let query = gameDb().from('object_templates').select('*').order('category');
      if (enabledOnly) query = query.eq('is_enabled', true);
      const { data, error } = await query;
      if (error) throw error;
      return data as ObjectTemplate[];
    },
  });
