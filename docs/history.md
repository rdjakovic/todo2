---
Date: 2026-02-16
Description: Fixed task list checkbox alignment
Summary:
Fixed CSS styling for task list checkboxes to align text next to the checkbox on the right side (similar to bullet lists), instead of below the checkbox.

**Root Cause:**
The CSS selectors were incorrect. TipTap generates task list items with `data-checked` attribute on `<li>` elements, not `data-type="taskItem"`. The original CSS selectors `li[data-type="taskItem"]` were not matching the actual HTML structure, so the flexbox layout was never applied.

TipTap's actual HTML structure:
```html
<ul data-type="taskList">
  <li data-checked="true">
    <label><input type="checkbox"><span></span></label>
    <div><p>Task text</p></div>
  </li>
</ul>
```

**Changes:**
- Updated `src/App.css`:
  - Changed all selectors from `li[data-type="taskItem"]` to `ul[data-type="taskList"] > li`
  - This correctly targets the actual `<li>` elements inside task lists
  - Updated both `.tiptap-editor-content` (edit mode) and `.rendered-notes` (view mode) selectors
  - Kept the `display: inline` and `margin: 0` on paragraph elements

**Result:**
- ✅ Checkboxes now appear on the left with text aligned to the right on the same line
- ✅ Multiple task items display correctly in a vertical list
- ✅ Text wraps properly when it exceeds the available width
- ✅ Layout matches bullet list style
- ✅ Works in both edit and view modes

---

Date: 2026-02-16
Description: Added task list (checkbox) support to RichTextEditor
Summary:
Extended the TipTap rich text editor to support task lists with interactive checkboxes, allowing users to create todo-style checklists within their notes.

**Changes:**
- Installed TipTap extensions: `@tiptap/extension-task-list` and `@tiptap/extension-task-item`
- Updated `src/components/RichTextEditor.tsx`:
  - Added TaskList and TaskItem imports
  - Configured TaskItem with nested support (`nested: true`)
  - Added "☑ Tasks" button to the toolbar to toggle task lists
- Updated `src/App.css`:
  - Added CSS styling for task list items (`ul[data-type="taskList"]`)
  - Styled checkboxes with flexbox layout and accent color
  - Added styles for both editor mode (`.tiptap-editor-content`) and view mode (`.rendered-notes`)
  - Checkboxes are interactive and can be checked/unchecked

**Features:**
- Users can click the "☑ Tasks" button to convert text to a task list
- Each task item has a clickable checkbox
- Task lists support nesting
- Checkboxes maintain their checked state when saved
- Proper styling in both light and dark modes

**Dependencies Added:**
- @tiptap/extension-task-list
- @tiptap/extension-task-item

---

Date: 2026-02-16
Description: Fixed RichTextEditor not displaying content in edit mode
Summary:
The RichTextEditor component was not showing existing notes content when opening the EditTodoDialog in edit mode. The issue was caused by a timing problem where the RichTextEditor component mounted before the parent component's useEffect could update the editNotes state.

**Root Cause:**
When EditTodoDialog opened, the local state `editNotes` was initialized as an empty string. The RichTextEditor would mount and create the TipTap editor instance with this empty content before the useEffect (which sets editNotes from todoToEdit.notes) had a chance to run.

**Solution:**
Changed EditTodoDialog.tsx to pass `todoToEdit?.notes` directly to the RichTextEditor component instead of using the intermediate `editNotes` state for the content prop. The `setEditNotes` callback is still used to capture user changes, but the initial content now comes directly from the source, bypassing the timing issue.

**Changes:**
- Modified `src/components/EditTodoDialog.tsx` line 174: Changed `content={editNotes}` to `content={todoToEdit?.notes || ""}`
- Updated the component key to `key={`editor-${todoToEdit?.id}`}` to ensure the editor remounts when editing different todos
- Removed unnecessary `isOpen` from the key since direct prop passing resolves the timing issue

This ensures the editor always receives the correct content immediately upon mounting, regardless of React's rendering lifecycle timing.

---
Date: 2026-02-16
Description: Added TipTap rich text editor for todo notes
Summary:
Integrated TipTap (@tiptap/react, @tiptap/starter-kit) as a rich text editor for the notes field in EditTodoDialog, replacing the plain textarea. This allows users to format their notes with headings, bold, italic, code blocks, lists, and more.

**Changes:**
- Created new `src/components/RichTextEditor.tsx` component using TipTap with StarterKit extensions
- Configured editor with: Bold, Italic, Headings (H1-H3), Paragraph, Inline Code, Code Blocks, Bullet Lists, and Horizontal Rules
- Implemented custom toolbar with MenuButton components showing active states
- Added dark mode support with Tailwind CSS styling
- Integrated smart content synchronization using refs to prevent infinite loops between parent state and editor state
- Added `editable` prop support for view/edit mode toggling
- Replaced textarea in `src/components/EditTodoDialog.tsx` with RichTextEditor component
- Notes are stored as HTML strings in the database
- Added `isEmptyHtml` helper function to detect empty HTML content for proper placeholder display

**Dependencies Added:**
- @tiptap/react
- @tiptap/starter-kit

---
Date: 2024-05-10
Description: Implemented a new feature to allow users to set a custom storage path for their todos and lists. This involved adding a new settings option in the UI, updating the Tauri backend to handle the custom path, and ensuring that data is correctly loaded from and saved to the specified location.
---

Date: 2024-05-11
Description: Added `notes`, `priority`, `dueDate`, and `dateOfCompletion` fields to the `Todo` interface and updated the application to support these new fields. This included modifying the `addTodo`, `toggleTodo`, and `editTodo` functions in `App.tsx`, as well as updating the `EditTodoDialog.tsx` component to include input fields for these new properties.

---

Date: 2025-05-11
Description: Set up the BrowserTools MCP server. Performed an initial audit of the application, identifying areas for SEO and performance improvement. Implemented Phase 1 SEO fixes (added meta description and robots.txt), raising SEO score to 100. Implemented Phase 2 performance optimizations (configured asset compression, bundle visualization, and lazy-loaded EditTodoDialog and TodoItem components), resulting in a reduced main JavaScript bundle size.

---

Date: 2025-05-11
Description: Refactored date fields (`dateCreated`, `dueDate`, `dateOfCompletion`) in the `Todo` interface from `string` to `Date` type for improved type safety and date manipulation.
Summary:
Changed the type of `dateCreated`, `dueDate`, and `dateOfCompletion` from `string` to `Date` in `src/types/todo.ts`.
Updated `src/App.tsx` to handle serialization (to ISO string for storage) and deserialization (from string to `Date` object on load) for these date fields. Ensured new todos and date updates use `Date` objects.
Modified `src/components/TodoItem.tsx` to correctly format `Date` objects for display using `date-fns`.
Adjusted `src/components/EditTodoDialog.tsx` to handle `Date` objects for `dueDate`, including formatting `Date` to string for the input field and parsing the input string back to a `Date` object on save.
Updated `src/components/TodoItem.test.tsx` to use `Date` objects in mock data.
All related TypeScript errors were resolved.

---

Date: 2025-05-11
Description: Added display of `dateOfCompletion` in the TodoItem component and made it responsive.
Summary:
Modified `src/components/TodoItem.tsx` to display the `dateOfCompletion` next to the `dateCreated`. The `dateOfCompletion` is only shown if the todo is marked as completed and the `dateOfCompletion` is set. The dates are displayed using flexbox with `justify-between` to position them on opposite sides on larger screens (sm and up), and stack vertically (`flex-col`) on smaller screens.

---

