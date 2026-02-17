# History

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
- Added `vite-plugin-pwa/client` types to `tsconfig.json`.
