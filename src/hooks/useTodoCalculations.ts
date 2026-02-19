import { useMemo } from 'react';
import { Todo, TodoList, FilterOptions, SortOption, SortDirection } from '../types/todo';
import { filterTodosBySearch, sortTodos } from '../store/todoStore';
import { hasVisibleContent } from '../lib/content';

interface UseTodoCalculationsProps {
  todos: Todo[];
  lists: TodoList[];
  selectedListId: string;
  searchQuery: string;
  activeFilters: FilterOptions;
  effectiveSort: { sort: SortOption; direction: SortDirection };
}

export const useTodoCalculations = ({
  todos,
  lists,
  selectedListId,
  searchQuery,
  activeFilters,
  effectiveSort,
}: UseTodoCalculationsProps) => {

  const currentList = useMemo(() => 
    lists.find((list) => list.id === selectedListId), 
    [lists, selectedListId]
  );
  
  const statistics = useMemo(() => {
    // Statistics are calculated based on GLOBAL todos, used for the "All" list view
    const totalTasks = todos.length;
    const completedTasks = todos.filter(todo => todo.completed).length;
    const highPriorityTasks = todos.filter(todo => todo.priority === "high" && !todo.completed).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      highPriorityTasks,
      progress
    };
  }, [todos]);

  // Apply filters to todos
  const applyFilters = (todosToFilter: Todo[], filters: FilterOptions): Todo[] => {
    return todosToFilter.filter(todo => {
      // Filter by completion status
      if (!filters.showCompleted && todo.completed) {
        return false;
      }

      // Filter by priority
      const anyPrioritySelected = Object.values(filters.priorities).some(Boolean);
      if (anyPrioritySelected && todo.priority) {
        if (!filters.priorities[todo.priority]) {
          return false;
        }
      }

      // Filter by due date
      if (filters.hasDueDate && !todo.dueDate) {
        return false;
      }

      // Filter by note
      if (filters.hasNote && !hasVisibleContent(todo.notes)) {
        return false;
      }

      return true;
    });
  };

  const { incompleteTodos, completedTodos } = useMemo(() => {
    if (!currentList) return { incompleteTodos: [], completedTodos: [] };

    let allTodos: Todo[] = [];

    // Special handling for "All" list
    if (currentList.name.toLowerCase() === "all") {
      allTodos = todos;
    }
    // Special handling for "Completed" list
    else if (currentList.name.toLowerCase() === "completed") {
      allTodos = todos.filter((todo) => todo.completed);
    }
    // For other lists, filter by listId
    else {
      allTodos = todos.filter((todo) => todo.listId === selectedListId);
    }

    // Apply search filter
    const searchFilteredTodos = filterTodosBySearch(allTodos, searchQuery);

    // Apply additional filters
    const filteredTodos = applyFilters(searchFilteredTodos, activeFilters);

    // Split and sort
    const incomplete = sortTodos(filteredTodos.filter(todo => !todo.completed), effectiveSort.sort, effectiveSort.direction);
    const completed = sortTodos(filteredTodos.filter(todo => todo.completed), effectiveSort.sort, effectiveSort.direction);

    return {
      incompleteTodos: incomplete,
      completedTodos: completed
    };
  }, [todos, currentList, selectedListId, searchQuery, activeFilters, effectiveSort.sort, effectiveSort.direction]);

  return {
    currentList,
    statistics,
    incompleteTodos,
    completedTodos
  };
};