Date: 2025-05-11
Description: Fixed "Invalid time value" error in Edge browser using native JavaScript date handling.
Summary:
Removed `date-fns` dependency from `src/components/TodoItem.tsx`.
Implemented helper functions `isValidNativeDate` (using `d instanceof Date && !isNaN(d.getTime())`) and `formatNativeDate` (to format dates as "MMM d, yyyy - HH:mm") within `src/components/TodoItem.tsx`.
Updated the date display logic for `todo.dateCreated` and `todo.dateOfCompletion` to use these native helper functions. This resolves the `RangeError: Invalid time value` in Edge without external libraries.

---

Date: 2025-05-11
Description: Refactored helper functions into a separate file.
Summary: Created `src/utils/helper.ts` and moved `isValidNativeDate` and `formatNativeDate` functions from `src/components/TodoItem.tsx` to this new file. Updated `src/components/TodoItem.tsx` to import these functions from `src/utils/helper.ts`.

---

Date: 2025-05-11
Description: Refactored App.tsx to improve modularity and readability.
Summary:
Extracted UI sections from `App.tsx` into new, more focused components:

- `src/components/LoadingIndicator.tsx`: Displays a loading spinner.
- `src/components/SettingsView.tsx`: Renders the settings page content.
- `src/components/TodoForm.tsx`: Handles the form for adding new todos.
- `src/components/TodoListItems.tsx`: Renders the sortable list of todo items.
- `src/components/TodoListView.tsx`: Manages the main todo list view, incorporating `TodoForm` and `TodoListItems`.
  Moved several utility/helper functions from `App.tsx` to `src/utils/helper.ts`:
- `processLoadedLists`: Converts raw list data from storage into the `TodoList[]` format.
- `serializeListsForSave`: Prepares `TodoList[]` for saving by converting `Date` objects to ISO strings.
- `getFilteredTodos`: Computes the `filteredTodos` array based on the current `selectedList` and `hideCompleted` status.
- `calculateTodoCountByList`: Computes the `todoCountByList` object.
  Updated `App.tsx` to import and use these new components and helper functions, significantly reducing its size and complexity.

---

Date: 2025-05-11
Description: Fixed Framer Motion warning in TodoListItems component.
Summary:
Modified `src/components/TodoListItems.tsx` to correctly use `React.forwardRef`. This resolves the console warning "Warning: Function components cannot be given refs. Attempts to access this ref will fail. Did you mean to use React.forwardRef()?" that occurred when using `AnimatePresence` with `mode="popLayout"`. The component now properly forwards refs to the underlying `motion.div` element.

---

Date: 2025-05-11
Description: Fixed drag and drop error related to lazy loading.
Task Completed:
Changed the import of `TodoItem` in `src/App.tsx` from a lazy-loaded component (`React.lazy`) to a direct import. This resolves the "A component suspended while responding to synchronous input" error that occurred during drag-and-drop operations when `DragOverlay` attempted to render the lazy-loaded `TodoItem`.

---

Date: 2025-05-11
Description: Removed unused `isEditing` property from the Todo interface.
Task Completed:
Analyzed the codebase to determine where the `isEditing?: boolean;` property, defined in the `Todo` interface in `src/types/todo.ts`, is used. The analysis found no usages of this property. Consequently, the `isEditing` property was removed from the `Todo` interface in `src/types/todo.ts`.

---

Date: 2025-05-11
Description: Removed unused `editText` property from the Todo interface.
Task Completed:
Analyzed the codebase to determine where the `editText?: string;` property, defined in the `Todo` interface in `src/types/todo.ts`, is used. The analysis found no usages of this property. Consequently, the `editText` property was removed from the `Todo` interface in `src/types/todo.ts`.

---

Date: 2025-05-11
Description: Renamed 'text' field to 'title' in Todo interface and updated all references.
Task Completed:
Renamed the `text` field to `title` in the `Todo` interface in `src/types/todo.ts`.
Updated all references to this field in the following files:

- `src/App.tsx`: Changed `text` to `title` in `addTodo`, `editTodo`, and `handleSaveEditDialog`.
- `src/components/TodoItem.tsx`: Changed `todo.text` to `todo.title` for displaying the todo.
- `src/components/EditTodoDialog.tsx`: Changed `newText` to `newTitle` in `onSave` prop and updated `todoToEdit.text` to `todoToEdit.title` in `useEffect`.
- `src/components/TodoItem.test.tsx`: Changed `text` to `title` in `mockTodo`.
  All TypeScript errors related to this change were resolved.

---

Date: 2025-05-12
Description: Extracted ListItem component from Sidebar.
Task Completed:
Extracted the `ListItem` component and the `getIconForList` helper function from `src/components/Sidebar.tsx` into a new file `src/components/ListItem.tsx`. Updated `src/components/Sidebar.tsx` to remove the extracted code and import the `ListItem` component from the new file. This improves modularity by separating the list item rendering logic from the main sidebar component.

---

Date: 2025-05-31
Summary of State Management Refactoring
I have successfully analyzed and refactored the application to use the global useTodoStore instead of local state and props throughout the application. Here's what was accomplished:

🔧 Store Enhancements
Extended todoStore.ts with new state and actions:

Form state: newTodo, setNewTodo
Edit dialog state: isEditDialogOpen, todoToEditDialog, setIsEditDialogOpen, setTodoToEditDialog
UI state: isSidebarOpen, sidebarWidth, windowWidth with corresponding setters
Drag & drop state: activeDraggedTodo, setActiveDraggedTodo
Helper functions: getCurrentList(), getFilteredTodos(), getTodoCountByList(), openEditDialog(), closeEditDialog(), addTodoFromForm()
List management: createList(), deleteList(), editList(), toggleSidebar()
📱 Component Refactoring

1. App.tsx

✅ Removed local state: newTodo, isEditDialogOpen, todoToEditDialog, isSidebarOpen, sidebarWidth, windowWidth, activeDraggedTodo
✅ Eliminated prop drilling by using store directly
✅ Simplified component by removing unnecessary functions (addTodo, handleOpenEditDialog, handleCloseEditDialog)
✅ Updated to use store's closeEditDialog() instead of local function 2. TodoListView.tsx

✅ Removed all props - now uses store directly
✅ Uses getFilteredTodos() from store instead of receiving filteredTodos prop
✅ Uses openEditDialog() from store instead of prop function
✅ Simplified component interface completely 3. TodoForm.tsx

✅ Removed all props (newTodo, setNewTodo, addTodo)
✅ Now uses newTodo, setNewTodo, and addTodoFromForm directly from store
✅ Completely self-contained component 4. Sidebar.tsx

✅ Completely refactored to use store instead of 12+ props
✅ Now uses store functions: createList(), deleteList(), editList(), toggleSidebar()
✅ Gets todoCountByList from store's getTodoCountByList()
✅ Removed local windowWidth state in favor of store's windowWidth
✅ Self-contained component with no external dependencies 5. EditTodoDialog.tsx

✅ Fixed type mismatch: changed id parameter from number to string
✅ Updated onSave to return Promise<void> for consistency
🎯 Benefits Achieved
Eliminated Prop Drilling: No more passing state and functions through multiple component layers
Centralized State: All application state is now managed in one place
Simplified Components: Components are more focused and self-contained
Better Type Safety: Consistent typing throughout the application
Improved Maintainability: Changes to state logic only need to be made in the store
Enhanced Developer Experience: Easier to debug and understand state flow
🧹 Code Cleanup
✅ Removed unused imports (TodoList type, unused store functions)
✅ Cleaned up unused variables and parameters
✅ Fixed type inconsistencies
✅ Maintained all existing functionality while simplifying the codebase
🚀 Application Status
The application is now running successfully at http://localhost:1420/ with:

✅ All original functionality preserved
✅ Improved state management architecture
✅ No breaking changes to user experience
✅ Better code organization and maintainability
The refactoring is complete and the application now follows modern React patterns with centralized state management using Zustand, eliminating the need for prop drilling and making the codebase much more maintainable and scalable.

