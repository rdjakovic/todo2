import React from "react";
import { AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Todo, TodoList } from "../types/todo";
import TodoForm from "./TodoForm";
import TodoListItems from "./TodoListItems";

interface TodoListViewProps {
  lists: TodoList[];
  selectedList: string;
  hideCompleted: boolean;
  handleHideCompletedToggle: () => Promise<void>;
  error: string | null;
  addTodo: (e: React.FormEvent) => Promise<void>;
  newTodo: string;
  setNewTodo: (value: string) => void;
  filteredTodos: Todo[];
  toggleTodo: (id: number) => Promise<void>;
  deleteTodo: (id: number) => Promise<void>;
  editTodo: (
    id: number,
    newText: string,
    newNotes?: string,
    newPriority?: "low" | "medium" | "high",
    newDueDate?: Date
  ) => Promise<void>;
  handleOpenEditDialog: (todo: Todo) => void;
}

const TodoListView: React.FC<TodoListViewProps> = ({
  lists,
  selectedList,
  hideCompleted,
  handleHideCompletedToggle,
  error,
  addTodo,
  newTodo,
  setNewTodo,
  filteredTodos,
  toggleTodo,
  deleteTodo,
  editTodo,
  handleOpenEditDialog,
}) => {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
            {lists.find((list) => list.id === selectedList)?.name || "Todos"}
          </h1>

          {selectedList !== "completed" && selectedList !== "home" && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300 text-right">
                {hideCompleted ? "Show completed" : "Hide completed"}
              </span>
              <button
                onClick={handleHideCompletedToggle}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                role="switch"
                aria-checked={hideCompleted}
                aria-label="Toggle completed todos visibility"
              >
                <span
                  className={clsx(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    hideCompleted ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-200">
            {error}
          </div>
        )}

        <TodoForm newTodo={newTodo} setNewTodo={setNewTodo} addTodo={addTodo} />

        <AnimatePresence mode="popLayout">
          <TodoListItems
            filteredTodos={filteredTodos}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
            onEdit={editTodo}
            onOpenEditDialog={handleOpenEditDialog}
          />
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TodoListView;
