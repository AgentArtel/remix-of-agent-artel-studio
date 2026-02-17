

# Disable Auth Gate + Add Object Template CRUD

## Overview
Three changes: (1) bypass the login screen during development, (2) verify the Objects page renders the Mailbox template, and (3) add inline edit/delete functionality to object template cards.

## Step 1: Disable Auth Gate for Development

Modify `src/App.tsx` -- in the `AppContent` component, skip the `!user` check and always render `AuthenticatedApp`. The auth provider stays in place (so OAuth integrations still work), but the login wall is removed.

```typescript
// Before:
if (!user) {
  return <Login />;
}

// After:
// Auth gate disabled for development
// if (!user) {
//   return <Login />;
// }
```

## Step 2: Add Edit/Delete to Object Template Cards

Modify `src/pages/ObjectTemplates.tsx`:

- Add a **delete** button (trash icon) to each card that calls `supabase.from('object_templates').delete().eq('id', template.id)` and invalidates the query cache.
- Add an **edit** button (pencil icon) that opens an inline edit modal/form.
- Add a **"Create Template"** button in the page header.

### Edit/Create Modal
A simple modal (reuse the existing `Modal` component from `src/components/ui-custom/Modal.tsx`) with fields:
- **ID** (text, required, only editable on create)
- **Name** (text, required)
- **Icon** (text/emoji, default "package")
- **Category** (text, default "object")
- **Description** (textarea)
- **Base Entity Type** (text, default "object")
- **Default Sprite** (text, optional)
- **Enabled** (toggle/checkbox)
- **Actions** (JSON textarea for now -- keeps it simple, can be made richer later)

### Delete Confirmation
Use a simple `window.confirm()` dialog before deleting.

### Data Operations
All mutations use the Supabase client directly:
- **Create**: `supabase.from('object_templates').insert({...})`
- **Update**: `supabase.from('object_templates').update({...}).eq('id', id)`
- **Delete**: `supabase.from('object_templates').delete().eq('id', id)`

After each mutation, invalidate the `['game-object-templates']` query key via `useQueryClient`.

## Technical Details

### Files to modify:
- `src/App.tsx` -- comment out auth gate (lines 111-113)
- `src/pages/ObjectTemplates.tsx` -- add edit/delete buttons, create button, and modal form

### No database changes needed
The `object_templates` table already exists with permissive RLS policies (`true` for all operations).

