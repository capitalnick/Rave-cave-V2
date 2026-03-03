# Rave Cave — Project Standards

## Tech Stack

- **Framework**: React 19 + Vite 6 + TypeScript (strictNullChecks enabled)
- **Routing**: TanStack Router v1.159.5 (code-based, defined in `src/router.tsx`)
- **Styling**: Tailwind CSS v4 with RC design tokens
- **State**: Context-based (`InventoryContext`, `AuthContext`, `ProfileContext`, `SurfaceContext`)
- **Backend**: Firestore (real-time listeners), Cloud Functions (australia-southeast1)
- **AI**: Gemini via Cloud Function proxy, embeddings via `gemini-embedding-001` (768-dim)
- **Testing**: Vitest + jsdom + @testing-library/react
- **Deployment**: Vercel auto-deploys `main` to `ravecave.app`

## Architecture

```
src/
├── pages/          # Thin page containers — connect context to screen components
├── components/     # Feature-organized UI components
│   ├── rc/         # RC UI Set design system (Button, Input, Badge, Card, typography, etc.)
│   ├── ui/         # shadcn/Radix primitives (Dialog, Sheet, Popover, etc.)
│   ├── scan/       # Scan/register pipeline
│   ├── recommend/  # Recommendation flow
│   ├── remy/       # Remy chat components
│   ├── pulse/      # Dashboard widgets
│   ├── settings/   # Settings sections
│   └── import/     # CSV/Excel import wizard
├── context/        # React Context providers (all shared state)
├── services/       # Business logic, Firestore/API calls
├── hooks/          # Custom React hooks (state logic, side effects)
├── utils/          # Pure helper functions
├── lib/            # Adapters, faceted filters, formatting
├── config/         # Firebase config, analytics, function URLs
├── styles/         # CSS: theme tokens, fonts, utilities
├── data/           # Static data (grape varieties)
└── types.ts        # Single source of truth for all TypeScript types
```

## Code Standards

- **No `any` types** — use proper interfaces from `src/types.ts`
- **Use `@/` path alias** for all imports (maps to `src/`)
- **Use RC design tokens** (`--rc-accent-pink`, `--rc-accent-acid`, `--rc-accent-coral`, `--rc-accent-ink`) — never hardcode hex colors
- **Use RC UI Set components** from `@/components/rc/` — not raw HTML or Radix directly
- **Components < 250 lines** — split into sub-components if larger
- **Co-located tests**: `__tests__/*.test.ts` next to the code they test
- **Services** handle Firestore queries and API calls — components never call Firestore directly
- **Hooks** handle stateful logic — keep components declarative
- **Pages** are thin wrappers — business logic lives in context/hooks/services

## Key Conventions

- `TabId` type: `'cellar' | 'pulse' | 'recommend' | 'remy'`
- Desktop rail: 64px collapsed (<1600px), 240px expanded (>=1600px) via `useRailExpanded`
- Pinned Remy panel: appears at >=1440px for premium users
- Fonts: Satoshi (display), Space Mono (mono), Instrument Sans (body)
- WineTypeIndicator uses `'rose'` not `'rosé'` — adapter in `src/lib/adapters.ts`
- `ScanStage` includes `'reviewing'` step (post-capture quality gate)
- Firestore field names use title case (`"Producer"`, `"Wine type"`) — mapped via `FIRESTORE_FIELD_MAP` in types.ts

## Commands

- `npm run dev` — start dev server (localhost:3000)
- `npm run build` — production build
- `npm run test` — run all tests (Vitest)
- `npm run test:watch` — watch mode
- `npm run typecheck` — TypeScript check (`tsc --noEmit`)
- `npm run deploy:prod` — deploy Cloud Functions to production

## Forbidden

- **Never modify `src/hooks/useGeminiLive.ts`** — only change ever made was a type annotation on `results[]`
- **Never use `firebase deploy --only hosting`** — Vercel handles hosting, not Firebase
- **Never hardcode colors** — always use `--rc-*` CSS tokens
- **Never call Firestore directly from components** — use services
- **Never use `git add -A`** — add specific files only

## Deployment

- **Frontend**: Vercel auto-deploys on push to `main` — production at `ravecave.app`
- **Cloud Functions**: `npm run deploy:prod` — deploys to `australia-southeast1`
- **Functions**: `gemini`, `tts`, `queryInventory`, `onWineWrite`, `backfillEmbeddings`
- **Firestore Rules**: `npm run deploy:rules:prod`

## Agent Orchestration

After completing implementation from any plan, automatically run `/review` before committing. This launches all review agents (security, design, tester, oracle, performance) in parallel against the changed files.

For small manual fixes, running `/review` is optional — invoke it manually if desired.
