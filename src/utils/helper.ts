import { TodoList } from "../types/todo";

export const getListById = (lists: TodoList[], id: string) => {
  return lists.find((list) => list.id === id);
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