import React from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useTodoStore } from "../store/todoStore";

const TodoForm: React.FC = () => {
  const { newTodo, setNewTodo, addTodoFromForm } = useTodoStore();
  return (
    <form onSubmit={addTodoFromForm} className="mb-8">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          className="flex-1 min-h-10 px-4 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Add a new todo..."
        />
        <button
          type="submit"
          className="h-10 px-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add
        </button>
      </div>
    </form>
  );
};

export default TodoForm;
