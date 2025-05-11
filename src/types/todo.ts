export interface TodoList {
  id: string;
  name: string;
  icon: string;
  todos: Todo[];
  isCompletedHidden?: boolean;
}

export interface Todo {
  id: number;
  title: string;
  notes?: string;
  completed: boolean;
  dateCreated: Date;
  priority?: "low" | "medium" | "high";
  dueDate?: Date;
  dateOfCompletion?: Date;
}
