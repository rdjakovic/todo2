import React from 'react';
import { PencilIcon, TrashIcon, MagnifyingGlassIcon, XMarkIcon, FunnelIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { TodoList } from "../types/todo";
import clsx from 'clsx';

interface TodoListHeaderProps {
  currentList?: TodoList;
  canEditOrDelete: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onEditList: () => void;
  onDeleteList: () => void;
  onFilterClick: () => void;
  onSortClick: () => void;
  hasActiveFilters: boolean;
}

const TodoListHeader: React.FC<TodoListHeaderProps> = ({
  currentList,
  canEditOrDelete,
  searchQuery,
  setSearchQuery,
  onEditList,
  onDeleteList,
  onFilterClick,
  onSortClick,
  hasActiveFilters
}) => {
  
  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClearSearch();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6 sm:mb-8 gap-4">
      {/* Title and List Management Section */}
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white break-words min-w-0 flex-1">
          {currentList?.name || "Todos"}
        </h1>
        
        {canEditOrDelete && (
          <div className="flex gap-1 flex-shrink-0 mt-1">
            <button
              onClick={onEditList}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900"
              title="Edit list"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onDeleteList}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900"
              title="Delete list"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Toolbar Section: Search & View Options */}
      <div className="flex items-center gap-3 w-full lg:w-auto">
        <div className="relative flex-1 lg:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 text-sm"
            placeholder="Search todos..."
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          )}
        </div>

        {/* View Buttons (Filter / Sort) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onFilterClick}
            className={clsx(
              "p-2 rounded-lg transition-colors",
              hasActiveFilters
                ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/50"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            )}
            title="Filter tasks"
          >
            <FunnelIcon className="w-5 h-5" />
          </button>

          {canEditOrDelete && (
            <button
              onClick={onSortClick}
              className={clsx(
                "p-2 rounded-lg transition-colors relative",
                currentList?.sortPreference
                  ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/50"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
              title={currentList?.sortPreference ? "Sort settings (customized)" : "Sort settings for this list"}
            >
              <Cog6ToothIcon className="w-5 h-5" />
              {currentList?.sortPreference && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-purple-600 rounded-full" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodoListHeader;
