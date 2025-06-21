import { useDndContext } from "@dnd-kit/core";
import { Todo } from "../types/todo";

interface DropIndicatorProps {
  todoId: string;
  position: 'before' | 'after';
  allTodos: Todo[];
}

// Drop indicator component that shows visual feedback during drag operations
const DropIndicator = ({ todoId, position, allTodos }: DropIndicatorProps) => {
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
    // Dragging from below (activeIndex > targetIndex) - item will go above target
    shouldShowIndicator = activeIndex > targetIndex;
  } else if (position === 'after') {
    // Show "after" indicator when:
    // Dragging from above (activeIndex < targetIndex) - item will go below target
    shouldShowIndicator = activeIndex < targetIndex;
  }
  
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

export default DropIndicator;
