import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  CheckIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { forwardRef } from "react";
import { Todo } from "../types/todo";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onEdit: (id: number, newText: string) => Promise<void>;
  onEditStart?: (id: number, text: string) => void;
  onEditCancel?: (id: number) => void;
  onEditChange?: (id: number, newText: string) => void;
  isDragging?: boolean;
}

const MotionDiv = motion.div;

export const TodoItem = forwardRef<HTMLDivElement, TodoItemProps>(
  (
    {
      todo,
      onToggle,
      onDelete,
      onEdit,
      onEditStart = () => {},
      onEditCancel = () => {},
      onEditChange = () => {},
      isDragging,
    },
    ref
  ) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition: sortableTransition,
      isDragging: isSortableDragging,
    } = useSortable({
      id: todo.id,
      data: todo,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition: sortableTransition,
    };

    return (
      <MotionDiv
        ref={(node) => {
          setNodeRef(node);
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        style={style}
        className="mb-2"
        {...attributes}
        {...listeners}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
          mass: 1,
        }}
        layout
      >
        <div
          className={clsx(
            "py-2 px-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 cursor-move",
            todo.completed && "bg-gray-50 dark:bg-gray-900",
            (isDragging || isSortableDragging) && "opacity-50"
          )}
        >
          <button
            onClick={() => onToggle(todo.id)}
            className={clsx(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center",
              todo.completed
                ? "border-green-500 bg-green-500"
                : "border-gray-300 dark:border-gray-500"
            )}
          >
            {todo.completed && <CheckIcon className="w-3 h-3 text-white" />}
          </button>

          <div className="flex-1">
            {todo.isEditing ? (
              <div className="flex gap-2">
                <textarea
                  value={todo.editText}
                  onChange={(e) => onEditChange(todo.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      todo.editText?.trim()
                    ) {
                      e.preventDefault();
                      onEdit(todo.id, todo.editText);
                    } else if (e.key === "Enter" && e.shiftKey) {
                      return;
                    } else if (e.key === "Escape") {
                      onEditCancel(todo.id);
                    }
                  }}
                  className="flex-1 px-2 py-1 rounded border dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm resize-none"
                  placeholder="Edit todo"
                  title="Edit todo text"
                  autoFocus
                  rows={3}
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
                    "text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap",
                    todo.completed &&
                      "line-through text-gray-500 dark:text-gray-400"
                  )}
                >
                  {todo.text}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {format(new Date(todo.date), "MMM d, yyyy - HH:mm")}
                </p>
              </>
            )}
          </div>

          {!todo.isEditing && (
            <div className="flex gap-1">
              {!todo.completed && (
                <button
                  onClick={() => onEditStart(todo.id, todo.text)}
                  className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900"
                  title="Edit todo"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => onDelete(todo.id)}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900"
                title="Delete todo"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </MotionDiv>
    );
  }
);
