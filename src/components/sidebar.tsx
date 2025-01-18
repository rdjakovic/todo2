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
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
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

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        // md breakpoint
        onToggle();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [onToggle]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX;
        if (newWidth >= 200 && newWidth <= 600) {
          onWidthChange(newWidth);
        }
      }
    },
    [isResizing, onWidthChange]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

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
          isOpen ? "md:hidden" : "block"
        )}
        title="Toggle sidebar"
      >
        <Bars3Icon className="w-6 h-6 text-gray-600 dark:text-gray-200" />
      </button>

      {/* Overlay for mobile when sidebar is open */}
      {isOpen && window.innerWidth < 768 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 bg-white dark:bg-gray-800 h-screen border-r border-gray-200 dark:border-gray-700 flex flex-col z-50 transition-transform duration-300",
          !isOpen && "-translate-x-full"
        )}
        style={{ width: width + "px" }}
      >
        <div className="p-4 flex-1 space-y-2 overflow-y-auto">
          {lists.map((list) => (
            <div key={list.id} className="flex items-center justify-between">
              {editingListId === list.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
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
                <>
                  <button
                    onClick={() => onSelectList(list.id)}
                    className={clsx(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg",
                      selectedList === list.id
                        ? "bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {getIconForList(list.icon)}
                      <span>{list.name}</span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {todoCountByList[list.id] || 0}
                    </span>
                  </button>
                  <div className="flex">
                    {list.id !== "home" && list.id !== "completed" && (
                      <button
                        onClick={() => handleEditList(list.id)}
                        className="ml-2 p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900"
                        title="Edit list"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteList(list.id)}
                      className="ml-2 p-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900"
                      title="Delete list"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {isCreating ? (
          <div className="mt-4 space-y-2">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name"
              className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateList}
                className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800"
              >
                Create
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="px-3 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200"
                title="Cancel"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="mt-4 w-full flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <PlusIcon className="w-5 h-5" />
            Create new list
          </button>
        )}

        {/* Settings and collapse button row */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={onSelectSettings}
            className="flex-1 flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="Settings"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            <span>Settings</span>
          </button>

          <button
            onClick={onToggle}
            className="p-2 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg hidden md:block"
            title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isOpen ? (
              <ChevronLeftIcon className="w-5 h-5" />
            ) : (
              <ChevronRightIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Resize handle - only show on desktop */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-purple-500 transition-colors hidden md:block"
          onMouseDown={startResizing}
        />
      </div>
    </>
  );
}
