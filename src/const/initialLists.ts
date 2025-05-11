import { TodoList } from "../types/todo";

export const initialLists: TodoList[] = [
  {
    id: "home",
    name: "Home",
    icon: "home",
    todos: [],
    isCompletedHidden: false,
  },
  {
    id: "completed",
    name: "Completed",
    icon: "check",
    todos: [],
    isCompletedHidden: false,
  },
  {
    id: "personal",
    name: "Personal",
    icon: "user",
    todos: [],
    isCompletedHidden: false,
  },
  {
    id: "work",
    name: "Work",
    icon: "briefcase",
    todos: [],
    isCompletedHidden: false,
  },
];
