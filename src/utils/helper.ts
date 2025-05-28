import { Todo, TodoList } from "../types/todo";

export const getListById = (lists: TodoList[], id: number) => {
  return lists.find((list) => list.id === id);
};

export const getListNameById = (lists: TodoList[], id: number) => {
  return lists.find((list) => list.id === id)?.name;
};

export const getListByName = (lists: TodoList[], name: string) => {
  return lists.find((list) => list.name === name);
};

export const getTodoById = (todos: Todo[], id: number) => {
  return todos.find((todo) => todo.id === id);
};

export const getTodoListIndexByName = (lists: TodoList[], id: number) => {
  return lists.findIndex((list) => list.id === id);
};

export const getTodoIndexById = (todos: Todo[], id: number) => {
  return todos.findIndex((todo) => todo.id === id);
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
  selectedListId: number,
  showCompleted: boolean
): Todo[] => {
  if (selectedListId === 2) {
    // Assuming 2 is the ID for 'Completed' list
    return lists
      .filter((list) => list && list.todos)
      .flatMap((list) => list.todos.filter((todo) => todo.completed));
  }
  if (selectedListId === 1) {
    // Assuming 1 is the ID for 'Home' list
    return lists
      .filter((list) => list && list.todos)
      .flatMap((list) => list.todos.filter((todo) => !todo.completed));
  }
  return (
    lists
      .find((list) => list && list.id === selectedListId)
      ?.todos?.filter((todo) => showCompleted || !todo.completed) ?? []
  );
};

// Calculates the count of todos for each list
export const calculateTodoCountByList = (
  lists: TodoList[]
): Record<number, number> => {
  return lists
    .filter((list) => list && list.todos)
    .reduce((acc, list) => {
      // Count completed todos for the Completed list (ID 2)
      const completedCount = list.todos.filter((todo) => todo.completed).length;
      acc[2] = (acc[2] || 0) + completedCount;

      // Count incomplete todos for the Home list (ID 1)
      const incompleteCount = list.todos.filter(
        (todo) => !todo.completed
      ).length;
      acc[1] = (acc[1] || 0) + incompleteCount;

      // For other lists, count based on list's showCompleted property
      if (list.id !== 1 && list.id !== 2) {
        acc[list.id] = list.showCompleted
          ? list.todos.length // Count all if showCompleted is true
          : list.todos.filter((todo) => !todo.completed).length; // Only count incomplete if showCompleted is false
      }

      return acc;
    }, {} as Record<number, number>);
};
