import { motion } from "framer-motion";
import { CheckIcon, PencilIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { isValidNativeDate, formatNativeDate } from "../utils/helper";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { forwardRef, useState } from "react";
import { Todo } from "../types/todo";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (
    id: string,
    newText: string,
    newNotes?: string,
    newPriority?: "low" | "medium" | "high",
    newDueDate?: Date
  ) => Promise<void>;
  onOpenEditDialog: (todo: Todo) => void;
  isDragging?: boolean;
}

const MotionDiv = motion.div;

// Helper function to get priority colors
const getPriorityColors = (priority?: "low" | "medium" | "high", completed?: boolean) => {
  switch (priority) {
    case "high":
      return completed 
        ? "bg-red-50/50 dark:bg-red-950/20 border-red-100/50 dark:border-red-900/30"
        : "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50";
    case "medium":
      return completed
        ? "bg-yellow-50/50 dark:bg-yellow-900/20 border-yellow-100/50 dark:border-yellow-800/30"
        : "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-100 dark:border-yellow-800/50";
    case "low":
      return completed
        ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-100/50 dark:border-blue-900/30"
        : "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50";
    default:
      return completed
        ? "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700"
        : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700";
  }
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
  ({ todo, onToggle, onDelete, onEdit, onOpenEditDialog, isDragging }, ref) => {
    const [showNotes, setShowNotes] = useState(false);
    
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
            getPriorityColors(todo.priority, todo.completed),
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

          <div className="flex-1">
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
                  {todo.notes && todo.notes.trim() && (
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
              {todo.notes && todo.notes.trim() && showNotes && (
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {todo.notes}
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-1">
                <div className="flex items-center gap-2">
                <p className="text-xs sm:text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-0">
                  {/* Ensure todo.dateCreated is a Date object before formatting */}
                  {isValidNativeDate(todo.dateCreated)
                    ? formatNativeDate(todo.dateCreated)
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
                </div>
                {todo.completed && todo.dateOfCompletion && (
                  <p className="text-xs sm:text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-0">
                    Completed:{" "}
                    {isValidNativeDate(todo.dateOfCompletion)
                      ? formatNativeDate(todo.dateOfCompletion)
                      : "Invalid completion date"}
                  </p>
                )}
              </div>
            </>
          </div>

          {/* Action buttons - Edit button now opens dialog */}
          <div className="flex gap-1 flex-shrink-0">
            {!todo.completed && (
              <button
                onClick={() => onOpenEditDialog(todo)} // Changed onClick handler
                className="p-2 sm:p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900"
                title="Edit todo"
              >
                <PencilIcon className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            )}
            <button
              onClick={() => onDelete(todo.id)}
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
