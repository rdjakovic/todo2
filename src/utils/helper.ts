import { CollisionDetection, rectIntersection, closestCorners } from "@dnd-kit/core";
import { TodoList } from "../types/todo";

export const getListById = (lists: TodoList[], id: string) => {
  return lists.find((list) => list.id === id);
};

// Helper function for native date validation
export const isValidNativeDate = (d: Date | undefined | null): d is Date =>
  d instanceof Date && !isNaN(d.getTime());

// Helper function for native date formatting
export const formatNativeDate = (date: Date): string => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${month} ${day}, ${year} - ${hours}:${minutes}`;
};

// Helper function for compact mobile date formatting
export const formatMobileDate = (date: Date): string => {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();

  // Only show hours and minutes
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  // Format: "Jun 21 - 23:51" (more compact)
  return `${month} ${day} - ${hours}:${minutes}`;
};

// Custom collision detection that prioritizes sidebar lists over todo items
export const customCollisionDetection: CollisionDetection = (args) => {
  // Use rectangle intersection - works better for both directions than corners
  const rectCollisions = rectIntersection(args);

  if (rectCollisions.length > 0) {
    // Filter to prioritize sidebar lists (shorter width = sidebar items)
    const sidebarCollisions = rectCollisions.filter((collision) => {
      const container = args.droppableContainers.find(
        (c) => c.id === collision.id
      );
            return (
              container &&
              container.rect.current &&
              container.rect.current.width < 300 // Sidebar items are narrower
            );
          });

          if (sidebarCollisions.length > 0) {
            return sidebarCollisions;
          }
          return rectCollisions;
        }

        // Fallback to closestCorners if no rectCollisions
        return closestCorners(args);
      };
