import React from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTodoStore } from "../store/todoStore";

const TodoForm: React.FC = () => {
  const { newTodo, setNewTodo, addTodoFromForm } = useTodoStore();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setNewTodo("");
    }
  };

  const handleClear = () => {
    setNewTodo("");
  };

  return (
    <form onSubmit={addTodoFromForm} className="mb-6 sm:mb-8">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full py-2 px-4 pr-10 text-base sm:text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Add a new todo..."
          />
          {newTodo && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Clear input"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="h-10 px-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-center gap-2 text-base sm:text-sm font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          Add
        </button>
      </div>
    </form>
  );
};

export default TodoForm;