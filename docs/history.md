---
Date: 2024-05-10
Description: Implemented a new feature to allow users to set a custom storage path for their todos and lists. This involved adding a new settings option in the UI, updating the Tauri backend to handle the custom path, and ensuring that data is correctly loaded from and saved to the specified location.
---

Date: 2024-05-11
Description: Added `notes`, `priority`, `dueDate`, and `dateOfCompletion` fields to the `Todo` interface and updated the application to support these new fields. This included modifying the `addTodo`, `toggleTodo`, and `editTodo` functions in `App.tsx`, as well as updating the `EditTodoDialog.tsx` component to include input fields for these new properties.

---

Date: 2025-05-11
Description: Set up the BrowserTools MCP server. Performed an initial audit of the application, identifying areas for SEO and performance improvement. Implemented Phase 1 SEO fixes (added meta description and robots.txt), raising SEO score to 100. Implemented Phase 2 performance optimizations (configured asset compression, bundle visualization, and lazy-loaded EditTodoDialog and TodoItem components), resulting in a reduced main JavaScript bundle size.
