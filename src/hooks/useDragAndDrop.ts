import { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useTodoStore } from "../store/todoStore";

/**
 * Custom hook for handling drag and drop functionality in the todo application.
 * Encapsulates all drag and drop logic including todo reordering and list movement.
 *
 * @returns Object containing drag event handlers for use with DndContext
 */
export const useDragAndDrop = () => {
  const {
    lists,
    todos,
    selectedListId,
    saveTodos,
    setTodos,
    setActiveDraggedTodo,
  } = useTodoStore();

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const draggedTodo = todos.find((todo) => todo.id === active.id);
    if (draggedTodo) {
      setActiveDraggedTodo(draggedTodo);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDraggedTodo(null);
    if (!over) return;

    const todoId = active.id;
    const sourceTodo = todos.find((t) => t.id === todoId);
    if (!sourceTodo) return;

    // Check if dropping on a list in sidebar
    const targetList = lists.find((list) => list.id === over.id);
    if (targetList) {
      // Prevent dropping onto "All" list
      if (targetList.name.toLowerCase() === "all") {
        return;
      }

      // Check if dragging from "All" list - only allow dropping to "Completed" list
      const sourceList = lists.find((list) => list.id === selectedListId);
      if (
        sourceList?.name.toLowerCase() === "all" &&
        targetList.name.toLowerCase() !== "completed"
      ) {
        return;
      }

      // Special handling for "Completed" list
      const isTargetCompleted = targetList.name.toLowerCase() === "completed";
      const isSourceCompleted = sourceTodo.completed;

      // Update todo with new list ID and completion status
      const updatedTodos = todos.map((todo) => {
        if (todo.id === todoId) {
          const updatedTodo = { ...todo, listId: targetList.id };

          // If dropping on "Completed" list, mark as completed
          if (isTargetCompleted && !isSourceCompleted) {
            updatedTodo.completed = true;
            updatedTodo.dateOfCompletion = new Date();
          }
          // If dragging from "Completed" list to another list, mark as not completed
          else if (!isTargetCompleted && isSourceCompleted) {
            updatedTodo.completed = false;
            updatedTodo.dateOfCompletion = undefined;
          }

          return updatedTodo;
        }
        return todo;
      });

      await saveTodos(updatedTodos);
      // After saving to backend, update local state directly
      setTodos(updatedTodos);
      return;
    }

    // Handle reordering within the same list
    if (active.id !== over.id) {
      // Find the global indices of the dragged item and drop target in the entire todos array
      const oldIndexGlobal = todos.findIndex((t) => t.id === active.id);
      const newIndexGlobal = todos.findIndex((t) => t.id === over.id);

      if (oldIndexGlobal !== -1 && newIndexGlobal !== -1) {
        // Directly reorder the entire todos array using the global indices
        const reorderedTodos = arrayMove(todos, oldIndexGlobal, newIndexGlobal);

        // Save the reordered todos to backend and update state
        await saveTodos(reorderedTodos);
        setTodos(reorderedTodos);
      }
    }
  };

  return {
    handleDragStart,
    handleDragEnd,
  };
};
