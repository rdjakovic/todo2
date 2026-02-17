# History

## 2026-02-17 — Fix Security Report Script Module Error

**Description:** Fixed "ReferenceError: require is not defined" in GitHub Actions by converting the security report generator to CommonJS.

**Summary:**

- Renamed `scripts/generate-security-report.js` to `scripts/generate-security-report.cjs` to force CommonJS interpretation in a "type: module" project.
- Updated `.github/workflows/dependency-security.yml` to call the renamed `.cjs` script.

## 2026-02-17 — Fix Rich Text Editor Dark Mode Text Color

**Description:** Fixed the issue where text in the notes rich text editor was difficult to read in dark theme due to improper text color.

**Summary:**

- Added `dark:text-white` to the `RichTextEditor` wrapper component.
- Updated `App.css` with explicit dark mode colors for `.tiptap-editor-content` and `.rendered-notes`.
- Ensured consistent text visibility in both edit and view modes of todo item notes.

## 2026-02-17 — Implement Automatic PWA Updates

**Description:** Switched to vite-plugin-pwa with auto-update logic to resolve issues with users seeing outdated versions.

**Summary:**

- Installed `vite-plugin-pwa` and configured it in `vite.config.ts`.
- Used `strategies: 'injectManifest'` to move `sw.js` to `src/service-worker.js`, preserving custom background sync logic while enabling Workbox precaching.
- Implemented `useRegisterSW` in `App.tsx` to force update checks on app mount and periodically (every hour).
- Configured Netlify Cache-Control headers in `public/_headers` to ensure `sw.js` is never cached at the edge.
- Migrated `manifest.json` into `vite.config.ts` for automated management by the plugin.
- Added environment variable support for the Service Worker (Supabase URL/Key) using Vite's `define` configuration.
- Implemented a comprehensive testing suite in `src/__tests__`:
  - `todoStore.sync.test.ts`: Integration tests for online/offline data orchestration.
  - `indexedDB.functional.test.ts`: Functional tests for local storage and sync queue management using `fake-indexeddb`.
  - `serviceWorker.sync.test.ts`: Logical verification of Service Worker sync handlers.
- Added `npm run test:sync` script to target these specific tests.
- Resolved Netlify deployment issues:
  - Fixed unused variable warnings in `App.tsx` (`updateServiceWorker` and `swUrl`).
  - Fixed TypeScript errors in tests by correctly casting Supabase mocks.
  - Updated `tsconfig.json` to exclude `src/__tests__` from production builds.
  - Cleaned up `vite.config.ts` to prevent path issues during asset compression.
- Improved offline user experience:
  - Added descriptive error messages for offline operations (e.g., "Offline: Task saved locally").
  - Implemented auto-dismiss logic for the error banner in `TodoListView.tsx` (5-second timeout).
- Added `vite-plugin-pwa/client` types to `tsconfig.json`.
