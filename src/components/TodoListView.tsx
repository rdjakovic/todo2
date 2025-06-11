import React from "react";
import { AnimatePresence } from "framer-motion";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

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
    toggleTodo,
    deleteTodo,
    editTodo,
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

  return (
    <>
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white">
                {currentList?.name || "Todos"}
              </h1>
              {canEditOrDelete && (
                <div className="flex gap-1">
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

            <div className="flex items-center gap-2 justify-between sm:justify-end">
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
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
              <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-6 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold mb-1">
                      {statistics.totalTasks}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Total Tasks
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold mb-1">
                      {statistics.completedTasks}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Completed
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold mb-1">
                      {statistics.highPriorityTasks}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      High Priority
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold mb-1">
                      {statistics.progress}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
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
              onDelete={(id) => deleteTodo(selectedListId, id)}
              onEdit={(id, title, notes, priority, dueDate) =>
                editTodo(selectedListId, id, {
                  title,
                  notes,
                  priority,
                  dueDate,
                })
              }
              onOpenEditDialog={openEditDialog}
            />
          </AnimatePresence>
        </div>
      </div>

      <ListEditDialog
        isOpen={isEditDialogOpen}
        list={currentList}
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