---

Date: 2025-05-31
Description: Fixed Supabase RLS (Row Level Security) policy violation error when editing and saving lists.

**Problem:**
Users encountered a "new row violates row-level security policy for table 'lists'" error when trying to edit and save lists. The error occurred because the `saveLists` function was not properly setting the `user_id` field required by Supabase's RLS policies.

**Root Cause:**
The `saveLists` function was attempting to get the user ID from existing lists in the store (`get().lists.find((l) => l.id === list.id)?.userId`), which had several issues:

- For new lists, there was no existing list to get the userId from
- The userId field might be undefined or not properly set
- It was trying to get user info from local state instead of the authenticated user

**Solution:**

1. **Added auth store import** to todoStore.ts to access the current authenticated user
2. **Fixed saveLists function** to get the current user ID from the auth store instead of local state:
   ```typescript
   const currentUser = useAuthStore.getState().user;
   if (!currentUser) {
     throw new Error("User not authenticated");
   }
   // Now properly sets user_id: currentUser.id
   ```
3. **Fixed createList function** to properly set the user ID for new lists using the authenticated user
4. **Fixed fetchLists function** to properly map `user_id` from database to `userId` in the processed lists

**Benefits:**

- ✅ RLS Compliance: All list operations now properly include the authenticated user's ID
- ✅ Consistent User Association: All lists are properly associated with the current authenticated user
- ✅ Error Prevention: Added proper authentication checks to prevent operations when no user is authenticated
- ✅ Resolved the 403 Forbidden error when editing lists

**Files Modified:**

- `src/store/todoStore.ts`: Updated saveLists, createList, and fetchLists functions to properly handle user authentication

---

Date: 2025-01-03
Description: Refactored todo application to separate list metadata from todos themselves, implementing a normalized data architecture.

**Problem:**
The application was using a denormalized data structure where each `TodoList` contained a `todos: Todo[]` array. This approach had several issues:

- Performance problems with large datasets
- Data duplication and inefficient memory usage
- Difficult maintenance and scalability concerns
- Complex state management when updating todos across lists

**Solution:**
Implemented a complete refactoring to separate lists and todos into independent collections with a normalized data architecture.

**Key Changes:**

1. **Modified Types (src/types/todo.ts)**

   - ✅ Removed `todos: Todo[]` field from `TodoList` interface
   - ✅ Maintained `Todo` interface with `listId` for relationship preservation

2. **Updated TodoStore State Structure (src/store/todoStore.ts)**

   - ✅ Added `todos: Todo[]` as separate state property
   - ✅ Added `setTodos` action for managing todos array
   - ✅ Added new functions: `fetchTodos`, `saveTodos`, `loadFromLocalStorage`

3. **Refactored Core Store Functions**

   - ✅ `fetchLists`: Now fetches only list metadata, calls `fetchTodos` separately
   - ✅ `fetchTodos`: New function to fetch todos separately from Supabase
   - ✅ `saveLists`: Now saves only list metadata (no todos)
   - ✅ `saveTodos`: New function to save todos separately to Supabase
   - ✅ `loadFromLocalStorage`: New function with migration support for old format

4. **Updated localStorage Handling**

   - ✅ Two separate keys: `"todo-lists"` for list metadata and `"todos"` for todo items
   - ✅ Migration logic: Automatically detects and converts old format to new format
   - ✅ Dual storage strategy: Maintains both Supabase and localStorage for fallback

5. **Updated All CRUD Operations**

   - ✅ `addTodo`: Works with separate `todos` array instead of `list.todos`
   - ✅ `toggleTodo`: Updated to find todos in the separate array
   - ✅ `deleteTodo`: Updated to filter from the separate todos array
   - ✅ `editTodo`: Updated to update todos in the separate array
   - ✅ `deleteList`: Now also deletes associated todos when a list is deleted

6. **Updated Helper Functions**

   - ✅ `getFilteredTodos`: Now filters todos by `listId` from the separate array
   - ✅ `getTodoCountByList`: Now counts todos from separate array grouped by `listId`

7. **Updated App.tsx**

   - ✅ Drag and Drop: Updated to work with the separate todos array
   - ✅ Import changes: Added `todos` and `saveTodos` from the store
   - ✅ Logic updates: All drag and drop operations now work with separate data structure

8. **Migration Strategy**
   - ✅ Backward compatibility: Detects old format data and automatically migrates
   - ✅ Seamless transition: Users with existing data have their data converted automatically
   - ✅ No data loss: Migration preserves all existing todos and lists

**Benefits Achieved:**

- 🚀 **Performance**: Normalized data structure reduces memory usage and improves rendering performance
- 🔧 **Maintainability**: Cleaner separation of concerns makes the code easier to maintain
- 📈 **Scalability**: Better handling of large datasets with separate collections
- 🔄 **Migration**: Seamless upgrade path for existing users
- 💾 **Storage**: More efficient localStorage usage with separate keys
- 🛡️ **Data Integrity**: Better relationship management between lists and todos

**Files Modified:**

- `src/types/todo.ts`: Removed todos array from TodoList interface
- `src/store/todoStore.ts`: Complete refactoring with separate collections and new functions
- `src/App.tsx`: Updated drag and drop logic to work with separate data structure

**Technical Implementation:**

- Maintained `listId` field in todos for relationship preservation
- Implemented automatic data migration from old to new format
- Added comprehensive error handling and fallback mechanisms
- Preserved all existing functionality while improving underlying architecture

The refactoring is complete and the application now uses a normalized data architecture with separate collections for lists and todos, significantly improving performance and maintainability while preserving all existing functionality.

---

Date: 2025-06-16
Description: Fixed window size saving functionality in Tauri v2 application to persist window dimensions across app restarts.

**Problem:**
The window size saving functionality was implemented but not working correctly. The config.json file was missing the `window_size` field, and window dimensions were not being saved when the user resized the window.

**Root Cause Analysis:**
1. **Backend Implementation**: The Rust backend had the `save_window_size` command and window resize event detection, but was emitting events to the frontend instead of saving directly
2. **Frontend Missing**: No frontend event listener was properly set up to receive the `save_window_size` events and call the Tauri command
3. **Event System Complexity**: The original approach relied on a complex event system between Rust and JavaScript that wasn't working reliably

**Solution:**
Implemented a **backend-only solution** that handles window size saving entirely in Rust without requiring any frontend changes.

**Key Changes:**

1. **Default Window Size (src-tauri/src/main.rs)**
   ```rust
   // Set window size from config if available, otherwise use default
   let window_size = config.window_size.unwrap_or(WindowSize {
       width: 1200.0,
       height: 800.0,
   });
   ```

2. **Direct Window Size Saving (src-tauri/src/main.rs)**
   ```rust
   // Listen for resize events and save directly
   window.on_window_event(move |event| {
       if let tauri::WindowEvent::Resized(_) = event {
           let size = window_clone.inner_size().unwrap();

           // Save window size directly
           let window_size = WindowSize {
               width: size.width as f64,
               height: size.height as f64,
           };

           // Load current config, update window size, and save
           match load_or_create_config() {
               Ok(mut config) => {
                   config.window_size = Some(window_size);
                   match save_config(&config) {
                       Ok(_) => println!("Window size saved successfully: {}x{}", size.width, size.height),
                       Err(e) => println!("Failed to save window size: {}", e),
                   }
               }
               Err(e) => println!("Failed to load config: {}", e),
           }
       }
   });
   ```

3. **Cleanup**
   - ✅ Removed unused `save_window_size` Tauri command
   - ✅ Removed frontend event listener code from App.tsx
   - ✅ Removed unused imports (`Emitter`, `isTauri`)

**Implementation Details:**

