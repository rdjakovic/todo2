# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A cross-platform desktop todo app built with **Tauri 2.x** (Rust backend) + **React 18** + **TypeScript** + **Supabase**. Features multi-list organization, drag-and-drop, offline-first storage with background sync, and PWA support.

## Development Commands

```bash
npm run dev              # Vite dev server (frontend only, port 1420)
npm run tauri dev        # Full Tauri desktop app with hot reload
npm run tauri build      # Production desktop bundle
npm run build            # tsc + vite build (frontend only)
```

## Testing

```bash
npm run test             # Run all Vitest tests
npm run test:ui          # Vitest with browser UI dashboard
npx vitest src/path/to/file.test.ts   # Run a single test file
npx vitest --watch       # Watch mode
```

- Framework: Vitest with jsdom environment
- Config: `vitest.config.ts` (separate from `vite.config.ts`)
- Setup file: `src/setupTests.ts` (@testing-library/jest-dom)
- Test files live alongside source (`*.test.ts(x)`) or in `__tests__/` subdirectories

## Linting & Security

```bash
npm run security:lint    # ESLint with security plugin on .ts,.tsx,.js,.jsx
npm run security:fix     # ESLint auto-fix
npm run security:full-scan  # npm audit + cargo audit + security report
npm run security:rust-audit # cargo audit (run from src-tauri/)
```

ESLint uses `eslint-plugin-security` with strict rules (`security/detect-object-injection: error`, etc.) plus `no-eval`, `no-implied-eval`, `no-new-func`. Config: `eslint.config.js` (flat config format).

## Architecture

### Frontend (src/)

- **State management**: Zustand with two stores:
  - `src/store/authStore.ts` — user session, auth initialization, sign out
  - `src/store/todoStore.ts` — all todo/list CRUD, UI state (sidebar, search, sort, drag-drop), offline sync
- **Supabase client**: `src/lib/supabase.ts` — initialized from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`
- **Offline storage**: `src/lib/indexedDB.ts` — IndexedDB wrapper caching lists/todos + a sync queue for pending operations
- **Drag-and-drop**: @dnd-kit (core + sortable), custom collision detection in `src/utils/helper.ts`
- **Lazy loading**: `EditTodoDialog` is lazy-loaded in `App.tsx`

### Rust Backend (src-tauri/)

- `src-tauri/src/main.rs` — Tauri commands for local file I/O (`load_todos`, `save_todos`, `load_lists`, `save_lists`, `set_storage_path`, `set_theme`, `get_theme`, `has_todos_in_list`), window resize persistence, config management
- State stored in `config.json` next to the executable (storage path, theme, window size)
- Uses `tauri-plugin-dialog` for native file dialogs

### Data Flow

1. **Online**: Supabase is primary data source, IndexedDB mirrors for offline cache
2. **Offline**: Operations queue in IndexedDB `sync_queue` store, auto-retry with background sync when reconnected
3. **Local files** (Tauri-only): Rust backend reads/writes `todos.json` and `lists.json` to configurable storage path

### Key Types

- `Todo` and `TodoList` interfaces defined in `src/types/todo.ts`
- Sort options: `dateCreated | priority | dateCompleted | completedFirst | completedLast | dueDate | custom`

## Environment Variables

Stored in `.env.local` (not committed):
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

## Tauri Configuration

- `src-tauri/tauri.conf.json` — app identifier: `com.todo2.app`, dev URL: `http://localhost:1420`
- CSP headers configured in `app.security.csp`
- Vite dev server ignores `src-tauri/` for file watching

## Security Tooling

The `src/security/` directory contains analysis tools (data transmission, CSP, build/deployment analyzers) with dedicated npm scripts (`security:transmission`, `security:csp`, `security:build`, etc.). These run via `tsx` and can output markdown reports with `--verbose --output <file> --format markdown`.

CI/CD: `.github/workflows/dependency-security.yml` runs daily npm + cargo audits. Dependabot configured for weekly npm and cargo updates.
