# Artelio - Agent Artel

A visual workflow builder and AI agent management studio for creating, deploying, and managing AI-powered NPCs (Non-Player Characters), game objects, and automation workflows. Built with React, TypeScript, Vite, and Supabase.

## Project Overview

Artelio is a **Lovable-generated** full-stack application that provides:

- **Visual Workflow Editor**: Node-based canvas for building AI workflows with drag-and-drop functionality
- **NPC Management**: Create and configure AI-powered game characters with memory, personality, and behavior
- **Object Templates**: Define interactive game objects with custom actions
- **Map Editor**: Place NPCs and objects on game maps with position tracking
- **Integration Hub**: Connect external services (Gmail, Slack, OpenAI, etc.)
- **Execution Engine**: Run workflows and track execution history
- **n8n Import**: Import workflows from n8n format

### Target Use Cases

- Game developers building AI-powered NPCs for RPGs
- Creating conversational agents with persistent memory
- Visual automation workflow design
- Game world object interaction systems

## Technology Stack

| Category | Technology |
|----------|------------|
| **Frontend Framework** | React 18.3.1 with TypeScript |
| **Build Tool** | Vite 5.4.19 |
| **Styling** | Tailwind CSS 3.4.17 |
| **UI Components** | shadcn/ui + Radix UI primitives |
| **State Management** | React Query (TanStack Query) |
| **Routing** | React Router DOM |
| **Backend/Database** | Supabase (PostgreSQL + Edge Functions) |
| **Authentication** | Supabase Auth |
| **Testing** | Vitest + React Testing Library |
| **Linting** | ESLint 9 with TypeScript ESLint |

### Key Dependencies

```
# UI & Styling
- @radix-ui/* (40+ headless UI primitives)
- tailwindcss-animate (animations)
- lucide-react (icons)
- class-variance-authority (component variants)
- clsx + tailwind-merge (class utilities)

# Forms & Validation
- react-hook-form
- zod (schema validation)
- @hookform/resolvers

# Data Fetching
- @tanstack/react-query

# Notifications
- sonner (toasts)
- @radix-ui/react-toast

# Utilities
- date-fns (date formatting)
- embla-carousel-react
- recharts (charts)
- vaul (drawers)
- cmdk (command palette)
```

## Project Structure

```
studio/
├── src/
│   ├── components/           # React components
│   │   ├── ui/              # shadcn/ui base components (50+ files)
│   │   ├── ui-custom/       # Custom UI components
│   │   ├── canvas/          # Workflow canvas components
│   │   ├── nodes/           # Node type components (AIAgent, Code, HTTP, etc.)
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── credentials/     # Credential management
│   │   ├── workflow/        # Workflow list components
│   │   ├── execution/       # Execution history components
│   │   ├── npcs/            # NPC management components
│   │   ├── map-entities/    # Map entity components
│   │   ├── integrations/    # OAuth & integrations
│   │   ├── onboarding/      # User onboarding
│   │   ├── forms/           # Form input components
│   │   └── templates/       # Template cards
│   ├── pages/               # Page components
│   │   ├── Index.tsx        # Main app shell
│   │   ├── Dashboard.tsx    # Home dashboard
│   │   ├── WorkflowList.tsx # Workflow management
│   │   ├── WorkflowEditorPage.tsx # Visual editor
│   │   ├── NPCs.tsx         # NPC builder
│   │   ├── MapAgent.tsx     # Map placement tool
│   │   ├── MapBrowser.tsx   # Map list
│   │   ├── GameScripts.tsx  # Script management
│   │   ├── ObjectTemplates.tsx # Object template editor
│   │   ├── PlayerSessions.tsx # Player activity
│   │   ├── PlayGame.tsx     # Game preview
│   │   ├── Ideas.tsx        # Idea board
│   │   ├── Integrations.tsx # Service connections
│   │   ├── Credentials.tsx  # API credentials
│   │   ├── ExecutionHistory.tsx # Run history
│   │   ├── AgentLibrary.tsx # Template library
│   │   ├── Settings.tsx     # App settings
│   │   ├── Login.tsx        # Auth page
│   │   └── NotFound.tsx     # 404 page
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions
│   ├── types/               # TypeScript type definitions
│   ├── contexts/            # React contexts (Auth)
│   ├── integrations/        # External service integrations
│   │   └── supabase/        # Supabase client & types
│   └── test/                # Test setup
├── supabase/                # Supabase configuration
│   ├── functions/           # Edge Functions (Deno)
│   │   ├── kimi-chat/       # Kimi AI integration
│   │   ├── gemini-chat/     # Gemini AI integration
│   │   ├── gemini-embed/    # Gemini embeddings
│   │   ├── gemini-vision/   # Gemini vision
│   │   ├── generate-image/  # Image generation
│   │   ├── execute-http/    # HTTP request executor
│   │   ├── studio-run/      # Workflow execution engine
│   │   ├── npc-ai-chat/     # NPC conversation handler
│   │   ├── object-api/      # Object interaction API
│   │   └── workflow-scheduler/ # Cron scheduler
│   └── migrations/          # Database migrations (20+)
├── reference-app/           # Original reference implementation
├── public/                  # Static assets
├── docs/                    # Documentation
└── tasks/                   # Task files
```

