import React from "react";
import clsx from "clsx";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";
import { useTodoStore } from "../store/todoStore";
import { SortOption } from "../types/todo";
import { SORT_OPTION_META } from "../constants/sortOptions";

// Exclude the "global" option from the global settings page
const globalSortOptions = SORT_OPTION_META.filter((o) => o.value !== "global");

interface SettingsViewProps {
  theme: string;
  toggleTheme: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ theme, toggleTheme }) => {
  const { sortBy, sortDirection, setSortBy, setSortDirection } = useTodoStore();

  return (
    <div className="flex-1 p-2 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-8">
          Settings
        </h1>

        <div className="space-y-6">
          {/* Theme Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Theme
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Switch between light and dark mode
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-purple-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                role="switch"
                aria-checked={theme === "dark"}
                aria-label="Toggle dark mode"
              >
                <span className="sr-only">Toggle theme</span>
                <span
                  className={clsx(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    theme === "dark" ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Sorting Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Default Sorting
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                This is the default sort used by all lists. You can override this for individual lists using the sort icon next to each list.
              </p>
            </div>

            <div className="space-y-2">
              {globalSortOptions.map((option) => {
                const isSelected = sortBy === option.value;
                const ascActive = isSelected && option.supportsDirection && sortDirection === "asc";
                const descActive = isSelected && option.supportsDirection && sortDirection === "desc";

                return (
                  <div
                    key={option.value}
                    className={clsx(
                      "flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors",
                      isSelected
                        ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-600"
                    )}
                  >
                    {/* Label side — clicking selects the sort */}
                    <button
                      onClick={() => {
                        setSortBy(option.value as SortOption);
                        if (!option.supportsDirection) {
                          setSortDirection("desc");
                        }
                      }}
                      className="flex items-start gap-3 flex-1 text-left"
                    >
                      <span className="relative flex items-center h-5 mt-0.5 flex-shrink-0">
                        <span
                          className={clsx(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                            isSelected ? "border-purple-600" : "border-gray-500"
                          )}
                        >
                          {isSelected && (
                            <span className="w-3 h-3 rounded-full bg-purple-600 block" />
                          )}
                        </span>
                      </span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {option.description}
                        </div>
                      </div>
                    </button>

                    {/* Direction buttons */}
                    {option.supportsDirection ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => {
                            setSortBy(option.value as SortOption);
                            setSortDirection("asc");
                          }}
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
                          onClick={() => {
                            setSortBy(option.value as SortOption);
                            setSortDirection("desc");
                          }}
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
                      <div className="w-9" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
