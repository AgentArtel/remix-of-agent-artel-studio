/**
 * Object Spawner Service
 * Loads workflow objects from database and spawns them on maps.
 * Objects call the object-action Edge Function (→ n8n) for all integrations.
 */

import { RpgMap, RpgEvent, EventData } from '@rpgjs/server'
import { createClient } from '@supabase/supabase-js'
import { EmailItem } from '../items/EmailItem'
import { TaggedEmailItem } from '../items/TaggedEmail'
import { SummaryItem } from '../items/Summary'
import { DraftEmailItem } from '../items/DraftEmail'
import { TaskFragmentItem } from '../items/TaskFragmentItem'
import {
  isRecording,
  appendStep,
  startRecording,
  cancelRecording,
  stopAndSave,
} from './workflowRecorder'
import { executeWorkflow, listWorkflows } from './workflowRunner'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Maps item type strings (from Edge Function responses) to RPG-JS item classes.
// player.addItem / player.removeItem require a class reference, not a string.
const ITEM_CLASS_MAP: Record<string, any> = {
  'email': EmailItem,
  'tagged-email': TaggedEmailItem,
  'summary': SummaryItem,
  'draft-email': DraftEmailItem,
  'task-fragment': TaskFragmentItem,
}

// Dynamically create event class for an object instance
function createObjectEventClass(
  templateId: string,
  templateName: string,
  templateActions: Record<string, any> | null
) {
  @EventData({
    name: templateId,
    hitbox: { width: 32, height: 16 }
  })
  class DynamicObjectEvent extends RpgEvent {
    onInit() {
      if (templateId === 'desk') {
        this.setGraphic('male')
      } else if (templateId === 'archivist') {
        this.setGraphic('female')
      } else if (templateId === 'butler') {
        this.setGraphic('male')
      } else {
        this.setGraphic('female')
      }
    }

    async onAction(player: any) {
      console.log(`[Object] Player ${player.id} interacting with ${templateId}`)

      // Generic path: if template defines actions, use data-driven handler
      if (templateActions && Object.keys(templateActions).length > 0) {
        return this.handleGenericInteraction(player)
      }

      // Legacy hardcoded handlers (kept until migrated to actions)
      if (templateId === 'desk') {
        return this.handleDeskInteraction(player)
      }
      if (templateId === 'archivist' || templateId === 'recorder') {
        return this.handleArchivistInteraction(player)
      }
      if (templateId === 'butler') {
        return this.handleButlerInteraction(player)
      }

      // Default: mailbox interaction
      return this.handleMailboxInteraction(player)
    }

    async handleGenericInteraction(player: any) {
      // 1. Build choice menu from template.actions
      const actionEntries = Object.entries(templateActions!)
      const choices = actionEntries.map(([key, action]: [string, any]) => ({
        text: action.description || key,
        value: key
      }))
      choices.push({ text: 'Leave', value: 'leave' })

      const choiceObj = await player.showChoices(
        `${templateName}`,
        choices,
        { talkWith: this }
      )
      const choice = typeof choiceObj === 'string' ? choiceObj : choiceObj?.value
      if (choice === 'leave' || !choice) return

      const actionDef = templateActions![choice] as any
      if (!actionDef) return

      // 2. Gather inputs from player variables
      const inputs: Record<string, any> = {}
      const requiredInputs: string[] = actionDef.inputs || []

      for (const inputKey of requiredInputs) {
        const val = player.getVariable(inputKey)
        if (val !== undefined && val !== null) {
          inputs[inputKey] = val
        }
      }

      // 3. If action requires inputs the player doesn't have, reject
      if (requiredInputs.length > 0) {
        const missing = requiredInputs.filter((k: string) => inputs[k] === undefined)
        if (missing.length > 0) {
          await player.showText(
            'You don\'t have what\'s needed for this.',
            { talkWith: this }
          )
          return
        }
      }

      // 4. Call object-action Edge Function
      try {
        await player.showText(
          actionDef.description || 'Working...',
          { talkWith: this }
        )

        const response = await fetch(
          `${process.env.SUPABASE_URL}/functions/v1/object-action`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              object_type: templateId,
              action: choice,
              player_id: player.id,
              inputs
            })
          }
        )

        const result = await response.json()

        if (result.success) {
          // Apply inventory removals
          if (result.inventory_delta?.remove?.length > 0) {
            for (const item of result.inventory_delta.remove) {
              const ItemClass = ITEM_CLASS_MAP[item.type]
              if (ItemClass) {
                player.removeItem(ItemClass, item.count || 1)
              } else {
                console.warn(`[${templateId}] No item class for type: ${item.type}`)
              }
            }
          }

          // Apply inventory additions
          if (result.inventory_delta?.add?.length > 0) {
            for (const item of result.inventory_delta.add) {
              const ItemClass = ITEM_CLASS_MAP[item.type]
              if (ItemClass) {
                player.addItem(ItemClass, item.count || 1)
              } else {
                console.warn(`[${templateId}] No item class for type: ${item.type}`)
              }
            }
          }

          // Apply gold reward
          if (result.reward_gold) {
            player.gold += result.reward_gold
          }

          // Apply player variable changes
          if (result.variables && typeof result.variables === 'object') {
            for (const [key, value] of Object.entries(result.variables)) {
              if (value === null) {
                player.setVariable(key, undefined)
              } else {
                player.setVariable(key, value)
              }
            }
          }

          // Show result message
          await player.showText(result.message || 'Done.', { talkWith: this })

          // Record workflow step if recording
          if (isRecording(player.id)) {
            appendStep(player.id, {
              object_type: templateId,
              action: choice,
              params: inputs,
              expected_inputs: requiredInputs,
              credentials_ref: '',
            })
          }
        } else {
          await player.showText(
            `${result.error?.message || result.message || 'Something went wrong.'}`,
            { talkWith: this }
          )
        }
      } catch (error) {
        console.error(`[${templateId}] Generic handler error:`, error)
        await player.showText('Something went wrong.', { talkWith: this })
      }
    }

    async handleDeskInteraction(player: any) {
      const choiceObj = await player.showChoices('The desk is covered in papers.', [
        { text: '📋 Process Mail', value: 'process' },
        { text: '🔍 Check Status', value: 'check' },
        { text: 'Leave', value: 'leave' }
      ], { talkWith: this })

      const choice = typeof choiceObj === 'string' ? choiceObj : choiceObj?.value

      if (choice === 'leave') return

      const action = choice === 'process' ? 'process_mail' : 'check_desk'

      try {
        await player.showText(
          choice === 'process' ? 'Organizing your letters...' : 'Checking the desk...',
          { talkWith: this }
        )

        const response = await fetch(
          `${process.env.SUPABASE_URL}/functions/v1/object-action`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              object_type: 'desk',
              action: action,
              player_id: player.id
            })
          }
        )

        const result = await response.json()

        if (result.success) {
          // Remove consumed items from inventory
          if (result.inventory_delta?.remove?.length > 0) {
            for (const item of result.inventory_delta.remove) {
              const ItemClass = ITEM_CLASS_MAP[item.type]
              if (ItemClass) {
                player.removeItem(ItemClass, item.count)
              } else {
                console.warn(`[Desk] No item class found for type: ${item.type}`)
              }
            }
          }

          // Add any items returned
          if (result.inventory_delta?.add?.length > 0) {
            for (const item of result.inventory_delta.add) {
              const ItemClass = ITEM_CLASS_MAP[item.type]
              if (ItemClass) {
                player.addItem(ItemClass, item.count || 1)
              } else {
                console.warn(`[Desk] Unknown item type: ${item.type}`)
              }
            }
          }

          await player.showText(result.message, { talkWith: this })

          // Record step if player is recording a workflow
          if (isRecording(player.id)) {
            appendStep(player.id, {
              object_type: 'desk',
              action: action,
              params: {},
              expected_inputs: [],
              credentials_ref: 'google',
            })
          }
        } else {
          await player.showText(`❌ ${result.error?.message || 'Could not process'}`, { talkWith: this })
        }
      } catch (error) {
        console.error('[Desk] Error:', error)
        await player.showText('❌ The desk is cluttered.', { talkWith: this })
      }
    }

    async handleMailboxInteraction(player: any) {
      const choiceObj = await player.showChoices('What would you like to do?', [
        { text: '📬 Get Mail', value: 'get' },
        { text: '✉️ Send Mail', value: 'send' },
        { text: 'Leave', value: 'leave' }
      ], { talkWith: this })

      const choice = typeof choiceObj === 'string' ? choiceObj : choiceObj?.value
      console.log(`[Mailbox] Player chose: ${choice}`)

      if (choice === 'leave') return

      if (choice === 'send') {
        const to = await player.showTextInput('Who would you like to write to?', { talkWith: this })
        if (!to || to.trim() === '') {
          await player.showText('Never mind then.', { talkWith: this })
          return
        }

        const subject = await player.showTextInput('What is the letter about?', { talkWith: this })
        if (!subject || subject.trim() === '') {
          await player.showText('You decided not to send an empty letter.', { talkWith: this })
          return
        }

        const body = await player.showTextInput('Write your message:', { talkWith: this, multiline: true })
        if (!body || body.trim() === '') {
          await player.showText('You put the blank letter away.', { talkWith: this })
          return
        }

        const inputs = { to: to.trim(), subject: subject.trim(), body: body.trim() }

        try {
          const sendResponse = await fetch(
            `${process.env.SUPABASE_URL}/functions/v1/object-action`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify({
                object_type: templateId,
                action: 'send_email',
                player_id: player.id,
                inputs,
              })
            }
          )

          const sendResult = await sendResponse.json()

          if (sendResult.success) {
            await player.showText('✉️ Your letter has been sent!', { talkWith: this })

            if (isRecording(player.id)) {
              appendStep(player.id, {
                object_type: templateId,
                action: 'send_email',
                params: inputs,
                expected_inputs: [],
                credentials_ref: 'google',
              })
            }
          } else {
            await player.showText(`❌ Could not send: ${sendResult.error?.message}`, { talkWith: this })
          }
        } catch (error) {
          await player.showText('❌ The postal service is having trouble.', { talkWith: this })
        }
        return
      }

      if (choice === 'get') {
        console.log(`[Mailbox] Starting fetch_emails for player ${player.id}`)

        try {
          await player.showText('Checking your mailbox...', { talkWith: this })

          const response = await fetch(
            `${process.env.SUPABASE_URL}/functions/v1/object-action`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify({
                object_type: templateId,
                action: 'fetch_emails',
                player_id: player.id
              })
            }
          )

          const result = await response.json()
          console.log(`[Mailbox] API result: success=${result.success}`, result.error ? `error=${result.error.message}` : '')

          if (result.success) {
            let itemsAdded = 0

            if (result.inventory_delta?.add?.length > 0) {
              for (const item of result.inventory_delta.add) {
                const ItemClass = ITEM_CLASS_MAP[item.type]
                if (ItemClass) {
                  player.addItem(ItemClass, item.count || 1)
                  itemsAdded += item.count || 1
                } else {
                  console.warn(`[Mailbox] Unknown item type: ${item.type}`)
                }
              }
            }

            if (itemsAdded > 0) {
              await player.showText(`📬 You collected ${itemsAdded} letters.`, { talkWith: this })
            } else {
              await player.showText('No new mail today.', { talkWith: this })
            }

            // Record step if player is recording a workflow
            if (isRecording(player.id)) {
              appendStep(player.id, {
                object_type: templateId,
                action: 'fetch_emails',
                params: {},
                expected_inputs: [],
                credentials_ref: 'google',
              })
            }
          } else {
            await player.showText(`❌ ${result.error?.message || 'Could not check mail'}`, { talkWith: this })
          }
        } catch (error) {
          console.error('[Mailbox] Error:', error)
          await player.showText('❌ Mailbox is not responding', { talkWith: this })
        }
      }
    }

    async handleArchivistInteraction(player: any) {
      const recording = isRecording(player.id)

      if (recording) {
        const choiceObj = await player.showChoices('I am chronicling your workflow...', [
          { text: '📜 Save workflow', value: 'save' },
          { text: '❌ Cancel recording', value: 'cancel' },
          { text: 'Continue', value: 'continue' }
        ], { talkWith: this })
        const choice = typeof choiceObj === 'string' ? choiceObj : choiceObj?.value

        if (choice === 'save') {
          const name = await player.showTextInput('Name this workflow:', { talkWith: this })
          if (!name?.trim()) {
            await player.showText('Recording cancelled.', { talkWith: this })
            cancelRecording(player.id)
            return
          }
          const saved = await stopAndSave(player, name.trim())
          if (saved) {
            await player.showText(`Workflow "${saved.name}" has been chronicled!`, { talkWith: this })
          } else {
            await player.showText('Something went wrong saving the workflow.', { talkWith: this })
          }
        } else if (choice === 'cancel') {
          cancelRecording(player.id)
          await player.showText('Recording cancelled.', { talkWith: this })
        }
        // 'continue' — just close dialog, keep recording
      } else {
        const choiceObj = await player.showChoices('I chronicle the actions of adventurers.', [
          { text: '🔴 Start recording', value: 'start' },
          { text: 'Leave', value: 'leave' }
        ], { talkWith: this })
        const choice = typeof choiceObj === 'string' ? choiceObj : choiceObj?.value

        if (choice === 'start') {
          startRecording(player)
          await player.showText('Recording started! Use objects to build your workflow, then return to me.', { talkWith: this })
        }
      }
    }

    async handleButlerInteraction(player: any) {
      const choiceObj = await player.showChoices('Good day! How may I assist you?', [
        { text: '▶ Run a workflow', value: 'run' },
        { text: '📋 View my workflows', value: 'list' },
        { text: '⏰ Schedule a workflow', value: 'schedule' },
        { text: 'Leave', value: 'leave' }
      ], { talkWith: this })

      const choice = typeof choiceObj === 'string' ? choiceObj : choiceObj?.value
      if (choice === 'leave' || !choice) return

      if (choice === 'list' || choice === 'run' || choice === 'schedule') {
        const workflows = await listWorkflows(player.id)

        if (workflows.length === 0) {
          await player.showText('You have no saved workflows. Visit the Archivist to record one.', { talkWith: this })
          return
        }

        const wfChoice = await player.showChoices(
          choice === 'run'
            ? 'Which workflow shall I run?'
            : choice === 'schedule'
            ? 'Which workflow shall I schedule?'
            : 'Your workflows:',
          workflows.map((w: any) => ({ text: `${w.name} (${w.run_count || 0} runs)`, value: w.id })),
          { talkWith: this }
        )

        const wfId = typeof wfChoice === 'string' ? wfChoice : wfChoice?.value
        if (!wfId || choice === 'list') return

        if (choice === 'run') {
          await player.showText('Running your workflow...', { talkWith: this })
          const result = await executeWorkflow(wfId, player.id, 'npc')

          if (result.success) {
            await player.showText(`Workflow complete! ${result.stepsCompleted} steps executed.`, { talkWith: this })
          } else {
            await player.showText(`Something went wrong at step ${result.stepsCompleted + 1}: ${result.error}`, { talkWith: this })
          }
        }

        if (choice === 'schedule') {
          const intervalChoice = await player.showChoices('How often should I run it?', [
            { text: 'Every 30 minutes', value: '30' },
            { text: 'Every hour', value: '60' },
            { text: 'Daily (9am)', value: 'daily' }
          ], { talkWith: this })

          const interval = typeof intervalChoice === 'string' ? intervalChoice : intervalChoice?.value
          if (!interval || interval === 'leave') return

          if (!supabase) {
            await player.showText('Schedule service unavailable.', { talkWith: this })
            return
          }

          const wf = workflows.find((w: any) => w.id === wfId)
          const wfName = wf?.name || 'workflow'

          await supabase.from('workflow_schedules').insert({
            workflow_id: wfId,
            user_id: player.id,
            schedule_type: interval === 'daily' ? 'cron' : 'interval',
            cron_expression: interval === 'daily' ? '0 9 * * *' : null,
            interval_minutes: interval !== 'daily' ? parseInt(interval) : null,
            next_run_at: new Date(Date.now() + 60000).toISOString(), // first run in 1 min
            is_active: true,
            npc_id: 'butler',
          })

          await player.showText(`Scheduled! I will run "${wfName}" automatically.`, { talkWith: this })
        }
      }
    }
  }

  return DynamicObjectEvent
}

// Load and spawn objects for a map
export async function spawnMapObjects(map: RpgMap, mapId: string) {
  if (!supabase) {
    console.error('[ObjectSpawner] Supabase not initialized')
    return
  }

  try {
    const { data: objects, error } = await supabase
      .from('object_instances')
      .select(`
        id,
        position,
        template:object_templates!inner(id, name, is_enabled, actions)
      `)
      .eq('map_id', mapId)
      .eq('is_enabled', true)
      .eq('template.is_enabled', true)

    if (error) {
      console.error('[ObjectSpawner] Error loading objects:', error)
      return
    }

    console.log(`[ObjectSpawner] Found ${objects?.length || 0} objects for map ${mapId}`)

    for (const obj of objects || []) {
      const template = obj.template as any

      const EventClass = createObjectEventClass(template.id, template.name, template.actions || null)

      const event = await map.createDynamicEvent({
        x: obj.position.x,
        y: obj.position.y,
        event: EventClass
      })

      if (event) {
        console.log(`[ObjectSpawner] Spawned ${template.name} at (${obj.position.x}, ${obj.position.y})`)
      }
    }
  } catch (error) {
    console.error('[ObjectSpawner] Error:', error)
  }
}
