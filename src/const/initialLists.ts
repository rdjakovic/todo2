import { TodoList } from "../types/todo";

export const initialLists: TodoList[] = [
  {
    id: 1,
    name: "Home",
    icon: "home",
    todos: [],
    showCompleted: true,
  },
  {
    id: 2,
    name: "Completed",
    icon: "check",
    todos: [],
    showCompleted: true,
  },
  {
    id: 3,
    name: "Personal",
    icon: "user",
    todos: [],
    showCompleted: true,
  },
  {
    id: 4,
    name: "Work",
    icon: "briefcase",
    todos: [],
    showCompleted: true,
  },
];
