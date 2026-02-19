export type { SortOption, SortDirection } from "../constants/sortOptions";

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

export interface FilterOptions {
  showCompleted: boolean;
  priorities: {
    low: boolean;
    medium: boolean;
    high: boolean;
  };
  hasDueDate: boolean;
  hasNote: boolean;
}
