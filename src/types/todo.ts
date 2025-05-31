export interface TodoList {
  id: number;
  name: string;
  icon: string;
  todos: Todo[];
  showCompleted: boolean;
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
  listId: number;
}