- **Window Size Structure**: Uses existing `WindowSize` struct with `width` and `height` as `f64`
- **Config Integration**: Seamlessly integrates with existing `AppConfig` structure
- **Default Behavior**: Sets default window size of 1200x800 when no saved size exists
- **Automatic Saving**: Every window resize event triggers an immediate save to config.json
- **Automatic Restoration**: Window size is restored from config.json on application startup

**Benefits:**

- 🚀 **Reliability**: Backend-only solution eliminates frontend event listener complexity
- 🔧 **Simplicity**: No frontend changes required, purely Tauri backend implementation
- 💾 **Persistence**: Window size persists across application restarts
- 🛡️ **Fallback**: Uses sensible defaults (1200x800) when no saved size exists
- ⚡ **Performance**: Direct saving without event system overhead

**Testing Results:**

- ✅ Window size is saved to config.json on every resize
- ✅ Window size is restored correctly on application restart
- ✅ Default size (1200x800) is applied when no saved size exists
- ✅ Config.json now contains: `{"storage_path":"","theme":"dark","window_size":{"width":1433.0,"height":865.0}}`

**Files Modified:**

- `src-tauri/src/main.rs`: Implemented direct window size saving in resize event handler, added default window size, removed unused command
- `src/App.tsx`: Removed frontend event listener code and unused imports

**Technical Implementation:**

The solution leverages Tauri's native window event system (`window.on_window_event`) to detect resize events and directly saves the window size to the config file using the existing `load_or_create_config()` and `save_config()` functions. This approach is more reliable than the previous event-based system and requires no frontend coordination.

---

Date: 2025-06-16
Description: Extracted drag and drop functionality into a custom hook to improve App.tsx modularity and readability.

**Problem:**
The App.tsx file contained complex drag and drop logic (handleDragStart and handleDragEnd functions) that made the component large and harder to maintain. The drag and drop handlers were tightly coupled with the main component logic.

**Solution:**
Created a custom React hook `useDragAndDrop` following React best practices to encapsulate all drag and drop functionality.

**Key Changes:**

1. **Created Custom Hook (src/hooks/useDragAndDrop.ts)**
   - ✅ Extracted `handleDragStart` and `handleDragEnd` functions from App.tsx
   - ✅ Encapsulated all drag and drop logic including:
     - Todo reordering within the same list using `arrayMove`
     - Moving todos between different lists
     - Special handling for "All" and "Completed" lists
     - Completion status updates when moving to/from "Completed" list
   - ✅ Uses `useTodoStore` to access necessary state and actions
   - ✅ Returns handlers object for use with DndContext

2. **Simplified App.tsx**
   - ✅ Removed inline drag handlers (82+ lines of code)
   - ✅ Added `useDragAndDrop` hook import and usage
   - ✅ Removed unused imports: `DragStartEvent`, `DragEndEvent`, `arrayMove`
   - ✅ Cleaned up store destructuring to only include needed properties
   - ✅ Maintained all existing functionality while reducing component complexity

3. **Followed React Best Practices**
   - ✅ Named hook with "use" prefix following React conventions
   - ✅ Encapsulated related logic in a single, focused hook
   - ✅ Made the hook reusable and testable
   - ✅ Improved separation of concerns

**Benefits:**

- 🚀 **Modularity**: Drag and drop logic is now isolated and reusable
- 🔧 **Maintainability**: App.tsx is significantly smaller and more focused
- 📖 **Readability**: Complex drag logic is abstracted away from the main component
- 🧪 **Testability**: Drag and drop logic can be tested independently
- 🎯 **Single Responsibility**: App.tsx focuses on layout and routing, hook handles drag operations
- ♻️ **Reusability**: Hook can be easily reused in other components if needed

**Files Modified:**

- `src/hooks/useDragAndDrop.ts`: New custom hook containing all drag and drop logic
- `src/App.tsx`: Simplified by removing inline handlers and using the custom hook

**Technical Implementation:**

The custom hook follows React's custom hook patterns by:
- Using the "use" prefix for proper naming convention
- Calling other hooks (useTodoStore) at the top level
- Returning an object with handler functions for external use
- Encapsulating all related state and logic in one place

This refactoring maintains 100% of the existing drag and drop functionality while significantly improving code organization and maintainability.

---

Date: 2025-06-21
Description: Improved drag and drop collision detection for desktop screens with focused enhancements.

**Problem:**
After attempting comprehensive mobile improvements that broke drag and drop functionality, reverted changes and focused specifically on desktop screen improvements. The original issue was that drag hover detection varied between screen sizes, with some inconsistency in when drop zones would activate.

**Solution:**
Implemented targeted desktop-focused improvements with minimal changes to maintain stability while enhancing the user experience.

**Key Changes:**

1. **Enhanced Collision Detection (src/App.tsx)**
   - ✅ Changed from `closestCenter` to `closestCorners` collision detection
   - ✅ Provides more reliable drop zone detection without breaking existing functionality
   - ✅ Better corner-based detection for rectangular drop zones

2. **Improved Visual Feedback (src/components/ListItem.tsx)**
   - ✅ Enhanced hover state with scale animation (`scale-105`) and shadow (`shadow-md`)
   - ✅ Changed transition from `transition-colors` to `transition-all duration-200` for smoother animations
   - ✅ Maintained all existing styling while adding subtle visual enhancements

**Benefits:**

- 🖥️ **Desktop-Optimized**: Focused improvements specifically for desktop drag and drop experience
- 🎯 **Better Detection**: `closestCorners` provides more reliable collision detection than `closestCenter`
- 🎨 **Enhanced Feedback**: Subtle scale and shadow effects provide clear visual feedback during drag operations
- ⚡ **Stable**: Minimal changes ensure existing functionality remains intact
- 🔄 **Smooth Animations**: Improved transitions for better user experience

**Technical Implementation:**

- **Collision Detection**: `closestCorners` algorithm provides better detection for rectangular drop zones compared to center-based detection
- **Visual Enhancements**: Added scale and shadow effects only during drag hover state
- **Smooth Transitions**: Enhanced CSS transitions for all properties with 200ms duration

**Files Modified:**

- `src/App.tsx`: Updated collision detection import and usage
- `src/components/ListItem.tsx`: Enhanced visual feedback and transitions

**Testing Results:**

- ✅ Drag and drop functionality maintained and working properly
- ✅ Better visual feedback during drag operations
- ✅ Improved collision detection for desktop screens
- ✅ Smooth animations and transitions
- ✅ No breaking changes to existing functionality

This focused approach maintains stability while providing meaningful improvements to the desktop drag and drop experience.

---

Date: 2025-06-21
Description: Enhanced drag and drop detection for different screen sizes with adaptive collision detection strategy.

**Problem:**
After the initial desktop improvements, drag and drop detection was still inconsistent across different screen sizes. On 2K screens, detection worked well and activated early, but on Full HD and smaller screens, the drop zones required precise positioning (almost covering the list item) before detecting hover.

**Root Cause:**
The sidebar width varies significantly between screen sizes, making the effective drop zone area much smaller on smaller screens. The `closestCorners` collision detection was still too restrictive for narrower sidebars.

**Solution:**
Implemented an adaptive collision detection strategy that uses different algorithms based on screen width, combined with extended drop zones for better targeting.

**Key Changes:**

1. **Adaptive Collision Detection (src/App.tsx)**
   ```typescript
   // Custom collision detection that's more forgiving on smaller screens
   const customCollisionDetection: CollisionDetection = (args) => {
     // On smaller screens (narrower sidebar), use more forgiving rectangle intersection
     if (windowWidth < 1600) {
       const rectCollisions = rectIntersection(args);
       if (rectCollisions.length > 0) {
         return rectCollisions;
       }
     }

     // Fall back to corner-based detection for larger screens or when rect intersection fails
     return closestCorners(args);
   };
   ```

