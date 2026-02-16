import { Suspense, lazy, forwardRef } from "react";
import { motion } from "framer-motion";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Todo } from "../types/todo";
import DropIndicator from "./DropIndicator";

// Lazy load TodoItem
const TodoItem = lazy(() => import("./TodoItem"));



interface TodoListItemsProps {
  filteredTodos: Todo[];
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenEditDialog: (todo: Todo) => void;
}

const TodoListItems = forwardRef<HTMLDivElement, TodoListItemsProps>(
  ({ filteredTodos, onToggle, onDelete, onOpenEditDialog }, ref) => {
    if (filteredTodos.length === 0) {
      return (
        <motion.div
          ref={ref}
          className="text-center text-gray-500 dark:text-gray-400 py-8"
        >
          No todos yet. Add one above!
        </motion.div>
      );
    }

    return (
      <motion.div ref={ref} layout>
        <SortableContext
          items={filteredTodos.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            <Suspense fallback={<div>Loading todos...</div>}>
              {filteredTodos.map((todo) => {
                return (
                  <div key={todo.id}>
                    {/* Drop indicator before each item */}
                    <DropIndicator todoId={todo.id} position="before" allTodos={filteredTodos} />

                    {/* The todo item */}
                    <TodoItem
                      todo={todo}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onOpenEditDialog={onOpenEditDialog}
                    />

                    {/* Drop indicator after each item */}
                    <DropIndicator todoId={todo.id} position="after" allTodos={filteredTodos} />
                  </div>
                );
              })}
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