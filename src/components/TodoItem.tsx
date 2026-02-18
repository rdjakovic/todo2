import { motion } from "framer-motion";
import { CheckIcon, PencilIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { isValidNativeDate, formatNativeDate, formatMobileDate } from "../utils/helper";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { forwardRef, useState } from "react";
import { Todo } from "../types/todo";
import TiptapRenderer from "./TiptapRenderer";
import { hasVisibleContent } from "../lib/content";
import { useMediaQuery } from "../hooks/useMediaQuery";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenEditDialog: (todo: Todo, viewMode?: boolean) => void;
  isDragging?: boolean;
}

const MotionDiv = motion.div;

// Helper function to get priority colors
const getPriorityColors = (completed?: boolean) => {
  // Return consistent background and border colors regardless of priority
  return completed
    ? "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700"
    : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700";
};

// Helper function to get priority badge colors
const getPriorityBadgeColors = (priority?: "low" | "medium" | "high") => {
  switch (priority) {
    case "high":
      return "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300";
    case "medium":
      return "bg-yellow-100 dark:bg-yellow-800/50 text-yellow-700 dark:text-yellow-400";
    case "low":
      return "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300";
    default:
      return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
  }
};
const TodoItem = forwardRef<HTMLDivElement, TodoItemProps>(
  ({ todo, onToggle, onDelete, onOpenEditDialog, isDragging }, ref) => {
    const [showNotes, setShowNotes] = useState(false);
    const isMobile = useMediaQuery("(max-width: 639px)"); // sm breakpoint

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
            "py-3 sm:py-2 px-4 sm:px-3 rounded-lg shadow-sm border flex items-center gap-3",
            getPriorityColors(todo.completed),
            (isDragging || isSortableDragging) && "opacity-50 cursor-grabbing",
            !isDragging && !isSortableDragging && "cursor-grab"
          )}
        >
          <button
            onClick={() => onToggle(todo.id)}
            className={clsx(
              "w-6 h-6 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
              todo.completed
                ? "border-green-500 bg-green-500"
                : "border-gray-300 dark:border-gray-500"
            )}
          >
            {todo.completed && <CheckIcon className="w-4 h-4 sm:w-3 sm:h-3 text-white" />}
          </button>

          <div
            className="flex-1 cursor-pointer sm:cursor-auto"
            onClick={() => {
              // Only make clickable on mobile
              if (isMobile) {
                onOpenEditDialog(todo, true); // Open in view mode
              }
            }}
          >
            <>
              <p
                className={clsx(
                  "text-base sm:text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed",
                  todo.completed &&
                    "line-through text-gray-500 dark:text-gray-400"
                )}
              >
                <span className="inline">
                  {todo.title}
                  {hasVisibleContent(todo.notes) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowNotes(!showNotes);
                      }}
                      className="ml-2 inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      {showNotes ? (
                        <ChevronUpIcon className="w-3 h-3" />
                      ) : (
                        <ChevronDownIcon className="w-3 h-3" />
                      )}
                      {showNotes ? "Hide" : "Notes"}
                    </button>
                  )}
                </span>
              </p>

              {/* Notes section */}
              {hasVisibleContent(todo.notes) && showNotes && (
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-xs text-gray-600 dark:text-gray-300">
                  <TiptapRenderer content={todo.notes} className="rendered-notes" />
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-1">
                {/* First row: Date created and priority */}
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {/* Format date more compactly on mobile */}
                    {isValidNativeDate(todo.dateCreated)
                      ? isMobile
                        ? formatMobileDate(todo.dateCreated) // New compact format for mobile
                        : formatNativeDate(todo.dateCreated)
                      : "Invalid creation date"}
                  </p>
                  {todo.priority && (
                    <span className={clsx(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      getPriorityBadgeColors(todo.priority)
                    )}>
                      {todo.priority}
                    </span>
                  )}
                  {/* Due date - inline on desktop, hidden on mobile */}
                  {todo.dueDate && (
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300">
                      Due: {isValidNativeDate(todo.dueDate) ? formatNativeDate(todo.dueDate) : "Invalid date"}
                    </span>
                  )}
                </div>

                {/* Completion date - shows on right side on desktop */}
                {todo.completed && todo.dateOfCompletion && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-0">
                    Completed:{" "}
                    {isValidNativeDate(todo.dateOfCompletion)
                      ? isMobile
                        ? formatMobileDate(todo.dateOfCompletion) // New compact format for mobile
                        : formatNativeDate(todo.dateOfCompletion)
                      : "Invalid completion date"}
                  </p>
                )}
              </div>

              {/* Due date - separate row on mobile only */}
              {todo.dueDate && (
                <div className="sm:hidden mt-1">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300">
                    Due: {isValidNativeDate(todo.dueDate) ? formatNativeDate(todo.dueDate) : "Invalid date"}
                  </span>
                </div>
              )}
            </>
          </div>

          {/* Action buttons - Vertical on mobile, horizontal on desktop */}
          <div className="flex flex-col sm:flex-row gap-1 flex-shrink-0">
            {!todo.completed && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering the div click
                  onOpenEditDialog(todo, false); // Open in edit mode
                }}
                className="p-2 sm:p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900"
                title="Edit todo"
              >
                <PencilIcon className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering the div click
                onDelete(todo.id);
              }}
              className="p-2 sm:p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900"
              title="Delete todo"
            >
              <TrashIcon className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </MotionDiv>
    );
  }
);

export default TodoItem;