2. **Extended Drop Zones (src/components/ListItem.tsx)**
   - ✅ Wrapped button in a container div with the droppable reference
   - ✅ Added padding (`p-1 -m-1`) to extend the effective drop zone area
   - ✅ Moved hover styling to the container for better visual feedback
   - ✅ Maintained button functionality while expanding the drop target

**Benefits:**

- 📏 **Screen-Adaptive**: Uses `rectIntersection` for screens < 1600px width, `closestCorners` for larger screens
- 🎯 **Better Targeting**: Extended drop zones make it easier to target list items on smaller screens
- 🖥️ **Optimized Detection**: Different collision algorithms optimized for different screen sizes
- 🎨 **Consistent Feedback**: Visual hover effects work consistently across all screen sizes
- ⚡ **Performance**: Efficient fallback strategy ensures reliable detection

**Technical Implementation:**

- **Screen Width Threshold**: Uses 1600px as the breakpoint between collision detection strategies
- **Rectangle Intersection**: More forgiving algorithm for smaller screens with narrower sidebars
- **Extended Drop Zones**: Container-based drop zones with padding to increase effective area
- **Fallback Strategy**: Ensures detection works even if primary algorithm fails

**Files Modified:**

- `src/App.tsx`: Added adaptive collision detection based on screen width
- `src/components/ListItem.tsx`: Extended drop zones with container wrapper and padding

**Testing Results:**

- ✅ Improved detection on Full HD and smaller screens
- ✅ Maintains precise detection on larger screens (2K+)
- ✅ Extended drop zones make targeting easier
- ✅ Consistent visual feedback across all screen sizes
- ✅ No breaking changes to existing functionality

This adaptive approach provides optimal drag and drop experience across all desktop screen sizes while maintaining the enhanced visual feedback.

---

Date: 2025-06-21
Description: Implemented conditional drag & drop reordering with "Custom Sort" setting and comprehensive logging.

**Problem:**
Drag and drop for moving todos between lists was working perfectly, but drag and drop reordering within the same list should only be enabled when the user specifically chooses "Custom Sort" from the settings. This prevents accidental reordering when users prefer other sorting methods.

**Solution:**
Added a new "Custom Sort (Drag & Drop)" option to the Settings and implemented conditional logic to only allow within-list reordering when this option is selected.

**Key Changes:**

1. **Extended SortOption Type (src/store/todoStore.ts)**
   ```typescript
   export type SortOption =
     | "dateCreated"
     | "priority"
     | "dateCompleted"
     | "completedFirst"
     | "completedLast"
     | "dueDate"
     | "custom";  // New option
   ```

2. **Updated Sort Logic**
   - ✅ Added "custom" case to `sortTodos` function that returns todos in their current order
   - ✅ Preserves drag & drop reordering when custom sort is selected
   - ✅ Maintains all existing sort functionality for other options

3. **Enhanced Settings UI (src/components/SettingsView.tsx)**
   - ✅ Added "Custom Sort (Drag & Drop)" option to the sorting section
   - ✅ Clear description: "Enable drag & drop reordering within lists"
   - ✅ Integrated seamlessly with existing radio button interface

4. **Conditional Drag & Drop Logic (src/hooks/useDragAndDrop.ts)**
   ```typescript
   // Only allow reordering if custom sort is enabled
   if (sortBy !== 'custom') {
     console.log('❌ Reordering blocked - Custom sort not enabled. Current sort:', sortBy);
     return;
   }
   ```

5. **Comprehensive Console Logging**
   - ✅ **📋 List-to-List Moves**: Logs when moving todos between different lists
   - ✅ **🔄 Reordering Attempts**: Logs when attempting to reorder within same list
   - ✅ **❌ Blocked Operations**: Logs when reordering is blocked due to sort setting
   - ✅ **✅ Success Messages**: Logs successful operations for both types of moves
   - ✅ **📍 Index Information**: Logs reordering indices for debugging

**Behavior:**

- **List-to-List Drag & Drop**: Always works regardless of sort setting
- **Within-List Reordering**: Only works when "Custom Sort (Drag & Drop)" is selected
- **Other Sort Options**: Prevent reordering to maintain their sorting logic
- **Visual Feedback**: Drag and drop visual effects work consistently for both scenarios

**Benefits:**

- 🎛️ **User Control**: Users can choose when drag & drop reordering is enabled
- 🔒 **Sort Integrity**: Prevents accidental reordering when using other sort methods
- 📊 **Comprehensive Logging**: Easy debugging and monitoring of drag & drop operations
- 🔄 **Flexible**: Maintains all existing functionality while adding new capability
- 🎯 **Intuitive**: Clear setting name and description for user understanding

**Files Modified:**

- `src/store/todoStore.ts`: Added "custom" sort option and logic
- `src/components/SettingsView.tsx`: Added custom sort option to UI
- `src/hooks/useDragAndDrop.ts`: Added conditional logic and comprehensive logging

**Testing Results:**

- ✅ Custom sort enables within-list reordering
- ✅ Other sort options block within-list reordering
- ✅ List-to-list moves work regardless of sort setting
- ✅ Console logs provide clear feedback for all operations
- ✅ Settings UI integrates seamlessly with existing options

This implementation provides users with full control over when drag & drop reordering is enabled while maintaining the robust list-to-list functionality.

---

Date: 2025-06-21
Description: Added visual drop indicators for drag and drop reordering with animated horizontal lines.

**Problem:**
While the drag and drop functionality was working correctly, users needed visual feedback to see exactly where their dragged todo item would be dropped when reordering within a list. Without clear visual indicators, it was difficult to achieve precise positioning.

**Solution:**
Implemented animated horizontal drop indicators that appear between todo items during drag operations, providing clear visual feedback for drop positioning.

**Key Changes:**

1. **DropZone Component (src/components/TodoListItems.tsx)**
   ```typescript
   const DropZone = ({ dropId }: { dropId: string }) => {
     const { setNodeRef, isOver } = useDroppable({
       id: dropId,
     });

     return (
       <div
         ref={setNodeRef}
         className={clsx(
           "transition-all duration-200",
           isOver ? "h-2 my-2" : "h-0 my-0"
         )}
       >
         {isOver && (
           <div className="relative h-2">
             <div className="absolute inset-0 bg-purple-500 rounded-full shadow-lg animate-pulse" />
             <div className="absolute -left-2 -right-2 h-2 bg-purple-400 rounded-full opacity-50" />
           </div>
         )}
       </div>
     );
   };
   ```

2. **Enhanced TodoListItems Structure**
   - ✅ Added drop zones before the first item and after each item
   - ✅ Generated unique drop zone IDs: `drop-before-{todoId}` and `drop-after-{todoId}`
   - ✅ Integrated seamlessly with existing todo item rendering
   - ✅ Maintains proper spacing and layout

3. **Advanced Drop Zone Logic (src/hooks/useDragAndDrop.ts)**
   ```typescript
   // Check if dropping on a drop zone
   if (typeof over.id === 'string' && over.id.startsWith('drop-')) {
     const dropZoneId = over.id as string;

     if (dropZoneId.startsWith('drop-before-')) {
       const targetTodoId = dropZoneId.replace('drop-before-', '');
       newIndexGlobal = todos.findIndex((t) => t.id === targetTodoId);
     } else if (dropZoneId.startsWith('drop-after-')) {
       const targetTodoId = dropZoneId.replace('drop-after-', '');
       const targetIndex = todos.findIndex((t) => t.id === targetTodoId);
       newIndexGlobal = targetIndex + 1;
     }
   }
   ```

