import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LucideIcon, Loader2 } from 'lucide-react';

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  isConnected: boolean;
  isExpired?: boolean;
  isLoading?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  name,
  description,
  icon: Icon,
  isConnected,
  isExpired,
  isLoading,
  onConnect,
  onDisconnect,
}) => {
  const status = isConnected ? (isExpired ? 'expired' : 'connected') : 'disconnected';

  const statusColors = {
    connected: 'bg-primary/20 text-primary',
    expired: 'bg-[hsl(var(--destructive))]/20 text-[hsl(var(--destructive))]',
    disconnected: 'bg-muted text-muted-foreground',
  };

  const statusLabels = {
    connected: 'Connected',
    expired: 'Expired',
    disconnected: 'Not connected',
  };

  return (
    <div className={cn(
      'relative p-5 rounded-2xl bg-card border transition-all duration-[var(--duration-fast)]',
      isConnected && !isExpired
        ? 'border-primary/30 hover:border-primary/50 hover:shadow-glow'
        : 'border-border hover:border-border/80',
    )}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-primary/60" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          <span className={cn('inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium', statusColors[status])}>
            {statusLabels[status]}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        {isConnected ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-destructive"
            onClick={onDisconnect}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
            Disconnect
          </Button>
        ) : (
          <Button
            size="sm"
            className="text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={onConnect}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
            Connect
          </Button>
        )}
      </div>
    </div>
  );
};
