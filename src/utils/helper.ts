import { TodoList } from "../types/todo";

export const getListById = (lists: TodoList[], id: string) => {
  return lists.find((list) => list.id === id);
};

export const getListNameById = (lists: TodoList[], id: string) => {
  return lists.find((list) => list.id === id)?.name;
};

export const getListByName = (lists: TodoList[], name: string) => {
  return lists.find((list) => list.name === name);
};

// Helper function for native date validation
export const isValidNativeDate = (d: Date | undefined | null): d is Date =>
  d instanceof Date && !isNaN(d.getTime());

// Helper function for native date formatting
export const formatNativeDate = (date: Date): string => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${month} ${day}, ${year} - ${hours}:${minutes}`;
};

// Processes raw list data from storage into TodoList[] format
export const processLoadedLists = (rawLists: any[]): TodoList[] => {
  return rawLists.map((list: any) => ({
    ...list,
    todos: list.todos.map((todo: any) => ({
      ...todo,
      dateCreated: new Date(todo.dateCreated),
      dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
      dateOfCompletion: todo.dateOfCompletion
        ? new Date(todo.dateOfCompletion)
        : undefined,
    })),
  }));
};
