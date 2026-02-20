import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Credential {
  id: string;
  name: string;
  service: string;
  key_hint: string | null;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchCredentials(): Promise<Credential[]> {
  const { data, error } = await supabase
    .from('studio_credentials')
    .select('id, name, service, key_hint, is_active, last_used_at, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as Credential[]) ?? [];
}

async function invokeManageCredential(method: string, body: Record<string, unknown>) {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/manage-credential`,
    {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify(body),
    }
  );

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export function useCredentials() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['credentials'],
    queryFn: fetchCredentials,
  });

  const addMutation = useMutation({
    mutationFn: (vars: { name: string; service: string; api_key: string }) =>
      invokeManageCredential('POST', vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      toast.success('Credential added');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; name: string; service: string; api_key?: string }) =>
      invokeManageCredential('PUT', vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      toast.success('Credential updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/manage-credential?id=${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Delete failed');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      toast.success('Credential deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    credentials: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    addCredential: addMutation.mutateAsync,
    updateCredential: updateMutation.mutateAsync,
    deleteCredential: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
