export interface TodoList {
  id: string;
  name: string;
  icon: string;
  todos: Todo[];
  isCompletedHidden?: boolean;
}

export interface Todo {
  id: number;
  text: string;
  notes?: string;
  completed: boolean;
  dateCreated: Date;
  isEditing?: boolean;
  editText?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: Date;
  dateOfCompletion?: Date;
}
