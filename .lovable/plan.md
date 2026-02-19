
# Fix Edge Function Build Errors

## Problem
Two edge functions have TypeScript errors where `error` in catch blocks is typed as `unknown` (Deno strict mode). The fix is to add `: any` type annotations to the catch parameters.

## Changes

### 1. `supabase/functions/object-api/index.ts` (line 63)
Change `} catch (error) {` to `} catch (error: any) {`

### 2. `supabase/functions/npc-ai-chat/index.ts` (line 103)
Change `} catch (error) {` to `} catch (error: any) {`

Both are one-character fixes. No other files need changes.
