import { motion } from "framer-motion";
import { format } from "date-fns";
import { CheckIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { forwardRef } from "react";
import { Todo } from "../types/todo";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onEdit: (id: number, newText: string) => Promise<void>; // This will be used by the dialog via App.tsx
  onOpenEditDialog: (todo: Todo) => void; // New prop to open the dialog
  isDragging?: boolean;
}

const MotionDiv = motion.div;

const TodoItem = forwardRef<HTMLDivElement, TodoItemProps>(
  (
    {
      todo,
      onToggle,
      onDelete,
      // onEdit is not directly called here anymore but passed up
      onOpenEditDialog,
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
            {/* Inline editing UI removed */}
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
                {format(new Date(todo.dateCreated), "MMM d, yyyy - HH:mm")}
              </p>
            </>
          </div>

          {/* Action buttons - Edit button now opens dialog */}
          <div className="flex gap-1">
            {!todo.completed && (
              <button
                onClick={() => onOpenEditDialog(todo)} // Changed onClick handler
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
          {/* Removed the erroneous closing parenthesis and brace */}
        </div>
      </MotionDiv>
    );
  }
);

export default TodoItem;
