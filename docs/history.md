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
