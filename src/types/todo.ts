export type SortOption =
  | "dateCreated"
  | "priority"
  | "dateCompleted"
  | "completedFirst"
  | "completedLast"
  | "dueDate"
  | "custom";

export interface TodoList {
  id: string;
  name: string;
  icon: string;
  showCompleted: boolean;
  userId: string;
  sortPreference?: SortOption;
}

export interface Todo {
  id: string;
  title: string;
  notes?: string;
  completed: boolean;
  dateCreated: Date;
  priority?: "low" | "medium" | "high";
  dueDate?: Date;
  dateOfCompletion?: Date;
  listId: string;
}
