import React from "react";
import { AnimatePresence } from "framer-motion";
import { PencilIcon, TrashIcon, MagnifyingGlassIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon, FunnelIcon } from "@heroicons/react/24/outline";

import TodoForm from "./TodoForm";
import TodoListItems from "./TodoListItems";
import ListEditDialog from "./ListEditDialog";
import DeleteListDialog from "./DeleteListDialog";
import FilterDialog from "./FilterDialog";
import { getListById } from "../utils/helper";
import clsx from "clsx";
import { useTodoStore, sortTodos, filterTodosBySearch } from "../store/todoStore";
import { useState } from "react";
import { Todo } from "../types/todo";

interface FilterOptions {
  showCompleted: boolean;
  priorities: {
    low: boolean;
    medium: boolean;
    high: boolean;
  };
  hasDueDate: boolean;
}

const TodoListView: React.FC = () => {
  const {
    lists,
    todos,
    selectedListId,
    error,
    searchQuery,
    sortBy,
    setSearchQuery,
    toggleTodo,
    deleteTodo,
    editList,
    deleteList,
    openEditDialog,
  } = useTodoStore();

  const currentList = getListById(lists, selectedListId);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showCompletedSection, setShowCompletedSection] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({
    showCompleted: false,
    priorities: {
      low: false,
      medium: false,
      high: false,
    },
    hasDueDate: false,
  });

  const canEditOrDelete = currentList &&
    currentList.name !== "All" &&
    currentList.name !== "Completed";

  const isCompletedList = currentList?.name.toLowerCase() === "completed";
  const isAllList = currentList?.name.toLowerCase() === "all";

  // Calculate statistics for "All" list
  const getStatistics = () => {
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
  };

  const statistics = getStatistics();

  // Apply filters to todos
  const applyFilters = (todos: Todo[], filters: FilterOptions): Todo[] => {
    return todos.filter(todo => {
      // Filter by completion status
      if (!filters.showCompleted && todo.completed) {
        return false;
      }

      // Filter by priority (if any priority is selected)
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

      return true;
    });
  };

  // Get completed and incomplete todos separately
  const getCompletedAndIncompleteTodos = () => {
    const currentList = lists.find((list) => list.id === selectedListId);
    if (!currentList) return { incompleteTodos: [], completedTodos: [] };

    let allTodos: Todo[] = [];

    // Special handling for "All" list - show all todos from all lists
    if (currentList.name.toLowerCase() === "all") {
      allTodos = todos;
    }
    // Special handling for "Completed" list - show all completed todos from all lists
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

    // Separate completed and incomplete todos
    const incompleteTodos = filteredTodos.filter(todo => !todo.completed);
    const completedTodos = filteredTodos.filter(todo => todo.completed);

    return { incompleteTodos, completedTodos };
  };

  const { incompleteTodos, completedTodos } = getCompletedAndIncompleteTodos();

  const handleEditList = async (id: string, name: string, icon: string) => {
    await editList(id, name, icon);
    setIsEditDialogOpen(false);
  };

  const handleDeleteList = async () => {
    if (currentList) {
      await deleteList(currentList.id);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClearSearch();
    }
  };

  const handleApplyFilters = (filters: FilterOptions) => {
    setActiveFilters(filters);
  };

  // Check if any filters are active
  const hasActiveFilters = activeFilters.showCompleted ||
    Object.values(activeFilters.priorities).some(Boolean) ||
    activeFilters.hasDueDate;

  return (
    <>
      <div className="flex-1 p-2 sm:p-8">
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          {/* Header with List Name, Search, and Toggle */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 sm:mb-8 gap-4">
            {/* Left: List name and edit/delete buttons */}
            <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white truncate">
                {currentList?.name || "Todos"}
              </h1>
              {canEditOrDelete && (
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => setIsEditDialogOpen(true)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900"
                    title="Edit list"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900"
                    title="Delete list"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Middle: Search field */}
            <div className="w-full lg:flex-1 lg:max-w-md lg:mx-0">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 text-sm"
                  placeholder="Search todos..."
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                  </button>
                )}
              </div>
            </div>

            {/* Right: Filter icon */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsFilterDialogOpen(true)}
                className={clsx(
                  "p-2 rounded-lg transition-colors",
                  hasActiveFilters
                    ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/50"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
                title="Filter tasks"
              >
                <FunnelIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Statistics section - only show for "All" list */}
          {isAllList && (
            <div className="mb-6 sm:mb-8">
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                  {/* Total Tasks - Blue */}
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700/50">
                    <div className="text-2xl sm:text-3xl font-bold mb-1 text-blue-700 dark:text-blue-300">
                      {statistics.totalTasks}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      Total Tasks
                    </div>
                  </div>

                  {/* Completed - Green */}
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-700/50">
                    <div className="text-2xl sm:text-3xl font-bold mb-1 text-green-700 dark:text-green-300">
                      {statistics.completedTasks}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                      Completed
                    </div>
                  </div>

                  {/* High Priority - Red */}
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border border-red-200 dark:border-red-700/50">
                    <div className="text-2xl sm:text-3xl font-bold mb-1 text-red-700 dark:text-red-300">
                      {statistics.highPriorityTasks}
                    </div>
                    <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                      High Priority
                    </div>
                  </div>

                  {/* Progress - Purple */}
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-700/50">
                    <div className="text-2xl sm:text-3xl font-bold mb-1 text-purple-700 dark:text-purple-300">
                      {statistics.progress}%
                    </div>
                    <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                      Progress
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Only show TodoForm for regular lists, not for "All" or "Completed" */}
          {!isAllList && !isCompletedList && <TodoForm />}

          {/* Incomplete Todos */}
          {incompleteTodos.length > 0 && (
            <AnimatePresence mode="popLayout">
              <TodoListItems
                filteredTodos={sortTodos(incompleteTodos, sortBy)}
                onToggle={toggleTodo}
                onDelete={(id) => deleteTodo(id)}
                onOpenEditDialog={openEditDialog}
              />
            </AnimatePresence>
          )}

          {/* Completed Section */}
          {completedTodos.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setShowCompletedSection(!showCompletedSection)}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors mb-4"
              >
                {showCompletedSection ? (
                  <ChevronUpIcon className="w-4 h-4" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  Completed ({completedTodos.length})
                </span>
              </button>

              {showCompletedSection && (
                <AnimatePresence mode="popLayout">
                  <TodoListItems
                    filteredTodos={sortTodos(completedTodos, sortBy)}
                    onToggle={toggleTodo}
                    onDelete={(id) => deleteTodo(id)}
                    onOpenEditDialog={openEditDialog}
                  />
                </AnimatePresence>
              )}
            </div>
          )}

          {/* Show message when no todos exist */}
          {incompleteTodos.length === 0 && completedTodos.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              No todos yet. Add one above!
            </div>
          )}
        </div>
      </div>

      <ListEditDialog
        isOpen={isEditDialogOpen}
        list={currentList ?? null}
        onSave={handleEditList}
        onCancel={() => setIsEditDialogOpen(false)}
      />

      <DeleteListDialog
        isOpen={isDeleteDialogOpen}
        listName={currentList?.name || null}
        onConfirm={handleDeleteList}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      <FilterDialog
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        onApply={handleApplyFilters}
        currentFilters={activeFilters}
      />
    </>
  );
};

export default TodoListView;