4. **Visual Design Features**
   - ✅ **Animated Appearance**: Smooth height transition from 0 to 8px when hovering
   - ✅ **Dual-Layer Design**: Primary purple line with subtle background glow
   - ✅ **Pulsing Animation**: `animate-pulse` for attention-grabbing feedback
   - ✅ **Responsive Sizing**: Extends slightly beyond content width for better visibility
   - ✅ **Smooth Transitions**: 200ms duration for all state changes

**Behavior:**

- **Before First Item**: Drop zone appears above the first todo when dragging
- **Between Items**: Drop zones appear between each todo item during drag operations
- **After Last Item**: Drop zone appears below the last todo item
- **Precise Positioning**: Distinguishes between "before" and "after" positions
- **Only When Enabled**: Drop indicators only work when "Custom Sort" is selected

**Benefits:**

- 🎯 **Precise Positioning**: Users can see exactly where items will be dropped
- 🎨 **Visual Clarity**: Clear purple horizontal lines indicate drop positions
- ⚡ **Smooth Animations**: Elegant transitions enhance user experience
- 📱 **Responsive Design**: Works consistently across different screen sizes
- 🔄 **Seamless Integration**: Maintains all existing drag & drop functionality

**Technical Implementation:**

- **Drop Zone IDs**: Uses prefixed IDs (`drop-before-`, `drop-after-`) for precise positioning
- **Conditional Rendering**: Drop indicators only appear during active drag operations
- **Index Calculation**: Accurately calculates insertion positions for both before/after scenarios
- **State Management**: Integrates with existing `useDroppable` hooks from dnd-kit
- **CSS Animations**: Uses Tailwind classes for smooth transitions and pulsing effects

**Files Modified:**

- `src/components/TodoListItems.tsx`: Added DropZone component and drop zone rendering
- `src/hooks/useDragAndDrop.ts`: Enhanced drop logic to handle drop zone positioning

**Testing Results:**

- ✅ Drop indicators appear between todos during drag operations
- ✅ Precise positioning works for both "before" and "after" drop zones
- ✅ Smooth animations and visual feedback
- ✅ Only active when "Custom Sort" is enabled
- ✅ Maintains all existing drag & drop functionality
- ✅ Console logging shows accurate drop zone detection

This enhancement significantly improves the user experience by providing clear visual feedback for drag and drop positioning, making todo reordering intuitive and precise.

---

Date: 2025-06-21
Description: Refactored DropIndicator into separate component and cleaned up console logs.

**Problem:**
The DropIndicator component was embedded within TodoListItems.tsx, making the file larger and less maintainable. Additionally, console logs were cluttering the output during normal drag and drop operations.

**Solution:**
Extracted the DropIndicator into its own reusable component file and removed all debugging console logs for cleaner production code.

**Key Changes:**

1. **Created Separate DropIndicator Component (src/components/DropIndicator.tsx)**
   ```typescript
   interface DropIndicatorProps {
     todoId: string;
     position: 'before' | 'after';
     allTodos: Todo[];
   }

   const DropIndicator = ({ todoId, position, allTodos }: DropIndicatorProps) => {
     // Clean implementation without console logs
     // Visual purple horizontal line with pulsing animation
   };
   ```

2. **Updated TodoListItems.tsx**
   - ✅ Removed local DropIndicator component definition
   - ✅ Added import for the new DropIndicator component
   - ✅ Maintained all existing functionality
   - ✅ Cleaner, more focused component structure

3. **Cleaned Up Console Logs (src/hooks/useDragAndDrop.ts)**
   - ❌ Removed: `🔄 Attempting todo reordering` logs
   - ❌ Removed: `❌ Reordering blocked` logs
   - ❌ Removed: `✅ Custom sort enabled` logs
   - ❌ Removed: `📍 Reordering indices` logs
   - ❌ Removed: `📋 Moving todo to different list` logs
   - ❌ Removed: `✅ Todo moved successfully` logs

**Benefits:**

- 🧩 **Better Code Organization**: DropIndicator is now a reusable component
- 🔧 **Easier Maintenance**: Separate file for drop indicator logic
- 🎯 **Focused Components**: TodoListItems.tsx is cleaner and more focused
- 🔇 **Clean Console**: No debugging noise during normal operations
- ♻️ **Reusability**: DropIndicator can be used in other parts of the app if needed
- 📝 **Better TypeScript**: Proper interface definition for component props

**File Structure:**

```
src/components/
├── DropIndicator.tsx          # New: Extracted drop indicator component
├── TodoListItems.tsx          # Updated: Cleaner, imports DropIndicator
└── ...
```

**Functionality Preserved:**

- ✅ Visual drop indicators still work perfectly
- ✅ Purple horizontal lines appear during drag operations
- ✅ "Before" and "after" positioning logic intact
- ✅ Smooth animations and transitions
- ✅ Only shows when "Custom Sort" is enabled
- ✅ All drag and drop operations function normally

**Files Modified:**

- `src/components/DropIndicator.tsx`: New component file
- `src/components/TodoListItems.tsx`: Removed local component, added import
- `src/hooks/useDragAndDrop.ts`: Removed all console.log statements

This refactoring improves code organization and maintainability while preserving all existing functionality and visual behavior.

---

Date: 2025-06-28
Description: Fixed unused variable issue in formatMobileDate function by removing the unused 'year' variable. Extracted duplicated months array into a reusable MONTHS constant to eliminate code duplication between formatNativeDate and formatMobileDate functions. Added list selection dropdown to EditTodoDialog for mobile users to change todo item's list assignment, enabling users to move todos between lists when drag & drop is not available on mobile devices.

**Key Changes:**

1. **Fixed Unused Variable (src/utils/helper.ts)**
   - ✅ Removed unused `year` variable from `formatMobileDate` function
   - ✅ Function only needs month, day, hours, and minutes for compact mobile format

2. **Extracted Reusable Constant (src/utils/helper.ts)**
   - ✅ Created `MONTHS` constant array with month abbreviations
   - ✅ Updated both `formatNativeDate` and `formatMobileDate` to use shared constant
   - ✅ Eliminated code duplication and improved maintainability

3. **Enhanced EditTodoDialog for Mobile (src/components/EditTodoDialog.tsx)**
   - ✅ Added list selection dropdown with all available lists (except "All")
   - ✅ Added `editListId` state to track selected list
   - ✅ Updated interface to include `newListId` parameter in `onSave` callback
   - ✅ Integrated with `useTodoStore` to get available lists

4. **Updated Store Integration (src/store/todoStore.ts)**
   - ✅ Enhanced `editTodo` function to handle `listId` updates
   - ✅ Added `listId` to Supabase payload for database updates
   - ✅ Updated sync operations to handle list changes in offline mode

5. **Updated App.tsx Integration**
   - ✅ Modified `handleSaveEditDialog` to accept and process `newListId` parameter
   - ✅ Conditionally includes `listId` in updates when provided

**Benefits:**

- 📱 **Mobile Accessibility**: Users can now change todo list assignment on mobile devices
- 🔄 **Cross-Platform Consistency**: Provides alternative to drag & drop for mobile users
- 🧹 **Code Quality**: Eliminated unused variables and code duplication
- ♻️ **Maintainability**: Shared constants reduce maintenance overhead
- 🎯 **User Experience**: Seamless list selection with familiar dropdown interface

**Files Modified:**

- `src/utils/helper.ts`: Fixed unused variable, extracted MONTHS constant
- `src/components/EditTodoDialog.tsx`: Added list selection dropdown
- `src/store/todoStore.ts`: Enhanced editTodo to handle listId updates
- `src/App.tsx`: Updated save handler to process list changes

This enhancement provides mobile users with the ability to move todos between lists through the edit dialog, complementing the existing drag & drop functionality available on desktop screens.

---

