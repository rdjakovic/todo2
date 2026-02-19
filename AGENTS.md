# AGENTS.md — Todo2 Project Guide

This file provides essential information for AI coding agents working with the Todo2 codebase.

After each change that is accepted by me, write a summary in docs/history.md, with date, short description and summary.
After each added feature, create tests, or if tests exist, modify them to be inline with the changes.

## Project Overview

Todo2 is a cross-platform desktop and web task management application built with:

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Desktop**: Tauri 2.x (Rust backend)
- **Backend/Cloud**: Supabase (PostgreSQL, Auth, Real-time sync)
- **State Management**: Zustand
- **Offline Storage**: IndexedDB with background sync

### Key Features

- Multi-list organization with drag & drop
- Task management (add, edit, delete, complete) with priority levels and due dates
- Rich text notes using TipTap editor (JSON format, with HTML legacy support)
- Dark/Light mode with responsive design
- Offline-first architecture with IndexedDB caching
- Real-time sync when online via Supabase
- PWA support for mobile installation
- Native desktop apps (Windows, macOS, Linux)

## Project Structure

```
├── src/                          # Frontend React application
│   ├── components/               # React components
│   │   ├── __tests__/           # Component tests
│   │   ├── CreateListDialog.tsx
│   │   ├── DeleteListDialog.tsx
│   │   ├── EditTodoDialog.tsx
│   │   ├── FilterDialog.tsx
│   │   ├── ListItem.tsx
│   │   ├── LoginForm.tsx
│   │   ├── OfflineIndicator.tsx
│   │   ├── PWAInstallPrompt.tsx
│   │   ├── RichTextEditor.tsx   # TipTap-based editor
│   │   ├── TiptapRenderer.tsx   # Safe JSON-to-React renderer
│   │   ├── Sidebar.tsx
│   │   ├── TodoItem.tsx
│   │   ├── TodoListView.tsx
│   │   └── ...
│   ├── const/                    # Constants
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Core utilities
│   │   ├── content.ts           # Content parsing (HTML/JSON)
│   │   ├── indexedDB.ts         # Offline storage manager
│   │   └── supabase.ts          # Supabase client
│   ├── security/                 # Security analyzers and scripts
│   │   ├── __tests__/           # Security tests
│   │   ├── scripts/             # Analysis scripts (tsx)
│   │   └── *.ts                 # Security analyzers
│   ├── store/                    # Zustand stores
│   │   ├── authStore.ts         # Authentication state
│   │   └── todoStore.ts         # Todo/list operations
│   ├── types/                    # TypeScript types
│   │   └── todo.ts              # Todo, TodoList, FilterOptions
│   ├── utils/                    # Utility functions
│   ├── __mocks__/               # Test mocks
│   ├── App.tsx                   # Main app component
│   ├── main.tsx                  # Entry point
│   ├── setupTests.ts            # Test setup
│   └── service-worker.js        # PWA service worker
├── src-tauri/                    # Rust/Tauri backend
│   ├── src/main.rs              # Tauri commands
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri configuration
├── docs/                         # Documentation
│   └── history.md               # Change history (update after each change)
├── .github/                      # GitHub workflows
│   ├── workflows/
│   │   └── dependency-security.yml  # Security scanning
│   └── dependabot.yml           # Automated dependency updates
├── scripts/                      # Build/utility scripts
└── security-reports/            # Generated security reports
```

## Build and Development Commands

### Development

```bash
# Frontend only (Vite dev server on port 1420)
npm run dev

# Full Tauri desktop app with hot reload
npm run tauri dev
```

### Production Build

```bash
# Build frontend only
npm run build

# Build desktop bundle (MSI, NSIS, etc.)
npm run tauri build
```

### Testing

```bash
# Run all Vitest tests
npm run test

# Run tests with UI dashboard
npm run test:ui

# Run specific test file
npx vitest src/path/to/file.test.ts

# Watch mode
npx vitest --watch
```

Test configuration:
- Framework: Vitest with jsdom environment
- Config: `vitest.config.ts` (separate from `vite.config.ts`)
- Setup file: `src/setupTests.ts` (jest-dom matchers)
- Test files: `*.test.ts(x)` alongside source or in `__tests__/` subdirectories

### Linting

```bash
# ESLint with security plugin
npm run security:lint

# Auto-fix lint errors
npm run security:fix
```

### Security Scanning

```bash
# npm audit + cargo audit + generate report
npm run security:full-scan

# Individual scans
npm run security:audit          # npm audit
npm run security:rust-audit     # cargo audit

# Specialized analyzers (run via tsx)
npm run security:transmission   # Data transmission security
npm run security:csp           # CSP configuration
npm run security:update        # Update integrity
npm run security:build         # Build/deployment security
npm run security:privilege     # Privilege escalation tests

# Generate security report
npm run security:report
```

## Technology Stack Details

### Frontend Dependencies

