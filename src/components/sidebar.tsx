import { useState } from "react";
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
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { TodoList } from "../types/todo";

interface SidebarProps {
  lists: TodoList[];
  selectedList: string;
  onSelectList: (listId: string) => void;
  onCreateList: (name: string) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
  onSelectSettings: () => void;
  todoCountByList: Record<string, number>;
}

export function Sidebar({
  lists,
  selectedList,
  onSelectList,
  onCreateList,
  onDeleteList,
  onSelectSettings,
  todoCountByList,
}: SidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");

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

  return (
    <div className="w-64 bg-white dark:bg-gray-800 h-screen p-4 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="flex-1 space-y-2">
        {lists.map((list) => (
          <div key={list.id} className="flex items-center justify-between">
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
            <button
              onClick={() => onDeleteList(list.id)}
              className="ml-2 p-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900"
              title="Delete list"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
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

      <button
        onClick={onSelectSettings}
        className="mt-4 w-full flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        title="Settings"
      >
        <Cog6ToothIcon className="w-5 h-5" />
        <span>Settings</span>
      </button>
    </div>
  );
}
