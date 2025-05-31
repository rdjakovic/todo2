# Changes Log

2025-05-31 14:30:00
- Fixed setLists error by destructuring setLists from useTodoStore and passing it to TodoListView component

2025-05-31 15:00:00
- Fixed show/hide completed todos toggle by:
  - Properly saving show_completed status to database
  - Using saveLists instead of setLists for persistence
  - Ensuring all required fields are included in upsert operation