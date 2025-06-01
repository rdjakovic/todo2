import { TodoList } from "../types/todo";

export const initialLists: Partial<TodoList>[] = [
  {
    id: "home",
    name: "Home",
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
    id: "personal",
    name: "Personal",
    icon: "user",
    showCompleted: true,
  },
  {
    id: "work",
    name: "Work",
    icon: "briefcase",
    showCompleted: true,
  },
];
