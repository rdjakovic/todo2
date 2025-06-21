import { Suspense, lazy, forwardRef } from "react";
import { motion } from "framer-motion";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDndContext } from "@dnd-kit/core";
import { Todo } from "../types/todo";

// Lazy load TodoItem
const TodoItem = lazy(() => import("./TodoItem"));

// Simple drop indicator that shows when hovering over a todo during drag
const DropIndicator = ({ todoId, position, allTodos }: {
  todoId: string;
  position: 'before' | 'after';
  allTodos: Todo[];
}) => {
  const { active, over } = useDndContext();

  // Only show during active drag operations
  if (!active || !over) return null;

  // Don't show indicator if dragging the same item
  if (active.id === todoId) return null;

  // Only show if hovering over this specific todo
  const shouldShow = over.id === todoId;

  if (!shouldShow) return null;

  // Determine which indicator to show based on drag direction
  const activeIndex = allTodos.findIndex(t => t.id === active.id);
  const targetIndex = allTodos.findIndex(t => t.id === todoId);

  let shouldShowIndicator = false;

  if (position === 'before') {
    // Show "before" indicator when:
    // 1. Dragging from below (activeIndex > targetIndex) - item will go above target
    shouldShowIndicator = activeIndex > targetIndex;
  } else if (position === 'after') {
    // Show "after" indicator when:
    // 1. Dragging from above (activeIndex < targetIndex) - item will go below target
    // 2. OR when this is the last item and we're dragging down to the end
    shouldShowIndicator = activeIndex < targetIndex;
  }

  console.log('🎯 Drop indicator check:', {
    todoId: todoId.slice(-8), // Show last 8 chars for readability
    position,
    activeIndex,
    targetIndex,
    shouldShowIndicator
  });

  if (!shouldShowIndicator) {
    return null;
  }

  return (
    <div className="relative h-1 my-1">
      <div className="absolute inset-0 bg-purple-500 rounded-full shadow-lg animate-pulse" />
      <div className="absolute -left-2 -right-2 h-1 bg-purple-400 rounded-full opacity-50" />
    </div>
  );
};

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