Date: 2025-06-28
Description: Enhanced mobile user experience by implementing vertical icon alignment and view/edit mode functionality for todo items.

**Key Changes:**

1. **Vertical Icon Alignment on Mobile (src/components/TodoItem.tsx)**
   - ✅ Changed action buttons container from `flex gap-1` to `flex flex-col sm:flex-row gap-1`
   - ✅ Icons now stack vertically on mobile screens and remain horizontal on desktop
   - ✅ Improved mobile layout with better touch target accessibility

2. **Clickable Todo Cards for Mobile (src/components/TodoItem.tsx)**
   - ✅ Made todo content area clickable on mobile devices (screen width < 640px)
   - ✅ Tapping todo card opens EditTodoDialog in view mode
   - ✅ Added `stopPropagation()` to action buttons to prevent triggering card click
   - ✅ Desktop behavior unchanged (no clickable area)

3. **View/Edit Mode in EditTodoDialog (src/components/EditTodoDialog.tsx)**
   - ✅ Added `viewMode` prop and `isViewMode` state management
   - ✅ Implemented read-only view mode with styled display fields
   - ✅ Added edit icon next to title in view mode to switch to edit mode
   - ✅ Dynamic title: "Todo Details" in view mode, "Edit Todo" in edit mode
   - ✅ Hide Save/Cancel buttons in view mode

4. **Enhanced Dialog Scrolling (src/components/EditTodoDialog.tsx)**
   - ✅ Restructured dialog layout with fixed header and footer
   - ✅ Added scrollable content area between header and footer
   - ✅ Fixed scrolling issues in view mode with proper flex layout
   - ✅ Improved mobile viewing experience for long content

5. **Store Integration (src/store/todoStore.ts)**
   - ✅ Added `editDialogViewMode` state to track view/edit mode
   - ✅ Enhanced `openEditDialog` function to accept optional `viewMode` parameter
   - ✅ Updated `closeEditDialog` to reset view mode state
   - ✅ Proper state management for dialog mode switching

6. **App Integration (src/App.tsx)**
   - ✅ Updated EditTodoDialog component to receive `viewMode` prop from store
   - ✅ Seamless integration with existing dialog functionality

**Mobile UX Improvements:**

- 📱 **Touch-Friendly**: Vertical icon alignment provides better touch targets
- 👆 **Intuitive Navigation**: Tap todo card to view details, tap edit icon to modify
- 📖 **Read-Only View**: Clean, distraction-free view mode for reviewing todo details
- ✏️ **Easy Editing**: One-tap switch from view to edit mode
- 📜 **Proper Scrolling**: Fixed scrolling issues for long content in dialogs

**Benefits:**

- 🎯 **Mobile-First Design**: Optimized layout and interactions for mobile users
- 🔄 **Seamless Mode Switching**: Smooth transition between view and edit modes
- 📱 **Better Accessibility**: Larger touch targets and clearer visual hierarchy
- 🎨 **Consistent UI**: Maintains design consistency across desktop and mobile
- 🚀 **Enhanced UX**: Improved user experience with intuitive mobile interactions

**Files Modified:**

- `src/components/TodoItem.tsx`: Vertical icon alignment, clickable cards, view mode support
- `src/components/EditTodoDialog.tsx`: View/edit mode implementation, improved scrolling
- `src/store/todoStore.ts`: Added view mode state management
- `src/App.tsx`: Updated dialog integration with view mode support

This enhancement significantly improves the mobile user experience by providing intuitive touch interactions and a clean view/edit mode system for todo management.

---

Date: 2025-06-28
Description: Enhanced FilterDialog to always show "Show completed tasks" as checked and disabled when viewing the "Completed" list.

**Problem:**
When users were on the "Completed" list and opened the filter dialog, the "Show completed tasks" checkbox could be unchecked, which would hide all todos since the Completed list only contains completed todos. This created a confusing user experience.

**Solution:**
Modified the FilterDialog component to automatically handle the "Completed" list case by always keeping the "Show completed tasks" checkbox checked and disabled.

**Key Changes:**

1. **Enhanced FilterDialog Interface (src/components/FilterDialog.tsx)**
   - ✅ Added `isCompletedList?: boolean` prop to identify when viewing the Completed list
   - ✅ Updated component signature to accept the new prop with default value `false`

2. **Smart State Management**
   - ✅ Modified `useEffect` to automatically set `showCompleted: true` when `isCompletedList` is true
   - ✅ Updated `handleReset` function to respect the completed list requirement
   - ✅ Ensured the checkbox state is always correct for the Completed list context

3. **Disabled Checkbox for Completed List**
   - ✅ Made checkbox non-interactive when viewing the Completed list
   - ✅ Added visual styling to indicate disabled state (grayed out appearance)
   - ✅ Changed cursor to `cursor-not-allowed` for disabled state
   - ✅ Prevented onChange events when disabled

4. **Visual Feedback**
   - ✅ Added explanatory text: "(Always enabled for Completed list)"
   - ✅ Applied disabled styling with muted colors for text and checkbox
   - ✅ Clear visual indication that the option is not interactive

5. **Integration with TodoListView (src/components/TodoListView.tsx)**
   - ✅ Passed `isCompletedList` prop to FilterDialog component
   - ✅ Leveraged existing `isCompletedList` logic for seamless integration

**Benefits:**

- 🎯 **Logical Consistency**: Prevents users from hiding all todos in the Completed list
- 🔒 **Prevents Confusion**: Eliminates the possibility of an empty Completed list due to filter settings
- 👁️ **Clear Visual Feedback**: Users understand why the option is disabled
- 🧠 **Intuitive UX**: Behavior matches user expectations for a "Completed" list
- ⚡ **Automatic Handling**: No manual intervention required from users

**Technical Implementation:**

- **Conditional Logic**: Uses `isCompletedList` prop to determine behavior
- **State Management**: Automatically manages filter state based on list context
- **Visual Design**: Consistent disabled state styling across light/dark themes
- **Event Handling**: Prevents interaction when checkbox should be disabled
- **Reset Functionality**: Maintains correct state even when resetting filters

**Files Modified:**

- `src/components/FilterDialog.tsx`: Added completed list detection and disabled state handling
- `src/components/TodoListView.tsx`: Passed `isCompletedList` prop to FilterDialog

This enhancement ensures that the filter dialog behaves logically and intuitively when users are viewing the "Completed" list, preventing confusion and maintaining a consistent user experience.

---

Date: 2025-06-28
Description: Fixed "Completed" list to automatically show completed todos by default instead of displaying "No todos yet. Add one above!"

**Problem:**
When users clicked on the "Completed" list in the sidebar, they would see "No todos yet. Add one above!" instead of the completed todos. This happened because the default filter state had `showCompleted: false`, which filtered out all completed todos even when viewing the Completed list.

**Root Cause:**
The `activeFilters` state in TodoListView had `showCompleted: false` by default, and the `applyFilters` function would filter out completed todos when this flag was false. This created a logical inconsistency where the "Completed" list would hide completed todos by default.

**Solution:**
Added automatic filter adjustment logic that sets `showCompleted: true` when the user switches to the "Completed" list, ensuring completed todos are visible by default.

**Key Changes:**

1. **Added useEffect Hook (src/components/TodoListView.tsx)**
   - ✅ Imported `useEffect` from React
   - ✅ Added useEffect to monitor `isCompletedList` and `activeFilters.showCompleted`
   - ✅ Automatically sets `showCompleted: true` when viewing Completed list
   - ✅ Only triggers when necessary to avoid unnecessary re-renders

2. **Smart Filter State Management**
   - ✅ Detects when user switches to "Completed" list
   - ✅ Automatically adjusts filter state to show completed todos
   - ✅ Preserves other filter settings (priority, due date, etc.)
   - ✅ Non-intrusive - doesn't affect other list behaviors

