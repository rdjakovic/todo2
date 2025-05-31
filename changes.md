# Changes Log

## 2025-05-31 14:30
- Fixed Supabase column name mismatch in todoStore.ts
- Updated select queries to use snake_case column names instead of camelCase
- Added explicit column selection in todos query to match database schema

## 2025-05-31 14:45
- Updated TodoList and Todo interfaces to use string IDs (UUIDs)
- Fixed column name mappings in todoStore.ts to match database schema
- Added proper type handling for null selectedListId
- Improved data processing for Supabase responses