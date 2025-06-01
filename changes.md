# Changes Log

2025-05-31 14:30:00
- Fixed setLists error by destructuring setLists from useTodoStore and passing it to TodoListView component

2025-05-31 15:00:00
- Fixed show/hide completed todos toggle by:
  - Properly saving show_completed status to database
  - Using saveLists instead of setLists for persistence
  - Ensuring all required fields are included in upsert operation

2025-06-01 15:45:00
- Fixed ReferenceError in App.tsx by removing direct call to undefined 'set' function in handleDragEnd method. The saveTodos function already handles state updates.

2025-06-01 16:30:00
- Fixed drag and drop functionality issues:
  1. Fixed ListItem.tsx to properly implement droppable targets without duplicate imports
  2. Updated App.tsx handleDragEnd function to directly update state after saving to backend
  3. Modified saveTodos in todoStore.ts to update local state in addition to saving to backend
  4. Cleaned up duplicate imports in TodoListItems.tsx
  5. Fixed type errors in ListItem.tsx for onEdit and onDelete function parameters

2025-06-01 17:45:00
- Fixed todo reordering within the same list:
  1. Improved the handleDragEnd function in App.tsx with clearer variable names
  2. Added improved comments to explain the reordering logic
  3. Ensured state is updated immediately after drag and drop operations
  4. Made sure local state is updated consistently after all save operations

2025-06-01 18:30:00
- Fixed todo reordering within the same list by completely rewriting the reordering logic:
  1. Changed the approach to use global indices in the todos array instead of filtering by list first
  2. Simplified the logic by directly applying arrayMove to the entire todos array
  3. Eliminated the complex mapping operation that was causing reordering to fail
  4. Updated state management to ensure UI reflects the new order immediately

2025-06-01 19:15:00
- Enhanced toggle button for completed todos:
  1. Added green background color (bg-green-500) when showing all todos
  2. Added dark mode support with dark:bg-green-600 
  3. Used clsx to conditionally apply classes based on toggle state
  4. Maintained existing functionality while improving visual feedback