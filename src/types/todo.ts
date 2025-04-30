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
  completed: boolean;
  date: string;
  listId: string;
  isEditing?: boolean;
  editText?: string;
}
