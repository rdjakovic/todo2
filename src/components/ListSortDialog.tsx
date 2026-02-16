import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { SortOption, TodoList } from "../types/todo";

interface ListSortDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentList: TodoList;
  globalSort: SortOption;
  onSetSort: (listId: string, sortPreference: SortOption | null) => Promise<void>;
}

const sortOptions: { value: SortOption | "global"; label: string; description: string }[] = [
  {
    value: "global",
    label: "Use Global Default",
    description: "Follow the default sort setting from Settings page",
  },
  {
    value: "dateCreated",
    label: "Date Created",
    description: "Sort by creation date (newest first)",
  },
  {
    value: "priority",
    label: "Priority",
    description: "Sort by priority level (high to low)",
  },
  {
    value: "dateCompleted",
    label: "Date Completed",
    description: "Show completed items first, sorted by completion date",
  },
  {
    value: "completedFirst",
    label: "Completed First",
    description: "Show completed items at the top",
  },
  {
    value: "completedLast",
    label: "Completed Last",
    description: "Show completed items at the bottom",
  },
  {
    value: "dueDate",
    label: "Due Date",
    description: "Sort by due date (earliest first), then by creation date",
  },
  {
    value: "custom",
    label: "Custom Sort (Drag & Drop)",
    description: "Enable drag & drop reordering within lists",
  },
];

const ListSortDialog = ({
  isOpen,
  onClose,
  currentList,
  globalSort,
  onSetSort,
}: ListSortDialogProps) => {
  const [selectedSort, setSelectedSort] = useState<SortOption | "global">(
    currentList.sortPreference || "global"
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedSort(currentList.sortPreference || "global");
    }
  }, [isOpen, currentList.sortPreference]);

  if (!isOpen) {
    return null;
  }

  const handleApply = async () => {
    if (selectedSort === "global") {
      await onSetSort(currentList.id, null);
    } else {
      await onSetSort(currentList.id, selectedSort);
    }
    onClose();
  };

  const handleReset = () => {
    setSelectedSort("global");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  // Determine the effective sort being used
  const effectiveSort = currentList.sortPreference || globalSort;
  const isUsingGlobal = !currentList.sortPreference;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
      <div
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ease-in-out scale-100"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Sort Settings for {currentList.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isUsingGlobal ? (
                <>
                  Currently using global default:{" "}
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    {sortOptions.find((opt) => opt.value === globalSort)?.label}
                  </span>
                </>
              ) : (
                <>
                  Using list-specific sort:{" "}
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    {sortOptions.find((opt) => opt.value === effectiveSort)?.label}
                  </span>
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full flex-shrink-0"
            title="Close dialog"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
          {sortOptions.map((option) => (
            <label
              key={option.value}
              className={clsx(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                selectedSort === option.value
                  ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-purple-600 dark:hover:border-purple-600"
              )}
            >
              <span className="relative flex items-center h-5">
                <input
                  type="radio"
                  name="sortBy"
                  value={option.value}
                  checked={selectedSort === option.value}
                  onChange={() => setSelectedSort(option.value)}
                  className="sr-only peer"
                />
                <span
                  className={clsx(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    selectedSort === option.value
                      ? "border-purple-600"
                      : "border-gray-500"
                  )}
                >
                  {selectedSort === option.value && (
                    <span className="w-3 h-3 rounded-full bg-purple-600 block" />
                  )}
                </span>
              </span>
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  {option.label}
                  {option.value === "global" && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({sortOptions.find((opt) => opt.value === globalSort)?.label})
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {option.description}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-3 justify-end">
          {selectedSort !== "global" && (
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Reset to Global
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListSortDialog;
