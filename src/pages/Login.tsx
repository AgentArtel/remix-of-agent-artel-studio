import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-center space-y-6">
        <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-[var(--gradient-green-start)] to-[var(--gradient-green-end)] flex items-center justify-center shadow-glow">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Agent Artel Studio</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to manage your game</p>
        </div>
        <Button
          onClick={handleGoogleSignIn}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  );
};
