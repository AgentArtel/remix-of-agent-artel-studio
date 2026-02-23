import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export const OAuthCallbackHandler: React.FC = () => {
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const handleCallback = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/', { replace: true });
          return;
        }

        const providerToken = session.provider_token;
        const providerRefreshToken = session.provider_refresh_token;

        if (providerToken) {
          // Determine which provider scopes were granted
          const rawMeta = session.user.app_metadata;
          const provider = rawMeta?.provider ?? 'google';

          // Store the integration
          await supabase.from('user_integrations').upsert({
            user_id: session.user.id,
            provider,
            provider_account_id: session.user.user_metadata?.provider_id ?? session.user.id,
            access_token: providerToken,
            refresh_token: providerRefreshToken ?? null,
            expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
            scope: (session.user.user_metadata as any)?.full_name ?? null,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,provider' });
        }

        navigate('/', { replace: true });
      } catch (err) {
        console.error('OAuth callback error:', err);
        navigate('/', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Connecting your account...</p>
      </div>
    </div>
  );
};
