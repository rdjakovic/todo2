import { useRef, useEffect, useState } from "react";
import {
  BarsArrowDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { SortOption, SortDirection } from "../types/todo";
import { TodoList } from "../types/todo";
import { SORT_OPTION_META } from "../constants/sortOptions";

interface ListSortDropdownProps {
  currentList: TodoList;
  globalSort: SortOption;
  globalDirection: SortDirection;
  /** Direction override for this specific list (from listSortDirections map) */
  listDirection?: SortDirection;
  onSetSort: (sort: SortOption, direction: SortDirection) => Promise<void>;
  onUseGlobal: () => Promise<void>;
}

const ListSortDropdown = ({
  currentList,
  globalSort,
  globalDirection,
  listDirection,
  onSetSort,
  onUseGlobal,
}: ListSortDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasCustomSort = !!currentList.sortPreference;
  // Active sort: list's own preference or fall back to global
  const activeSort = currentList.sortPreference ?? globalSort;
  // Active direction: per-list override, or global
  const activeDirection = hasCustomSort ? (listDirection ?? globalDirection) : globalDirection;
  const isUsingGlobal = !hasCustomSort;

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectNonDirectional = async (value: SortOption | "global") => {
    if (value === "global") {
      await onUseGlobal();
    } else {
      await onSetSort(value, "desc");
    }
    setIsOpen(false);
  };

  const handleSelectDirection = async (sort: SortOption, direction: SortDirection) => {
    await onSetSort(sort, direction);
    setIsOpen(false);
  };

  const isRowActive = (value: SortOption | "global") => {
    if (value === "global") return isUsingGlobal;
    return hasCustomSort && activeSort === value;
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={clsx(
          "p-2 rounded-lg transition-colors relative",
          hasCustomSort
            ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/50"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        )}
        title={hasCustomSort ? "Sort (customized)" : "Sort options"}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <BarsArrowDownIcon className="w-5 h-5" />
        {hasCustomSort && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-purple-600 rounded-full" />
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1"
          role="listbox"
          aria-label="Sort options"
        >
          {SORT_OPTION_META.map((option) => {
            const rowActive = isRowActive(option.value);
            const ascActive = rowActive && hasCustomSort && activeDirection === "asc";
            const descActive = rowActive && hasCustomSort && activeDirection === "desc";

            return (
              <div
                key={option.value}
                className={clsx(
                  "flex items-center justify-between px-3 py-2.5 gap-3 transition-colors",
                  rowActive
                    ? "bg-purple-50 dark:bg-purple-900/20"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                )}
              >
                {/* Label side */}
                <button
                  onClick={() =>
                    option.supportsDirection
                      ? handleSelectDirection(option.value as SortOption, "desc")
                      : handleSelectNonDirectional(option.value)
                  }
                  className="flex-1 text-left min-w-0"
                  role="option"
                  aria-selected={rowActive}
                >
                  <div
                    className={clsx(
                      "text-sm font-medium",
                      rowActive
                        ? "text-purple-700 dark:text-purple-300"
                        : "text-gray-900 dark:text-white"
                    )}
                  >
                    {option.label}
                    {option.value === "global" && (
                      <span className="ml-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">
                        ({SORT_OPTION_META.find((o) => o.value === globalSort)?.label ?? globalSort})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {option.description}
                  </div>
                </button>

                {/* Direction buttons */}
                {option.supportsDirection ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleSelectDirection(option.value as SortOption, "asc")}
                      className={clsx(
                        "p-1 rounded-full transition-colors",
                        ascActive
                          ? "bg-purple-600 text-white"
                          : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      )}
                      title="Ascending"
                      aria-label={`Sort by ${option.label} ascending`}
                      aria-pressed={ascActive}
                    >
                      <ArrowUpIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSelectDirection(option.value as SortOption, "desc")}
                      className={clsx(
                        "p-1 rounded-full transition-colors",
                        descActive
                          ? "bg-purple-600 text-white"
                          : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      )}
                      title="Descending"
                      aria-label={`Sort by ${option.label} descending`}
                      aria-pressed={descActive}
                    >
                      <ArrowDownIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-9 flex items-center justify-center flex-shrink-0">
                    {rowActive && (
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ListSortDropdown;
