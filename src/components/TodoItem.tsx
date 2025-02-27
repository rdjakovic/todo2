import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  CheckIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Todo } from "../types/todo";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onEdit: (id: number, newText: string) => Promise<void>;
  onEditStart: (id: number, text: string) => void;
  onEditCancel: (id: number) => void;
  onEditChange: (id: number, newText: string) => void;
}

export function TodoItem({
  todo,
  onToggle,
  onDelete,
  onEdit,
  onEditStart,
  onEditCancel,
  onEditChange,
}: TodoItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1],
      }}
      className="mb-2"
    >
      <div
        className={clsx(
          "py-2 px-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3", // Changed padding and gap
          todo.completed && "bg-gray-50 dark:bg-gray-900"
        )}
      >
        <button
          onClick={() => onToggle(todo.id)}
          className={clsx(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center", // Changed from w-6 h-6
            todo.completed
              ? "border-green-500 bg-green-500"
              : "border-gray-300 dark:border-gray-500"
          )}
        >
          {todo.completed && <CheckIcon className="w-3 h-3 text-white" />}{" "}
          {/* Changed from w-4 h-4 */}
        </button>

        <div className="flex-1">
          {todo.isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={todo.editText}
                onChange={(e) => onEditChange(todo.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && todo.editText?.trim()) {
                    onEdit(todo.id, todo.editText);
                  } else if (e.key === "Escape") {
                    onEditCancel(todo.id);
                  }
                }}
                className="flex-1 px-2 py-1 rounded border dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm" // Adjusted padding and added text-sm
                placeholder="Edit todo"
                title="Edit todo text"
                autoFocus
              />
              <button
                onClick={() => {
                  if (todo.editText?.trim()) {
                    onEdit(todo.id, todo.editText);
                  }
                }}
                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg"
                title="Save"
              >
                <CheckIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => onEditCancel(todo.id)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Cancel"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <p
                className={clsx(
                  "text-sm text-gray-800 dark:text-gray-100", // Added text-sm
                  todo.completed &&
                    "line-through text-gray-500 dark:text-gray-400"
                )}
              >
                {todo.text}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {" "}
                {/* Changed from text-sm */}
                {format(new Date(todo.date), "MMM d, yyyy - HH:mm")}
              </p>
            </>
          )}
        </div>

        {!todo.isEditing && (
          <div className="flex gap-1">
            {" "}
            {/* Added gap-1 */}
            {!todo.completed && (
              <button
                onClick={() => onEditStart(todo.id, todo.text)}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900" // Changed from p-2
                title="Edit todo"
              >
                <PencilIcon className="w-4 h-4" /> {/* Changed from w-5 h-5 */}
              </button>
            )}
            <button
              onClick={() => onDelete(todo.id)}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900" // Changed from p-2
              title="Delete todo"
            >
              <TrashIcon className="w-4 h-4" /> {/* Changed from w-5 h-5 */}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
