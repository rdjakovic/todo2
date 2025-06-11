import { useState, useEffect, useCallback } from "react";
import {
  PlusIcon,
  Cog6ToothIcon,
  Bars3Icon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { ListItem } from "./ListItem";
import CreateListDialog from "./CreateListDialog";
import { useAuthStore } from "../store/authStore";
import { useTodoStore } from "../store/todoStore";

export function Sidebar() {
  const { signOut } = useAuthStore();
  const {
    lists,
    selectedListId: selectedList,
    isSidebarOpen: isOpen,
    sidebarWidth: width,
    windowWidth,
    setSelectedListId: onSelectList,
    setSidebarWidth: onWidthChange,
    toggleSidebar: onToggle,
    createList: onCreateList,
    getTodoCountByList,
  } = useTodoStore();
  
  const todoCountByList = getTodoCountByList();
  const onSelectSettings = () => onSelectList("settings");
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

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
        const currentWidth = width;

        if (newWidth >= 200 && newWidth <= 600) {
          const listItems = document.querySelectorAll(".list-item-container");
          let hasOverflow = false;

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
              onToggle();
              setIsResizing(false);
              return;
            }
          }

          onWidthChange(newWidth);
        }
      }
    },
    [isResizing, onWidthChange, onToggle, width]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const handleCreateList = async (name: string, icon: string) => {
    await onCreateList(name, icon);
    setIsCreateDialogOpen(false);
  };

  return (
    <>
      <button
        onClick={onToggle}
        className={clsx(
          "fixed top-4 left-4 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 z-50",
          isOpen && windowWidth >= 1024 ? "hidden" : "block"
        )}
        title="Toggle sidebar"
      >
        <Bars3Icon className="w-6 h-6 text-gray-600 dark:text-gray-200" />
      </button>

      {isOpen && windowWidth < 1024 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onToggle}
        />
      )}

      <div
        role="navigation"
        className={clsx(
          "h-screen border-r border-gray-200 dark:border-gray-700 flex flex-col z-50 transition-transform duration-300 bg-white dark:bg-gray-800",
          windowWidth >= 1024
            ? "lg:fixed inset-y-0 left-0"
            : "fixed inset-y-0 left-0",
          !isOpen && "-translate-x-full"
        )}
        style={{ width: width + "px" }}
      >
        <div className="p-4 flex-1 space-y-2 overflow-y-auto">
          {lists.map((list) => (
            <ListItem
              key={list.id}
              list={list}
              onSelect={() => onSelectList(list.id)}
              selected={selectedList === list.id}
              todoCount={todoCountByList[list.id] || 0}
            />
          ))}

          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2 px-3 py-2 w-full rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-100"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Create new list</span>
          </button>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onSelectSettings}
            className="p-4 flex items-center gap-2 w-full hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-100"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            <span>Settings</span>
          </button>
          <button
            onClick={signOut}
            className="p-4 flex items-center gap-2 w-full hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>

        {windowWidth >= 1024 && (
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-500 transition-colors"
            onMouseDown={startResizing}
          />
        )}
      </div>

      <CreateListDialog
        isOpen={isCreateDialogOpen}
        onSave={handleCreateList}
        onCancel={() => setIsCreateDialogOpen(false)}
      />
    </>
  );
}
