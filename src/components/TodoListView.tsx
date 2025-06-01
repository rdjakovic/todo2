import React from "react";
import { AnimatePresence } from "framer-motion";

import TodoForm from "./TodoForm";
import TodoListItems from "./TodoListItems";
import { getListById } from "../utils/helper";
import clsx from "clsx";
import { useTodoStore } from "../store/todoStore";

const TodoListView: React.FC = () => {
  const {
    lists,
    selectedListId,
    error,
    toggleTodo,
    deleteTodo,
    editTodo,
    saveLists,
    setLists,
    getFilteredTodos,
    openEditDialog,
  } = useTodoStore();
  const currentList = getListById(lists, selectedListId);

  const handleToggleShowCompleted = () => {
    if (currentList) {
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

  return (
    <div className="flex-1 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
            {lists.find((list) => list.id === selectedListId)?.name || "Todos"}
          </h1>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300 text-right">
              {currentList?.showCompleted ? "Showing All" : "Hiding Completed"}
            </span>
            <button
              onClick={handleToggleShowCompleted}
              className={clsx(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500",
                currentList?.showCompleted 
                  ? "bg-green-500 dark:bg-green-600" 
                  : "bg-gray-200 dark:bg-gray-700"
              )}
              role="switch"
              aria-checked={currentList?.showCompleted}
              aria-label="Toggle completed todos visibility"
            >
              <span
                className={clsx(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  currentList?.showCompleted ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-200">
            {error}
          </div>
        )}

        <TodoForm />

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
  );
};

export default TodoListView;