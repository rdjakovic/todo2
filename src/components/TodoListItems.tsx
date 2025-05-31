import { Suspense, lazy, forwardRef } from "react";
import { motion } from "framer-motion";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Todo } from "../types/todo";

// Lazy load TodoItem
const TodoItem = lazy(() => import("./TodoItem"));

interface TodoListItemsProps {
  filteredTodos: Todo[];
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
}

const TodoListItems = forwardRef<HTMLDivElement, TodoListItemsProps>(
  ({ filteredTodos, onToggle, onDelete, onEdit, onOpenEditDialog }, ref) => {
    if (filteredTodos.length === 0) {
      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="text-center text-gray-500 dark:text-gray-400 py-8"
        >
          No todos yet. Add one above!
        </motion.div>
      );
    }

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        layout
      >
        <SortableContext
          items={filteredTodos.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            <Suspense fallback={<div>Loading todos...</div>}>
              {filteredTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onOpenEditDialog={onOpenEditDialog}
                />
              ))}
            </Suspense>
          </div>
        </SortableContext>
      </motion.div>
    );
  }
);

// Define displayName for better debugging
TodoListItems.displayName = "TodoListItems";

export default TodoListItems;
