import { Todo, TodoList } from "../types/todo"; // Added Todo import

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

// Prepares TodoList[] for saving by converting Date objects to ISO strings
export const serializeListsForSave = (listsToSave: TodoList[]): any[] => {
  return listsToSave.map((list) => ({
    ...list,
    todos: list.todos.map((todo) => ({
      ...todo,
      dateCreated: isValidNativeDate(todo.dateCreated)
        ? todo.dateCreated.toISOString()
        : undefined,
      dueDate:
        todo.dueDate && isValidNativeDate(todo.dueDate)
          ? todo.dueDate.toISOString()
          : undefined,
      dateOfCompletion:
        todo.dateOfCompletion && isValidNativeDate(todo.dateOfCompletion)
          ? todo.dateOfCompletion.toISOString()
          : undefined,
    })),
  }));
};

// Filters todos based on the selected list and hideCompleted status
export const getFilteredTodos = (
  lists: TodoList[],
  selectedList: string,
  hideCompleted: boolean
): Todo[] => {
  if (selectedList === "completed") {
    return lists
      .filter((list) => list && list.todos)
      .flatMap((list) => list.todos.filter((todo) => todo.completed));
  }
  if (selectedList === "home") {
    return lists
      .filter((list) => list && list.todos)
      .flatMap((list) => list.todos.filter((todo) => !todo.completed));
  }
  return (
    lists
      .find((list) => list && list.id === selectedList)
      ?.todos?.filter((todo) => !hideCompleted || !todo.completed) ?? []
  );
};

// Calculates the count of todos for each list
export const calculateTodoCountByList = (
  lists: TodoList[]
): Record<string, number> => {
  return lists
    .filter((list) => list && list.todos)
    .reduce((acc, list) => {
      // Count completed todos for the Completed list
      const completedCount = list.todos.filter((todo) => todo.completed).length;
      acc["completed"] = (acc["completed"] || 0) + completedCount;

      // Count incomplete todos for the Home list
      const incompleteCount = list.todos.filter(
        (todo) => !todo.completed
      ).length;
      acc["home"] = (acc["home"] || 0) + incompleteCount;

      // For other lists, count based on list's isCompletedHidden property
      if (list.id !== "home" && list.id !== "completed") {
        acc[list.id] = list.isCompletedHidden
          ? list.todos.filter((todo) => !todo.completed).length // Only count incomplete if isCompletedHidden is true
          : list.todos.length; // Count all if isCompletedHidden is false
      }

      return acc;
    }, {} as Record<string, number>);
};
