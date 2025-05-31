import { TodoList } from "../types/todo";

export const initialLists: Partial<TodoList>[] = [
  {
    id: "home",
    name: "Home",
    icon: "home",
    todos: [],
    showCompleted: true,
  },
  {
    id: "completed",
    name: "Completed",
    icon: "check",
    todos: [],
    showCompleted: true,
  },
  {
    id: "personal",
    name: "Personal",
    icon: "user",
    todos: [],
    showCompleted: true,
  },
  {
    id: "work",
    name: "Work",
    icon: "briefcase",
    todos: [],
    showCompleted: true,
  },
];
