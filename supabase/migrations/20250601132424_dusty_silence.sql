/*
  # Add Row Level Security for todos table

  1. Security Changes
    - Enable RLS on `todos` table
    - Add policy for authenticated users to read their own todos
    - Add policy for authenticated users to insert todos linked to their lists
    - Add policy for authenticated users to update their own todos
    - Add policy for authenticated users to delete their own todos

  2. Notes
    - Policies ensure users can only access todos linked to lists they own
    - Uses joins to verify list ownership for all operations
*/

-- Enable RLS
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Policy for reading todos (only if the user owns the associated list)
CREATE POLICY "Users can read own todos"
  ON todos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = todos.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- Policy for inserting todos (only into lists owned by the user)
CREATE POLICY "Users can insert todos into own lists"
  ON todos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_id
      AND lists.user_id = auth.uid()
    )
  );

-- Policy for updating todos (only if user owns the associated list)
CREATE POLICY "Users can update own todos"
  ON todos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = todos.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- Policy for deleting todos (only if user owns the associated list)
CREATE POLICY "Users can delete own todos"
  ON todos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = todos.list_id
      AND lists.user_id = auth.uid()
    )
  );