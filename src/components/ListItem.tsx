import {
  HomeIcon,
  CheckCircleIcon,
  BriefcaseIcon,
  UserIcon,
  BookOpenIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import { TodoList } from "../types/todo";

// Helper function moved here
const getIconForList = (icon: string) => {
  const props = { className: "w-5 h-5" };
  switch (icon) {
    case "home":
      return <HomeIcon {...props} />;
    case "check":
      return <CheckCircleIcon {...props} />;
    case "user":
      return <UserIcon {...props} />;
    case "briefcase":
      return <BriefcaseIcon {...props} />;
    case "book":
      return <BookOpenIcon {...props} />;
    default:
      return <HomeIcon {...props} />;
  }
};

// Define props interface for ListItem
interface ListItemProps {
  list: TodoList;
  onSelect: () => void;
  selected: boolean;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  todoCount: number;
}

export function ListItem({
  list,
  onSelect,
  selected,
  onEdit,
  onDelete,
  todoCount,
}: ListItemProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: list.id,
    data: list,
  });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "list-item-container relative group",
        isOver && "bg-purple-50 dark:bg-purple-900/50 rounded-lg"
      )}
    >
      <div className="flex items-center justify-between">
        <button
          onClick={onSelect}
          className={clsx(
            "flex items-center justify-between gap-2 px-3 py-2 w-full rounded-lg transition-colors", // Added justify-between
            selected
              ? "bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100"
              : "hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-100"
          )}
        >
          <div className="flex items-center gap-3">
            {getIconForList(list.icon)}
            <span>{list.name}</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {todoCount}
          </span>
        </button>
        {list.name !== "home" && list.name !== "completed" && (
          <div className="absolute right-2 hidden group-hover:flex gap-1">
            <button
              onClick={() => onEdit(list.id)}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900"
              title="Edit list"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(list.id)}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900"
              title="Delete list"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Add default export if needed, or keep named export
// export default ListItem; // Uncomment if default export is preferred