## Build & Development Commands

```bash
# Install dependencies
npm install

# Start development server (port 8080)
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Preview production build
npm run preview

# Run linting
npm run lint

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Package Manager

This project uses **npm** (evidenced by `package-lock.json`). Bun lockfile (`bun.lockb`) also exists but npm is the primary.

## Code Style Guidelines

### TypeScript Configuration

- **Target**: ES2020
- **Module**: ESNext with bundler resolution
- **Strict mode**: Disabled (`strict: false`)
- **Path alias**: `@/*` maps to `./src/*`
- **JSX**: `react-jsx` transform

### Styling Conventions

**Tailwind CSS** with custom design system:

```typescript
// Custom colors (green accent theme)
--accent-green: #79F181
--gradient-green-start: #3D943D
--gradient-green-end: #0C3F09
--bg-primary: #0A0A0A
--bg-secondary: #141414

// Border radius
card: '12px', node: '14px', button: '8px'

// Animation easings
out-expo: 'cubic-bezier(0.16, 1, 0.3, 1)'
spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
```

**Utility Classes:**
- Use `cn()` from `@/lib/utils` for conditional classes
- Glow effects: `glow-green`, `glow-green-strong`, `glow-green-intense`
- Glassmorphism: `glass`, `glass-light`
- Custom scrollbar: `scrollbar-thin`

### Component Patterns

```typescript
// Component file structure
import { cn } from '@/lib/utils';
import { ComponentProps } from 'react';

interface MyComponentProps extends ComponentProps<'div'> {
  variant?: 'default' | 'primary';
}

export function MyComponent({ className, variant = 'default', ...props }: MyComponentProps) {
  return (
    <div className={cn('base-classes', variant === 'primary' && 'primary-classes', className)} {...props} />
  );
}
```

### Naming Conventions

- **Components**: PascalCase (`WorkflowCard.tsx`)
- **Hooks**: camelCase starting with `use` (`useExecution.ts`)
- **Utils**: camelCase (`canvasUtils.ts`)
- **Types**: PascalCase in `types/index.ts`
- **CSS Classes**: kebab-case with semantic naming

## Testing Strategy

### Test Setup

- **Framework**: Vitest with jsdom environment
- **Testing Library**: React Testing Library with jest-dom matchers
- **Setup file**: `src/test/setup.ts`

### Test Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
```

### Writing Tests

```typescript
// Example test structure
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## Database Schema (Supabase)

### Key Tables

| Table | Purpose |
|-------|---------|
| `studio_workflows` | Workflow definitions (nodes, connections) |
| `studio_executions` | Workflow run history |
| `agent_configs` | NPC/agent configurations |
| `agent_memory` | Conversation history per NPC/player |
| `npc_instances` | Spawned NPC instances on maps |
| `object_templates` | Interactive object definitions |
| `object_instances` | Placed object instances |
| `player_state` | Real-time player positions |
| `user_integrations` | OAuth tokens for external services |
| `workflow_context` | Runtime workflow data |
| `workflow_schedules` | Cron schedules for workflows |
| `n8n_webhook_registry` | n8n webhook mappings |

### Edge Functions

| Function | Purpose |
|----------|---------|
| `kimi-chat` | Kimi AI chat completions |
| `gemini-chat` | Gemini AI chat |
| `gemini-embed` | Text embeddings |
| `gemini-vision` | Image analysis |
| `generate-image` | AI image generation |
| `execute-http` | HTTP request execution |
| `studio-run` | Workflow execution engine |
| `npc-ai-chat` | NPC conversation handling |
| `object-api` | Object interaction API |

## Environment Variables

```bash
# Required (stored in .env)
VITE_SUPABASE_PROJECT_ID="ktxdbeamrxhjtdattwts"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://ktxdbeamrxhjtdattwts.supabase.co"
```

**Note**: The current auth gate is disabled for development (see `App.tsx` line 122-125).

## Key Architectural Patterns

### Navigation System

The app uses a custom page state system (not React Router for main navigation):

```typescript
// Pages receive onNavigate callback
type Page = 'dashboard' | 'workflows' | 'editor' | ...;

// Navigate to editor with specific workflow
onNavigate('editor:workflow-uuid');

// Standard navigation
onNavigate('dashboard');
```

Special routes handled by React Router:
- `/auth/callback` - OAuth callbacks
- `*` - Main app shell

### Canvas/Node System

Workflows are defined as:

```typescript
interface NodeData {
  id: string;
  type: NodeType;  // 'trigger' | 'ai-agent' | 'code-tool' | etc.
  position: { x: number; y: number };
  title: string;
  config?: NodeConfig;
}

interface Connection {
  id: string;
  from: string;      // Source node ID
  to: string;        // Target node ID
  fromPort: string;  // Output port
  toPort: string;    // Input port
}
```

### Node Types Supported

- **Triggers**: `trigger`, `webhook`, `schedule`
- **AI**: `ai-agent`, `openai-chat`, `anthropic-chat`, `gemini-chat`, `gemini-vision`
- **Logic**: `if`, `merge`, `set`, `code-tool`
- **Integrations**: `http-tool`, `gmail`, `slack`
- **Game**: `game-show-text`, `game-give-item`, `game-teleport`, `game-set-variable`
- **Utility**: `image-gen`, `memory`

## Development Notes

### Mock Data Convention

Mock/placeholder data is styled in *italics* to indicate it's not real:

```typescript
// In components
<p className="italic text-text-secondary">Mock Data Value</p>
```

### Toast Notifications

Use Sonner for notifications:

```typescript
import { toast } from 'sonner';

toast.success('Workflow saved');
toast.error('Failed to execute');
toast.info('Coming soon');
```

### Form Handling

Use react-hook-form with Zod validation:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
});

const form = useForm({
  resolver: zodResolver(schema),
});
```

## Security Considerations

1. **Supabase RLS**: Row Level Security policies should be defined for all tables
2. **Edge Functions**: JWT verification is disabled (`verify_jwt = false`) for most functions - re-enable for production
3. **Environment Variables**: Never commit `.env` files with real credentials
4. **CORS**: Configure appropriate CORS settings in Supabase for production domain

## Deployment

The project is configured for **Lovable** deployment:

1. Push changes to GitHub
2. Lovable auto-deploys from the repository
3. Or manually deploy via Lovable dashboard: Share → Publish

Custom domains can be configured in Lovable project settings.

## Related Documentation

- `reference-app/` - Original reference implementation with additional documentation
- `FIX_PLAN.md` - Recent fix implementation log (41 issues resolved)
- `docs/` - Phase documentation (PHASE_2, PHASE_3, PHASE_4)

## Common Tasks

### Adding a New Node Type

1. Add type to `NodeType` in `src/types/index.ts`
2. Create component in `src/components/nodes/`
3. Add to node registry in canvas components
4. Update edge functions if backend logic needed

### Adding a New Page

1. Create page component in `src/pages/`
2. Add to `Page` type in `App.tsx`
3. Add to sidebar navigation in `Sidebar` component
4. Add route case in `renderPage()` function

### Database Migrations

```bash
# Create new migration
supabase migration new migration_name

# Apply migrations
supabase db push

# Generate types (after schema changes)
supabase gen types typescript --local > src/integrations/supabase/types.ts
```