| Package | Purpose |
|---------|---------|
| React 18 | UI framework |
| TypeScript 5.9 | Type safety |
| Tailwind CSS 3.4 | Styling |
| Zustand 5.x | State management |
| @dnd-kit/* | Drag and drop |
| @tiptap/* | Rich text editor |
| @supabase/supabase-js | Backend/client |
| @tauri-apps/api | Desktop bridge |
| framer-motion | Animations |
| date-fns | Date formatting |
| react-hot-toast | Notifications |

### Rust Dependencies

- `tauri` 2.2.3 — Core framework
- `tauri-plugin-dialog` — Native file dialogs
- `tauri-plugin-opener` — URL opening
- `serde` / `serde_json` — Serialization
- `directories` — Standard directories

## Architecture Patterns

### State Management (Zustand)

Two main stores:

1. **`authStore.ts`** — User session, auth initialization, sign out
2. **`todoStore.ts`** — All todo/list CRUD, UI state (sidebar, search, sort, drag-drop), offline sync

### Data Flow

1. **Online**: Supabase is primary data source, IndexedDB mirrors for offline cache
2. **Offline**: Operations queue in IndexedDB `sync_queue` store, auto-retry with background sync when reconnected
3. **Local files** (Tauri-only): Rust backend reads/writes `todos.json` and `lists.json` to configurable storage path

### Tauri Commands (Rust)

Exposed to frontend via `invoke()`:

- `load_todos`, `save_todos` — Todo persistence
- `load_lists`, `save_lists` — List persistence
- `set_storage_path`, `load_storage_path` — Storage configuration
- `set_theme`, `get_theme` — Theme preference
- `has_todos_in_list` — Check list contents

### Content Format Strategy

Notes use dual-format storage with no migration required:
- **New notes**: Saved as TipTap JSON
- **Legacy notes**: HTML format handled transparently via `parseContent()`
- **Rendering**: `TiptapRenderer` safely converts JSON to React elements (no `dangerouslySetInnerHTML`)

## Code Style Guidelines

### TypeScript

- Strict mode enabled
- No unused locals/parameters
- Explicit return types preferred for exported functions
- Type definitions in `src/types/`

### React

- Functional components with hooks
- Props destructuring in parameters
- `clsx` for conditional class names
- Lazy loading for heavy components (`EditTodoDialog`)

### Naming Conventions

- Components: PascalCase (e.g., `TodoItem.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useDragAndDrop.ts`)
- Utilities: camelCase (e.g., `helper.ts`)
- Types/Interfaces: PascalCase (e.g., `Todo`, `TodoList`)
- Store files: `*Store.ts`

### File Organization

- Co-locate tests with source (`*.test.ts(x)` or `__tests__/`)
- One component per file (except small subcomponents)
- Barrel exports avoided (explicit imports preferred)

## Environment Variables

Create `.env.local` (not committed) with:

```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

Access in code via `import.meta.env.VITE_*`.

## Security Considerations

### CSP Configuration

Configured in `src-tauri/tauri.conf.json`:
```json
"csp": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://your-supabase-url.supabase.co"
```

### Input Handling

- All user input validated before storage
- XSS prevention via React's JSX escaping
- Rich text sanitized via TipTap's structured JSON (no HTML injection)
- Rate limiting on authentication (see `rateLimitManager.ts`)

### Dependency Security

- Daily automated security scans via GitHub Actions
- Dependabot configured for weekly updates
- `cargo audit` and `npm audit` integrated in CI

## CI/CD

GitHub Actions workflow (`.github/workflows/dependency-security.yml`):
- Runs daily at 2 AM UTC + on pushes to main/develop
- NPM security audit
- Cargo security audit
- Generates security reports
- Creates issues for critical vulnerabilities
- Posts Slack notifications (if configured)

## Workflow for Agents

After making changes:

1. **Run tests** to ensure nothing is broken:
   ```bash
   npm run test:sync
   ```

2. **Check TypeScript** compiles:
   ```bash
   npx tsc --noEmit --skipLibCheck
   ```

3. **Run linter**:
   ```bash
   npm run security:lint
   ```

4. **Update history** — Document changes in `docs/history.md` with:
   - Date
   - Short description
   - Detailed summary of changes

5. **Update or add tests** for new features or modified functionality

## Key File References

| Purpose | File |
|---------|------|
| Entry point | `src/main.tsx` |
| Main app | `src/App.tsx` |
| Types | `src/types/todo.ts` |
| Auth store | `src/store/authStore.ts` |
| Todo store | `src/store/todoStore.ts` |
| Supabase client | `src/lib/supabase.ts` |
| IndexedDB | `src/lib/indexedDB.ts` |
| Content parsing | `src/lib/content.ts` |
| Rust backend | `src-tauri/src/main.rs` |
| Vite config | `vite.config.ts` |
| Vitest config | `vitest.config.ts` |
| ESLint config | `eslint.config.js` |
| Tailwind config | `tailwind.config.js` |
| Tauri config | `src-tauri/tauri.conf.json` |

## Troubleshooting

### Type Errors

Run type check to see detailed errors:
```bash
npx tsc --noEmit --skipLibCheck
```

### Tauri Build Issues

Clear cargo cache and rebuild:
```bash
cd src-tauri
cargo clean
cd ..
npm run tauri build
```

### Dependency Conflicts

Check Tauri version resolution:
```bash
cd src-tauri
cargo tree | grep tauri
```
