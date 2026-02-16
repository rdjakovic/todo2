# Tauri + React + Typescript

Simple todo app made in React, Typescript and Tauri for desktop. You can build it for different operating systems Mac, Linux and Windows.
This template should help get you started developing with Tauri, React and Typescript in Vite.

Main features:

- Todos
- Lists - you can create multiple lists
- Lists - you can rename/delete a list
- Todos - you can add a todo
- Todos - you can rename/delete a todo
- Todos - you can mark a todo as done
- Lists and Todos are saved locally in text files for simplicity.

Features:

- Sidebar
- Dark/Light mode
- Responsive
- Resize sidebar
- Settings - you can set the storage path

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Run in development mode

For just frontend in browser

`npm run dev`

For tauri app

`npm run tauri dev`

## Build for production - release bundle

`npm run tauri build`

##

### **Versions errors - Steps to Fix**

1. **Verify the Available Versions**
   Check the latest version of `tauri` available on crates.io by visiting its [crates.io page](https://crates.io/crates/tauri). At the time of this response, the latest version appears to be `2.2.3`. You cannot specify a version (`^2.2.5`) that does not exist.

2. **Update `Cargo.toml`**
   Modify your `Cargo.toml` file to match an existing version. For example:

   ```toml
   [dependencies]
   tauri = "2.2.3"
   ```

   The `^2.2.3` constraint is also valid and will automatically allow updates to compatible patch versions (`2.2.x`).

3. **Update the Cargo Index**
   Sometimes the local cargo registry index might be outdated. Run the following command to update it:

   ```bash
   cargo update
   ```

   This will refresh the list of available crate versions.

4. **Check for Tauri Pre-releases**
   If you intended to use a pre-release or a specific branch, make sure to specify it explicitly in your `Cargo.toml`. For example:

   ```toml
   [dependencies]
   tauri = { git = "https://github.com/tauri-apps/tauri", branch = "dev" }
   ```

   This pulls the latest code from the Tauri repository's `dev` branch.

5. **Clear the Cargo Cache (Optional)**
   If the issue persists, clear the Cargo cache and rebuild:

   ```bash
   cargo clean
   cargo build
   ```

6. **Check Dependency Conflicts**
   Ensure that no other dependencies are requiring an incompatible version of `tauri`. Run:

   ```bash
   cargo tree | grep tauri
   ```

   This will show how `tauri` is being resolved among dependencies.

---

### We can also install Dependencies and Check for Errors Without Building:

```bash
cargo check
```

Todo2 Project Summary
Todo2 is a cross-platform task management application built with modern web and native technologies.

Tech Stack
Frontend: React 18 + TypeScript + Tailwind CSS
Desktop: Tauri 2.x (Rust backend)
Backend: Supabase (PostgreSQL, Auth, Real-time sync)
Build Tool: Vite
Key Features
✅ Multi-list organization with drag & drop
✅ Task management (add, edit, delete, complete)
✅ Priority levels and due dates
✅ Dark/Light mode with responsive design
✅ Offline-first architecture with IndexedDB
✅ Real-time sync when online
✅ PWA support for mobile installation
✅ Native desktop apps (Windows, macOS, Linux)
Architecture
State Management: Zustand (AuthStore + TodoStore)
Storage: Local files + IndexedDB + Supabase sync
Security: Row-level security, authentication, comprehensive auditing
Testing: Vitest + Testing Library
Current Status
The app provides a complete task management solution with seamless online/offline functionality, combining the convenience of web technologies with native desktop performance.