import { TodoList } from "../types/todo";

export const initialLists: Partial<TodoList>[] = [
  {
    name: "All",
    icon: "home",
    showCompleted: true,
  },
  {
    id: "completed",
    name: "Completed",
    icon: "check",
    showCompleted: true,
  },
  {
    name: "Personal",
    icon: "user",
    showCompleted: true,
  },
  {
    name: "Work",
    icon: "briefcase",
    showCompleted: true,
  },
];