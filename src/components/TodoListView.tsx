import React from "react";
import { AnimatePresence } from "framer-motion";
import { PencilIcon, TrashIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

import TodoForm from "./TodoForm";
import TodoListItems from "./TodoListItems";
import ListEditDialog from "./ListEditDialog";
import DeleteListDialog from "./DeleteListDialog";
import { getListById } from "../utils/helper";
import clsx from "clsx";
import { useTodoStore } from "../store/todoStore";
import { useState } from "react";

const TodoListView: React.FC = () => {
  const {
    lists,
    todos,
    selectedListId,
    error,
    searchQuery,
    setSearchQuery,
    toggleTodo,
    deleteTodo,
    editList,
    deleteList,
    saveLists,
    setLists,
    getFilteredTodos,
    openEditDialog,
  } = useTodoStore();
  
  const currentList = getListById(lists, selectedListId);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
  
  const handleToggleShowCompleted = () => {
    // Prevent toggling for "Completed" list
    if (isCompletedList) {
      return;
    }
    
    if (currentList) {
      // For "All" list, only update local state without saving to database
      if (isAllList) {
        const updatedList = {
          ...currentList,
          showCompleted: !currentList.showCompleted,
        };
        const newLists = lists.map((list) =>
          list.id === selectedListId ? updatedList : list
        );
        setLists(newLists);
        return;
      }
      
      // For regular lists, update state and save to database
      const updatedList = {
        ...currentList,
        showCompleted: !currentList.showCompleted,
      };
      const newLists = lists.map((list) =>
        list.id === selectedListId ? updatedList : list
      );
      setLists(newLists);
      saveLists([updatedList]); // Only save the changed list
    }
  };

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

            {/* Right: Toggle completed todos */}
            <div className="flex items-center gap-2 justify-between lg:justify-end flex-shrink-0">
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                {isCompletedList 
                  ? "All Completed Tasks" 
                  : currentList?.showCompleted 
                    ? "Showing All" 
                    : "Hiding Completed"
                }
              </span>
              <button
                onClick={handleToggleShowCompleted}
                disabled={isCompletedList}
                className={clsx(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                  !isCompletedList && "focus:ring-2 focus:ring-purple-500",
                  isCompletedList 
                    ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed opacity-50"
                    : currentList?.showCompleted 
                    ? "bg-green-500 dark:bg-green-600" 
                    : "bg-gray-200 dark:bg-gray-700"
                )}
                role="switch"
                aria-checked={isCompletedList ? true : currentList?.showCompleted}
                aria-label={isCompletedList ? "Completed list always shows all completed todos" : "Toggle completed todos visibility"}
              >
                <span
                  className={clsx(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    (isCompletedList || currentList?.showCompleted) ? "translate-x-6" : "translate-x-1"
                  )}
                />
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

          <AnimatePresence mode="popLayout">
            <TodoListItems
              filteredTodos={getFilteredTodos()}
              onToggle={toggleTodo}
              onDelete={(id) => deleteTodo(id)}
              onOpenEditDialog={openEditDialog}
            />
          </AnimatePresence>
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
    </>
  );
};

export default TodoListView;