3. **Logical Flow Fix**
   ```typescript
   useEffect(() => {
     if (isCompletedList && !activeFilters.showCompleted) {
       setActiveFilters(prev => ({
         ...prev,
         showCompleted: true
       }));
     }
   }, [isCompletedList, activeFilters.showCompleted]);
   ```

**Benefits:**

- 🎯 **Intuitive Behavior**: Completed list now shows completed todos by default
- 🔧 **Automatic Fix**: No manual user intervention required
- 📋 **Logical Consistency**: List behavior matches user expectations
- ⚡ **Performance**: Minimal overhead with targeted useEffect dependencies
- 🔄 **Seamless Integration**: Works with existing filter dialog enhancements

**Technical Details:**

- **Dependency Array**: `[isCompletedList, activeFilters.showCompleted]` ensures effect only runs when necessary
- **Conditional Logic**: Only updates filter when on Completed list AND showCompleted is false
- **State Preservation**: Uses spread operator to maintain other filter settings
- **No Side Effects**: Doesn't interfere with manual filter adjustments in other lists

**User Experience Flow:**

1. **Before**: Click "Completed" → See "No todos yet. Add one above!"
2. **After**: Click "Completed" → See all completed todos immediately

**Files Modified:**

- `src/components/TodoListView.tsx`: Added useEffect for automatic filter adjustment

This fix resolves the confusing user experience where the "Completed" list appeared empty by default, ensuring that completed todos are immediately visible when users navigate to the Completed list.

---

Date: 2025-06-28
Description: Enhanced "Completed" list to automatically expand the completed section by default, showing all completed todos immediately.

**Problem:**
When users clicked on the "Completed" list, the completed section was collapsed by default, showing only "Completed (5)" with a collapsed arrow. Users had to manually click to expand the section to see their completed todos, which was an unnecessary extra step.

**Solution:**
Extended the existing useEffect to also automatically expand the completed section (`showCompletedSection: true`) when viewing the "Completed" list.

**Key Changes:**

1. **Enhanced useEffect Logic (src/components/TodoListView.tsx)**
   - ✅ Extended existing useEffect to handle both filter state and section expansion
   - ✅ Added `showCompletedSection` state management for Completed list
   - ✅ Updated dependency array to include `showCompletedSection`
   - ✅ Maintains separation of concerns with conditional checks

2. **Improved Logic Flow**
   ```typescript
   useEffect(() => {
     if (isCompletedList) {
       if (!activeFilters.showCompleted) {
         setActiveFilters(prev => ({
           ...prev,
           showCompleted: true
         }));
       }
       if (!showCompletedSection) {
         setShowCompletedSection(true);
       }
     }
   }, [isCompletedList, activeFilters.showCompleted, showCompletedSection]);
   ```

3. **Automatic Section Expansion**
   - ✅ Detects when user switches to "Completed" list
   - ✅ Automatically expands completed section if collapsed
   - ✅ Shows all completed todos immediately without manual interaction
   - ✅ Preserves user's manual expand/collapse preferences for other lists

**Benefits:**

- 🎯 **Immediate Visibility**: Completed todos are visible immediately upon list selection
- 👆 **Reduced Clicks**: Eliminates the need to manually expand the completed section
- 🔄 **Seamless Experience**: Smooth transition from list selection to viewing todos
- 📋 **Logical Behavior**: Section expansion matches user expectations for a "Completed" list
- ⚡ **Performance**: Minimal overhead with targeted state updates

**User Experience Flow:**

1. **Before**: Click "Completed" → See collapsed "Completed (5)" → Click to expand → See todos
2. **After**: Click "Completed" → See all completed todos immediately expanded

**Technical Implementation:**

- **State Management**: Uses existing `showCompletedSection` state
- **Conditional Updates**: Only updates when necessary to avoid unnecessary re-renders
- **Dependency Tracking**: Proper dependency array ensures optimal performance
- **Non-Intrusive**: Doesn't affect behavior of other lists or manual user interactions

**Files Modified:**

- `src/components/TodoListView.tsx`: Enhanced useEffect to handle section expansion

This enhancement completes the intuitive "Completed" list experience by ensuring users can immediately see all their completed todos without any additional clicks or interactions.

---

Date: 2025-06-28
Description: Implemented smart "Show completed tasks" filter behavior that respects user preferences across different lists while forcing the setting for the "Completed" list.

**Problem:**
When users had "Show completed tasks" set to false and switched to the "Completed" list, the filter would correctly change to true. However, when they switched back to other lists, the filter would remain true instead of reverting to their original preference. This meant users lost their intended filter setting when navigating between lists.

**Solution:**
Implemented a dual-state system that tracks both the active filter state and the user's actual preference separately, allowing the system to force the filter for the "Completed" list while preserving user preferences for other lists.

**Key Changes:**

1. **Dual State Management (src/components/TodoListView.tsx)**
   - ✅ Added `userShowCompletedPreference` state to track user's actual preference
   - ✅ Separated forced state (for Completed list) from user preference (for other lists)
   - ✅ Maintains both states independently for proper behavior

2. **Enhanced useEffect Logic**
   ```typescript
   useEffect(() => {
     if (isCompletedList) {
       // For Completed list: force showCompleted to true and expand section
       if (!activeFilters.showCompleted) {
         setActiveFilters(prev => ({ ...prev, showCompleted: true }));
       }
       if (!showCompletedSection) {
         setShowCompletedSection(true);
       }
     } else {
       // For other lists: restore user's actual preference
       if (activeFilters.showCompleted !== userShowCompletedPreference) {
         setActiveFilters(prev => ({ ...prev, showCompleted: userShowCompletedPreference }));
       }
     }
   }, [isCompletedList, activeFilters.showCompleted, showCompletedSection, userShowCompletedPreference]);
   ```

3. **Smart Filter Application**
   - ✅ Updated `handleApplyFilters` to always track user's actual preference
   - ✅ Forces `showCompleted: true` when applying filters on Completed list
   - ✅ Applies user's actual preference when on other lists
   - ✅ Maintains consistency between user intent and system behavior

4. **FilterDialog Integration**
   - ✅ Passes user's actual preference to FilterDialog when on Completed list
   - ✅ Shows user's real preference in the dialog, not the forced state
   - ✅ Allows users to see and modify their actual preference even from Completed list

**Behavior Flow:**

1. **User sets "Show completed tasks" to false** → Preference saved
2. **User switches to "Completed" list** → Filter forced to true, todos visible
3. **User switches to another list** → Filter reverts to false (user's preference)
4. **User opens FilterDialog on Completed list** → Shows their actual preference (false)
5. **User changes preference in FilterDialog** → New preference saved and applied appropriately

**Benefits:**

- 🎯 **Preserves User Intent**: User's filter preferences are maintained across list navigation
- 🔄 **Smart Context Switching**: Automatic behavior based on list type
- 🧠 **Intuitive Logic**: Completed list always shows completed tasks, other lists respect user choice
- ⚙️ **Consistent Settings**: FilterDialog always shows user's actual preference
- 🔒 **Predictable Behavior**: Users can rely on their settings being preserved

**Technical Implementation:**

- **State Separation**: `activeFilters.showCompleted` (current state) vs `userShowCompletedPreference` (user intent)
- **Conditional Logic**: Different behavior based on `isCompletedList` flag
- **Preference Tracking**: Always updates user preference when filters are applied
- **Dialog Integration**: Passes appropriate state to FilterDialog based on context

**Files Modified:**

- `src/components/TodoListView.tsx`: Added dual-state management and smart filter behavior

This enhancement ensures that the "Show completed tasks" filter behaves intelligently - always showing completed tasks in the "Completed" list while respecting and preserving user preferences for all other lists.

---
