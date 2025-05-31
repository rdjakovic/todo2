import { Todo, TodoList } from "../types/todo";

export const getListById = (lists: TodoList[], id: string) => {
  return lists.find((list) => list.id === id);
};

export const getListNameById = (lists: TodoList[], id: string) => {
  return lists.find((list) => list.id === id)?.name;
};

export const getListByName = (lists: TodoList[], name: string) => {
  return lists.find((list) => list.name === name);
};

export const getTodoById = (todos: Todo[], id: string) => {
  return todos.find((todo) => todo.id === id);
};

export const getTodoListIndexByName = (lists: TodoList[], id: string) => {
  return lists.findIndex((list) => list.id === id);
};

export const getTodoIndexById = (todos: Todo[], id: string) => {
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
  selectedListId: string,
  showCompleted?: boolean
): Todo[] => {
  const homeList = lists.find(list => list.name.toLowerCase() === 'home');
  const completedList = lists.find(list => list.name.toLowerCase() === 'completed');

  if (selectedListId === completedList?.id) {
    return lists
      .filter((list) => list && list.todos)
      .flatMap((list) => list.todos.filter((todo) => todo.completed));
  }
  if (selectedListId === homeList?.id) {
    return lists
      .filter((list) => list && list.todos)
      .flatMap((list) => list.todos.filter((todo) => !todo.completed));
  }
  
  const currentList = lists.find((list) => list && list.id === selectedListId);
  if (!currentList) return [];

  return (
    currentList.todos.filter((todo) => 
      currentList.showCompleted ? true : !todo.completed
    )
  );
};

// Calculates the count of todos for each list
export const calculateTodoCountByList = (
  lists: TodoList[]
): Record<string, number> => {
  const homeList = lists.find(list => list.name.toLowerCase() === 'home');
  const completedList = lists.find(list => list.name.toLowerCase() === 'completed');

  return lists
    .filter((list) => list && list.todos)
    .reduce((acc, list) => {
      // Count completed todos for the Completed list
      const completedCount = list.todos.filter((todo) => todo.completed).length;
      if (completedList) {
        acc[completedList.id] = (acc[completedList.id] || 0) + completedCount;
      }

      // Count incomplete todos for the Home list
      const incompleteCount = list.todos.filter(
        (todo) => !todo.completed
      ).length;
      if (homeList) {
        acc[homeList.id] = (acc[homeList.id] || 0) + incompleteCount;
      }

      // For other lists, count based on list's showCompleted property
      if (list.id !== homeList?.id && list.id !== completedList?.id) {
        acc[list.id] = list.showCompleted
          ? list.todos.length // Count all if showCompleted is true
          : list.todos.filter((todo) => !todo.completed).length; // Only count incomplete if showCompleted is false
      }

      return acc;
    }, {} as Record<string, number>);
};