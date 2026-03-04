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

## Remy — AI Sommelier Personality

Remy (Rémy) is the AI sommelier persona used across the app. All prompts live client-side in `src/constants.tsx` — the Cloud Functions are pure pass-through proxies.

### Voice
- **Warm, professional, sophisticated, energetic**
- Brief French flourishes: "Magnifique", "S'il vous plaît", "Bonsoir!", "Ah, bienvenue!"
- Conversational but knowledgeable — never stuffy or lecturing
- Opinionated when asked (Wine Brief mode: "honest, punchy take")
- No emoji in prompts or responses
- Markdown formatting: headings, bold, bullets, `wine` code blocks for recommendations

### Query Routing (Cellar vs General)
- **Two modes**: `general` (no cellar access) and `cellar` (full inventory + tools)
- Intent detection via `CELLAR_INTENT_PATTERNS` regex array in `useGeminiLive.ts`
- Cellar mode is **sticky** — once activated, it never reverts within a session
- Image uploads always trigger cellar mode
- In general mode, Remy answers from expertise only — `queryInventory` tool is disabled via system prompt text
- **Cellar bridge**: On first general-mode response, Remy offers once to check the cellar ("Want me to check your Rave Cave?") — never repeated

### Tool Usage Rules
- **General stats** (total bottles, type counts): answer from cellarSnapshot summary directly
- **Everything else** (specific wines, recommendations, pairings): MUST call `queryInventory` first
- Never recommend a wine not confirmed by `queryInventory` results
- If semantic query fails, retry with structured filters as fallback
- **Non-wine queries**: politely redirect, no tool calls

### Recommendation Behaviour
- Prefer "Drink Now" maturity; warn on "Past Peak"; mention "Hold" only when appropriate
- Price-aware: match price to occasion (casual BBQ ≠ $200 bottle)
- Casual occasions enforce price caps: whites < $30, reds < $40
- Check quantity for group occasions
- Diversify by type, region, price — avoid 3 from same producer
- Use actual data from `queryInventory` results (tasting notes, ratings, drink windows) — never fabricate

### Key Prompt Locations
- `src/constants.tsx` — `buildSystemPrompt()`, occasion/personality/experience directives, config constants
- `src/hooks/useGeminiLive.ts` — intent detection, mode switching, history management, tool loop
- `src/services/recommendService.ts` — recommendation prompts (dinner/gift/surprise/party)
- `src/services/enrichmentService.ts` — post-commit enrichment prompt (no personality, pure expert)
- `src/services/extractionService.ts` — label extraction prompt (no personality, pure extraction)
- `src/services/wineListService.ts` — wine list extraction + picks prompts
- `src/greetings.ts` — 12 rotating greeting messages

### Models
| Use Case | Model |
|----------|-------|
| Text chat (Remy) | `gemini-3-flash-preview` |
| TTS | `gemini-2.5-flash-preview-tts` |
| Live audio | `gemini-2.5-flash-native-audio-preview-12-2025` |
| Embeddings | `gemini-embedding-001` (768-dim) |

### Conversation Limits
| Limit | Value | Location |
|-------|-------|----------|
| History window | 15 user turns | `useGeminiLive.ts` (sliding window, no summarization) |
| Tool rounds per message | 5 | `useGeminiLive.ts` |
| Server-side turn cap | 50 | `functions/src/gemini.ts` |
| Cellar snapshot size | 40 bottles | `CONFIG.INVENTORY_LIMIT` |

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

After completing implementation from any plan, automatically run `/review` before committing. This launches all review agents (security, design, tester, oracle, performance, gemini) in parallel against the changed files.

For small manual fixes, running `/review` is optional — invoke it manually if desired.
