/*
  # Todo App Schema

  1. New Tables
    - `lists`
      - `id` (uuid, primary key)
      - `name` (text)
      - `icon` (text)
      - `show_completed` (boolean)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp with timezone)
      - `updated_at` (timestamp with timezone)

    - `todos`
      - `id` (uuid, primary key)
      - `list_id` (uuid, foreign key to lists)
      - `title` (text)
      - `notes` (text)
      - `completed` (boolean)
      - `priority` (text - can be 'low', 'medium', 'high')
      - `due_date` (timestamp with timezone)
      - `date_created` (timestamp with timezone)
      - `date_of_completion` (timestamp with timezone)
      - `created_at` (timestamp with timezone)
      - `updated_at` (timestamp with timezone)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- Create lists table
CREATE TABLE IF NOT EXISTS lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL,
  show_completed boolean DEFAULT false,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create todos table
CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text,
  completed boolean DEFAULT false,
  priority text CHECK (priority IN ('low', 'medium', 'high')),
  due_date timestamptz,
  date_created timestamptz NOT NULL DEFAULT now(),
  date_of_completion timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Create policies for lists
CREATE POLICY "Users can manage their own lists"
  ON lists
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for todos
CREATE POLICY "Users can manage todos in their lists"
  ON todos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists 
      WHERE lists.id = todos.list_id 
      AND lists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists 
      WHERE lists.id = todos.list_id 
      AND lists.user_id = auth.uid()
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_lists_updated_at
  BEFORE UPDATE ON lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();