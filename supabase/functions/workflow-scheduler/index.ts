/**
 * Workflow Scheduler Edge Function
 * Called by pg_cron every minute.
 * Finds all due workflow_schedules and executes each step via the object-action Edge Function.
 *
 * Setup (run once in Supabase SQL Editor):
 *
 *   -- Enable extensions (Dashboard > Database > Extensions)
 *   -- pg_cron and pg_net
 *
 *   ALTER DATABASE postgres SET app.supabase_url = 'https://<project-ref>.supabase.co';
 *   ALTER DATABASE postgres SET app.service_role_key = '<your-service-role-key>';
 *
 *   SELECT cron.schedule(
 *     'check-workflow-schedules',
 *     '* * * * *',
 *     $$
 *     SELECT net.http_post(
 *       url := current_setting('app.supabase_url') || '/functions/v1/workflow-scheduler',
 *       headers := jsonb_build_object(
 *         'Content-Type', 'application/json',
 *         'Authorization', 'Bearer ' || current_setting('app.service_role_key')
 *       ),
 *       body := '{}'::jsonb
 *     );
 *     $$
 *   );
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Find all due schedules with their workflow steps
    const { data: schedules, error: scheduleError } = await supabase
      .from('workflow_schedules')
      .select('*, workflow:workflow_templates(*)')
      .eq('is_active', true)
      .lte('next_run_at', new Date().toISOString())

    if (scheduleError) {
      console.error('[WorkflowScheduler] Error fetching schedules:', scheduleError)
      return new Response(
        JSON.stringify({ ran: 0, error: scheduleError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({ ran: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const OBJECT_ACTION_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/object-action`
    const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    let ran = 0

    for (const schedule of schedules) {
      const workflow = schedule.workflow as any
      if (!workflow?.steps?.length) continue

      // Create run record
      const { data: run } = await supabase
        .from('workflow_runs')
        .insert({
          workflow_id: schedule.workflow_id,
          player_id: schedule.user_id,
          status: 'running',
          logs: [],
        })
        .select()
        .single()

      let success = true
      const logs: any[] = []

      // Execute each step via object-action
      for (const step of workflow.steps) {
        try {
          const res = await fetch(OBJECT_ACTION_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              object_type: step.object_type,
              action: step.action,
              player_id: schedule.user_id,
              inputs: { params: step.params || {} },
              workflow_run_id: run?.id,
            }),
          })

          const result = await res.json()
          logs.push({
            step: step.order,
            action: `${step.object_type}.${step.action}`,
            success: result.success,
            timestamp: new Date().toISOString(),
          })

          if (!result.success) {
            success = false
            break
          }
        } catch (err: any) {
          logs.push({
            step: step.order,
            success: false,
            error: err.message,
            timestamp: new Date().toISOString(),
          })
          success = false
          break
        }
      }

      // Update run record
      if (run) {
        await supabase.from('workflow_runs').update({
          status: success ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          logs,
        }).eq('id', run.id)
      }

      // Update workflow run count
      if (success) {
        await supabase.from('workflow_templates').update({
          run_count: (workflow.run_count || 0) + 1,
          last_run_at: new Date().toISOString(),
        }).eq('id', schedule.workflow_id)
      }

      // Compute next_run_at
      let nextRun: string | null = null
      if (schedule.schedule_type === 'interval' && schedule.interval_minutes) {
        nextRun = new Date(Date.now() + schedule.interval_minutes * 60000).toISOString()
      } else if (schedule.schedule_type === 'cron') {
        // Simple daily fallback (24h).
        // TODO: add a proper cron-parser Deno library for accurate next-run calculation.
        nextRun = new Date(Date.now() + 86400000).toISOString()
      }
      // 'once' schedules deactivate after first run

      await supabase.from('workflow_schedules').update({
        last_run_at: new Date().toISOString(),
        next_run_at: nextRun,
        is_active: schedule.schedule_type !== 'once',
      }).eq('id', schedule.id)

      ran++
      console.log(`[WorkflowScheduler] Ran schedule ${schedule.id} — success=${success}`)
    }

    return new Response(
      JSON.stringify({ ran }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ ran: 0, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
