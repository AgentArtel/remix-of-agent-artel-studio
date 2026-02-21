import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { StatCard } from '@/components/dashboard/StatCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { WorkflowPreview } from '@/components/dashboard/WorkflowPreview';
import { ExecutionChart } from '@/components/dashboard/ExecutionChart';
import { SkillsManager } from '@/components/dashboard/SkillsManager';
import { ArchitectureView } from '@/components/dashboard/ArchitectureView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, Play, CheckCircle, Clock, Plus, Sparkles, ArrowRight, Wrench, Network } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { data: workflows = [], isLoading: loadingWorkflows } = useQuery({
    queryKey: ['studio-workflows'],
    queryFn: async () => {
      const { data, error } = await supabase.from('studio_workflows').select('*').order('updated_at', { ascending: false }).limit(4);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: allWorkflows = [] } = useQuery({
    queryKey: ['studio-all-workflows'],
    queryFn: async () => {
      const { data, error } = await supabase.from('studio_workflows').select('id, status');
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['studio-activity-log'],
    queryFn: async () => {
      const { data, error } = await supabase.from('studio_activity_log').select('*').order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: executions = [], isLoading: loadingExecs } = useQuery({
    queryKey: ['studio-executions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('studio_executions').select('*').order('started_at', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  // Compute stats
  const activeCount = allWorkflows.filter((w: any) => w.status === 'active').length;
  const todayExecs = executions.filter((e: any) => {
    const d = new Date(e.started_at);
    return d.toDateString() === new Date().toDateString();
  });
  const successExecs = executions.filter((e: any) => e.status === 'success');
  const successRate = executions.length > 0 ? ((successExecs.length / executions.length) * 100).toFixed(1) : '0';
  const completedWithDuration = executions.filter((e: any) => e.duration_ms != null);
  const avgDuration = completedWithDuration.length > 0
    ? (completedWithDuration.reduce((sum: number, e: any) => sum + e.duration_ms, 0) / completedWithDuration.length / 1000).toFixed(1)
    : '0';

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthCounts: Record<string, number> = {};
  monthLabels.forEach(l => { monthCounts[l] = 0; });
  executions.forEach((e: any) => {
    const m = new Date(e.started_at).getMonth();
    monthCounts[monthLabels[m]]++;
  });
  const chartData = monthLabels.map(l => monthCounts[l]);

  const mappedWorkflows = workflows.map((w: any) => ({
    id: w.id, name: w.name, description: w.description,
    status: w.status as 'active' | 'inactive' | 'error',
    lastRun: formatRelativeTime(w.last_run_at),
    executionCount: w.execution_count ?? 0,
  }));

  const mappedActivities = activities.map((a: any) => ({
    id: a.id,
    type: a.type as 'execution' | 'success' | 'error' | 'created' | 'updated',
    message: a.message, workflowName: a.workflow_name ?? '',
    timestamp: formatRelativeTime(a.created_at),
  }));

  const isLoading = loadingWorkflows || loadingActivities || loadingExecs;

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Studio Dashboard</h1>
          <p className="text-muted-foreground mt-1">Workflow automation and agent orchestration.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => onNavigate('templates')}>
            <Sparkles className="w-4 h-4 mr-2" /> Browse Templates
          </Button>
          <Button className="bg-accent-green text-background hover:bg-accent-green/90" onClick={() => onNavigate('editor')}>
            <Plus className="w-4 h-4 mr-2" /> Create Workflow
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" /> Skills</TabsTrigger>
          <TabsTrigger value="architecture" className="flex items-center gap-1.5"><Network className="w-3.5 h-3.5" /> Architecture</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
            ) : (
              <>
                <StatCard title="Active Workflows" value={String(activeCount)} subtitle={`${allWorkflows.length} total`} trend="up" trendValue={`${activeCount}`} icon={<Zap className="w-5 h-5" />} />
                <StatCard title="Executions Today" value={String(todayExecs.length)} subtitle="Across all workflows" trend="up" trendValue={`${todayExecs.length}`} icon={<Play className="w-5 h-5" />} />
                <StatCard title="Success Rate" value={`${successRate}%`} subtitle={`${executions.length} total executions`} trend="up" trendValue={`${successRate}%`} icon={<CheckCircle className="w-5 h-5" />} />
                <StatCard title="Avg Duration" value={`${avgDuration}s`} subtitle="Per execution" trend="down" trendValue={`${avgDuration}s`} icon={<Clock className="w-5 h-5" />} />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-foreground">Recent Workflows</h2>
                <Button variant="ghost" size="sm" className="text-accent-green hover:text-accent-green/80" onClick={() => onNavigate('workflows')}>
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loadingWorkflows ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
                ) : (
                  mappedWorkflows.map((workflow) => (
                    <WorkflowPreview key={workflow.id} {...workflow} onRun={() => toast.success(`Workflow "${workflow.name}" started`)} onEdit={() => onNavigate(`editor:${workflow.id}`)} />
                  ))
                )}
              </div>
            </div>

            <div className="space-y-6">
              {loadingExecs ? <Skeleton className="h-52 rounded-xl" /> : <ExecutionChart data={chartData} labels={monthLabels} />}
              {loadingActivities ? <Skeleton className="h-64 rounded-xl" /> : <ActivityFeed activities={mappedActivities} onItemClick={() => onNavigate('executions')} />}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="skills">
          <SkillsManager />
        </TabsContent>

        <TabsContent value="architecture">
          <ArchitectureView />
        </TabsContent>
      </Tabs>
    </div>
  );
};
