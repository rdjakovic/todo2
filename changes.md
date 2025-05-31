# Changes Log

2025-05-31 14:30 - Fixed column name casing mismatch between frontend and database
- Modified saveLists function to properly map showCompleted to show_completed when saving lists
- Updated addTodo function to explicitly map all todo properties to their snake_case database column names
- Enhanced editTodo function to create a proper payload object with snake_case column names
- Removed object spreading in database operations to prevent sending undefined columns