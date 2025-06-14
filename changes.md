# Project Changes Log

## 2025-01-24 - Fix build error caused by visualizer plugin
- Removed `rollup-plugin-visualizer` import and plugin usage from vite.config.ts
- Fixed Rust ownership error that was preventing successful builds
- Build process should now complete without the visualizer plugin error

## 2025-01-24 - Close sidebar automatically on mobile after list selection
**Time:** Current timestamp
**Summary:** Modified the Sidebar component to automatically close the sidebar on mobile devices (screen width < 1024px) after selecting a list. This improves mobile user experience by hiding the navigation after the user makes a selection.

**Changes made:**
- Created `handleSelectList` wrapper function in Sidebar.tsx that calls `setSelectedListId` and conditionally closes sidebar on mobile
- Added `setIsSidebarOpen` to the destructured todoStore functions
- Modified list selection handlers to use the new wrapper function
- Ensured Settings button also uses the same mobile-friendly behavior
- Mobile detection uses the existing windowWidth < 1024 breakpoint