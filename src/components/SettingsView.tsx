import React from "react";
import clsx from "clsx";
import { useTodoStore, SortOption } from "../store/todoStore";

interface SettingsViewProps {
  theme: string;
  toggleTheme: () => void;
}

const sortOptions: { value: SortOption; label: string; description: string }[] = [
  {
    value: "dateCreated",
    label: "Date Created",
    description: "Sort by creation date (newest first)"
  },
  {
    value: "priority",
    label: "Priority",
    description: "Sort by priority level (high to low)"
  },
  {
    value: "dateCompleted",
    label: "Date Completed",
    description: "Show completed items first, sorted by completion date"
  },
  {
    value: "completedFirst",
    label: "Completed First",
    description: "Show completed items at the top"
  },
  {
    value: "completedLast",
    label: "Completed Last",
    description: "Show completed items at the bottom"
  },
  {
    value: "dueDate",
    label: "Due Date",
    description: "Sort by due date (earliest first), then by creation date"
  }
];

const SettingsView: React.FC<SettingsViewProps> = ({ theme, toggleTheme }) => {
  const { sortBy, setSortBy } = useTodoStore();

  return (
    <div className="flex-1 p-8">
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
                Sorting Items
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Choose how to sort your todo items
              </p>
            </div>
            
            <div className="space-y-3">
              {sortOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="sortBy"
                    value={option.value}
                    checked={sortBy === option.value}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="mt-1 w-4 h-4 text-green-600 border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:focus:ring-green-400 dark:bg-gray-700"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {option.label}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
