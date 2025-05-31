import React from "react";
import { AnimatePresence } from "framer-motion";
import { Todo, TodoList } from "../types/todo";
import TodoForm from "./TodoForm";
import TodoListItems from "./TodoListItems";
import { getListById } from "../utils/helper";
import clsx from "clsx";

interface TodoListViewProps {
  selectedList: number;
  filteredTodos: Todo[];
  lists: TodoList[];
  setLists: React.Dispatch<React.SetStateAction<TodoList[]>>;
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
  addTodo: (e: React.FormEvent) => Promise<void>;
  newTodo: string;
  setNewTodo: (value: string) => void;
  error: string | null;
}

const TodoListView: React.FC<TodoListViewProps> = ({
  selectedList,
  filteredTodos,
  lists,
  setLists,
  toggleTodo,
  deleteTodo,
  editTodo,
  handleOpenEditDialog,
  addTodo,
  newTodo,
  setNewTodo,
  error,
}) => {
  const currentList = getListById(lists, selectedList);

  const handleToggleShowCompleted = () => {
    if (currentList) {
      const updatedLists = lists.map((list) =>
        list.id === selectedList
          ? { ...list, showCompleted: !list.showCompleted }
          : list
      );
      saveLists(updatedLists);
    }
  };

  return (
    <div className="flex-1 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
            {lists.find((list) => list.id === selectedList)?.name || "Todos"}
          </h1>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300 text-right">
              {currentList?.showCompleted ? "Show Completed" : "Hide Completed"}
            </span>
            <button
              onClick={handleToggleShowCompleted}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
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

          {/* <button onClick={handleToggleShowCompleted}>
            {currentList?.showCompleted ? "Hide Completed" : "Show Completed"}
          </button> */}
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
