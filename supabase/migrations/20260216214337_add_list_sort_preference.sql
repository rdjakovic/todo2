/*
  # Add sort_preference column to lists table

  1. Changes
    - Add sort_preference column to lists table
    - Column is nullable (NULL means use global default sort)
    - Constrained to valid sort option values

  2. Purpose
    - Enable per-list sorting preferences that override the global default
    - Allows users to have different sorting for different lists
    - Example: Work list sorted by priority, Personal list sorted by due date
*/

-- Add sort_preference column to lists table
-- Nullable column - when NULL, the list uses the global default sort
-- Constrained to only valid SortOption values
ALTER TABLE lists
ADD COLUMN sort_preference text
CHECK (sort_preference IN (
  'dateCreated',
  'priority',
  'dateCompleted',
  'completedFirst',
  'completedLast',
  'dueDate',
  'custom'
));
