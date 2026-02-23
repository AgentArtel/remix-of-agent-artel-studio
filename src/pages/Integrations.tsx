import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { Mail, Image } from 'lucide-react';

interface IntegrationsProps {
  onNavigate: (page: string) => void;
}

const PROVIDERS = [
  {
    id: 'google',
    name: 'Gmail',
    icon: Mail,
    description: 'Read and manage email',
    scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify',
  },
  {
    id: 'google-photos',
    name: 'Google Photos',
    icon: Image,
    description: 'Access photo library',
    scopes: 'https://www.googleapis.com/auth/photoslibrary.readonly',
  },
];

export const Integrations: React.FC<IntegrationsProps> = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['user-integrations', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (provider: typeof PROVIDERS[number]) => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: provider.scopes,
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    },
    onError: (err: Error) => toast.error(`Connection failed: ${err.message}`),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const { error } = await supabase
        .from('user_integrations')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('provider', providerId)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-integrations'] });
      toast.success('Integration disconnected');
    },
    onError: (err: Error) => toast.error(`Failed to disconnect: ${err.message}`),
  });

  const getIntegration = (providerId: string) =>
    integrations.find((i) => i.provider === providerId && i.is_active);

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="text-muted-foreground mt-1">Connect external services to your game</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
        {PROVIDERS.map((provider) => {
          const integration = getIntegration(provider.id);
          return (
            <IntegrationCard
              key={provider.id}
              name={provider.name}
              description={provider.description}
              icon={provider.icon}
              isConnected={!!integration}
              isExpired={integration ? isExpired(integration.expires_at) : false}
              isLoading={isLoading || connectMutation.isPending || disconnectMutation.isPending}
              onConnect={() => connectMutation.mutate(provider)}
              onDisconnect={() => disconnectMutation.mutate(provider.id)}
            />
          );
        })}
      </div>
    </div>
  );
};
