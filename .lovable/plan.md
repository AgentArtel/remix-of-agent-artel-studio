

# Add Map Placement UI for Object Instances

## Overview
Add an "Object Instances" section to the Object Templates page that lets you place, edit, and remove object instances on maps -- mirroring the NPC placement workflow. Since object instances are tightly coupled to templates, this will live on the same Object Templates page as a second tab/section rather than a separate page.

## What You Will See
- A new **"Instances"** tab on the Object Templates page showing all placed objects
- Each instance card shows its template name, map ID, position (x, y), custom name, and enabled status
- A **"Place Object"** button opens a modal where you pick a template, enter a map ID, set x/y coordinates, and optionally give it a custom name and config
- Edit and delete buttons on each instance card
- A mini-map visualization (reusing the existing `EntityMiniMap` component) showing placed objects on each map

## Technical Details

### Files to modify
1. **`src/pages/ObjectTemplates.tsx`** -- Add a tab system (Templates | Instances) and the instances management UI:
   - New `ObjectInstanceCard` component showing template_id, map_id, position, custom_name, enabled status, with edit/delete buttons
   - "Place Object" button and modal with fields: template (dropdown from templates list), map_id (text), position x/y (number inputs), custom_name (optional), custom_config (JSON textarea), enabled (toggle)
   - Query: `supabase.from('object_instances').select('*').order('created_at')`
   - Create: `supabase.from('object_instances').insert({...})`
   - Update: `supabase.from('object_instances').update({...}).eq('id', instance.id)`
   - Delete: `supabase.from('object_instances').delete().eq('id', instance.id)`
   - Query key: `['game-object-instances']`
   - Mini-map per map using `EntityMiniMap` component, mapping instances to its entity format

2. **`src/hooks/useObjectTemplates.ts`** -- Add a new `useObjectInstances` hook:
   - Fetches from `object_instances` table
   - Returns typed `ObjectInstance` interface matching the DB schema (id, template_id, map_id, position, custom_name, custom_config, is_enabled, created_at, updated_at)

### No database changes needed
The `object_instances` table already exists with the right columns and permissive RLS policies.

### UI Layout
The page will use a simple tab bar at the top:

```text
+------------------+------------------+
|   Templates      |   Instances      |
+------------------+------------------+
|                                     |
|  [Place Object] button              |
|                                     |
|  Mini-map(s) showing placed objects |
|                                     |
|  Grid of instance cards             |
|    - template icon + name           |
|    - map: simplemap                 |
|    - position: (680, 400)           |
|    - [Edit] [Delete]                |
+-------------------------------------+
```

### Instance Modal Fields
- **Template** -- dropdown select populated from `useObjectTemplates(false)`
- **Map ID** -- text input (e.g. "simplemap")
- **Position X** -- number input
- **Position Y** -- number input
- **Custom Name** -- optional text input (override display name)
- **Custom Config** -- JSON textarea for instance-specific overrides
- **Enabled** -- toggle

