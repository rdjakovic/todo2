import { useState, useEffect, useCallback } from "react";
import {
  HomeIcon,
  CheckCircleIcon,
  BriefcaseIcon,
  UserIcon,
  BookOpenIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  Cog6ToothIcon,
  PencilIcon,
  CheckIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import { TodoList } from "../types/todo";

interface SidebarProps {
  lists: TodoList[];
  selectedList: string;
  onSelectList: (listId: string) => void;
  onCreateList: (name: string) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
  onEditList: (id: string, name: string) => Promise<void>;
  onSelectSettings: () => void;
  todoCountByList: Record<string, number>;
  isOpen: boolean;
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
}

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

function ListItem({
  list,
  onSelect,
  selected,
  onEdit,
  onDelete,
  todoCount,
}: {
  list: TodoList;
  onSelect: () => void;
  selected: boolean;
  onEdit: () => void;
  onDelete: () => void;
  todoCount: number;
}) {
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
            "flex items-center gap-2 px-3 py-2 w-full rounded-lg transition-colors",
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
        {list.id !== "home" && list.id !== "completed" && (
          <div className="absolute right-2 hidden group-hover:flex gap-1">
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900"
              title="Edit list"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
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

export function Sidebar({
  lists,
  selectedList,
  onSelectList,
  onCreateList,
  onDeleteList,
  onEditList,
  onSelectSettings,
  todoCountByList,
  isOpen,
  onToggle,
  width,
  onWidthChange,
}: SidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isResizing, setIsResizing] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX;
        const currentWidth = width; // Use current width to determine direction

        if (newWidth >= 200 && newWidth <= 600) {
          const listItems = document.querySelectorAll(".list-item-container");
          let hasOverflow = false;

          // Only check for overflow if we're shrinking the sidebar
          if (newWidth < currentWidth) {
            listItems.forEach((item) => {
              const containerWidth = newWidth - 32;
              if (
                item.clientWidth === containerWidth &&
                item.scrollWidth > containerWidth
              ) {
                hasOverflow = true;
              }
            });

            if (hasOverflow) {
              onToggle(); // Close sidebar
              setIsResizing(false);
              return;
            }
          }

          onWidthChange(newWidth);
        }
      }
    },
    [isResizing, onWidthChange, onToggle, width] // Added width to dependencies
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const handleCreateList = () => {
    if (newListName.trim()) {
      onCreateList(newListName);
      setNewListName("");
      setIsCreating(false);
    }
  };

  const handleEditList = (id: string) => {
    if (id === "home" || id === "completed") {
      return; // Don't allow editing default lists
    }
    const list = lists.find((l) => l.id === id);
    if (list) {
      setEditingListId(id);
      setEditingName(list.name);
    }
  };

  const handleSaveEdit = async () => {
    if (editingListId && editingName.trim()) {
      await onEditList(editingListId, editingName.trim());
      setEditingListId(null);
      setEditingName("");
    }
  };

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={onToggle}
        className={clsx(
          "fixed top-4 left-4 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 z-50",
          isOpen && windowWidth >= 768 ? "hidden" : "block"
        )}
        title="Toggle sidebar"
      >
        <Bars3Icon className="w-6 h-6 text-gray-600 dark:text-gray-200" />
      </button>

      {/* Overlay for mobile when sidebar is open */}
      {isOpen && windowWidth < 768 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        role="navigation"
        className={clsx(
          "h-screen border-r border-gray-200 dark:border-gray-700 flex flex-col z-50 transition-transform duration-300 bg-white dark:bg-gray-800",
          windowWidth >= 768
            ? "md:fixed inset-y-0 left-0"
            : "fixed inset-y-0 left-0",
          !isOpen && "-translate-x-full"
        )}
        style={{ width: width + "px" }}
      >
        <div className="p-4 flex-1 space-y-2 overflow-y-auto">
          {lists.map((list) =>
            editingListId === list.id ? (
              <div key={list.id} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="flex-1 w-0 min-w-0 px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  placeholder="Enter list name"
                  title="Edit list name"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveEdit();
                    } else if (e.key === "Escape") {
                      setEditingListId(null);
                    }
                  }}
                />
                <button
                  onClick={handleSaveEdit}
                  className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg"
                  title="Save"
                >
                  <CheckIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setEditingListId(null)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title="Cancel"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <ListItem
                key={list.id}
                list={list}
                onSelect={() => onSelectList(list.id)}
                selected={selectedList === list.id}
                onEdit={() => handleEditList(list.id)}
                onDelete={() => onDeleteList(list.id)}
                todoCount={todoCountByList[list.id] || 0}
              />
            )
          )}

          {/* Create new list button */}
          {isCreating ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="flex-1 px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                placeholder="Enter list name"
                title="New list name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateList();
                  } else if (e.key === "Escape") {
                    setIsCreating(false);
                    setNewListName("");
                  }
                }}
              />
              <button
                onClick={handleCreateList}
                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg"
                title="Save"
              >
                <CheckIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewListName("");
                }}
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Cancel"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-3 py-2 w-full rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-100"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Create new list</span>
            </button>
          )}
        </div>

        {/* Settings button */}
        <button
          onClick={onSelectSettings}
          className="p-4 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700"
        >
          <Cog6ToothIcon className="w-5 h-5" />
          <span>Settings</span>
        </button>

        {/* Resize handle */}
        {windowWidth >= 768 && (
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-500 transition-colors"
            onMouseDown={startResizing}
          />
        )}
      </div>
    </>
  );
}
