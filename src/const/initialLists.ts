import { TodoList } from "../types/todo";

export const initialLists: Partial<TodoList>[] = [
  {
    name: "Home",
    icon: "home",
    todos: [],
    showCompleted: true, 
  },
  {
    name: "Completed",
    icon: "check",
    todos: [],
    showCompleted: true, 
  },
  {
    name: "Personal",
    icon: "user",
    todos: [],
    showCompleted: true, 
  },
  {
    name: "Work",
    icon: "briefcase",
    todos: [],
    showCompleted: true, 
  },
];