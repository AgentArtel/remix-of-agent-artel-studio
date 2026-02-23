import { ExternalLink, Glasses } from 'lucide-react';

interface EvenG1DashboardProps {
  onNavigate: (page: string) => void;
}

export const EvenG1Dashboard = ({ onNavigate }: EvenG1DashboardProps) => {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Glasses className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Even G1 Glasses</h1>
        </div>
        <a
          href="https://wave-lens-flow.lovable.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Open in new tab
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      <iframe
        src="https://wave-lens-flow.lovable.app"
        className="flex-1 w-full border-0"
        allow="camera;microphone;accelerometer;gyroscope"
        title="Even G1 Dashboard"
      />
    </div>
  );
};
