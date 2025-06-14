/*
  # Clean up invalid todo records

  1. Data Cleanup
    - Remove todos with invalid list_id values (non-UUID strings like "all", "completed")
    - These records cannot be associated with valid lists and cause query failures
  
  2. Data Integrity
    - Ensures all remaining todos have valid UUID list_id values
    - Maintains referential integrity with the lists table
*/

-- Remove todos where list_id is not a valid UUID format
-- This will clean up records with values like 'all', 'completed', etc.
DELETE FROM todos 
WHERE list_id::text ~ '^[a-zA-Z]' 
OR NOT (list_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Alternative approach: Remove todos that don't have a corresponding list
-- This ensures referential integrity is maintained
DELETE FROM todos 
WHERE NOT EXISTS (
  SELECT 1 FROM lists 
  WHERE lists.id = todos.list_id
);