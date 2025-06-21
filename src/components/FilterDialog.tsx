import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface FilterOptions {
  showCompleted: boolean;
  priorities: {
    low: boolean;
    medium: boolean;
    high: boolean;
  };
  hasDueDate: boolean;
}

interface FilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

const FilterDialog = ({ isOpen, onClose, onApply, currentFilters }: FilterDialogProps) => {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);

  useEffect(() => {
    if (isOpen) {
      setFilters(currentFilters);
    }
  }, [isOpen, currentFilters]);

  if (!isOpen) {
    return null;
  }

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterOptions = {
      showCompleted: false,
      priorities: {
        low: false,
        medium: false,
        high: false,
      },
      hasDueDate: false,
    };
    setFilters(resetFilters);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm transform transition-all duration-300 ease-in-out scale-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Filter Tasks
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            title="Close dialog"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Show completed tasks */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={filters.showCompleted}
                  onChange={(e) => setFilters({ ...filters, showCompleted: e.target.checked })}
                  onKeyDown={handleKeyDown}
                  className="sr-only peer"
                />
                <div className={clsx(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                  filters.showCompleted
                    ? "bg-gray-800 dark:bg-white border-gray-800 dark:border-white"
                    : "border-gray-300 dark:border-gray-600"
                )}>
                  {filters.showCompleted && (
                    <svg className="w-3 h-3 text-white dark:text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-gray-900 dark:text-white font-medium">
                Show completed tasks
              </span>
            </label>
          </div>

          {/* Priority filters */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Priority
            </h3>
            <div className="space-y-3">
              {(['low', 'medium', 'high'] as const).map((priority) => (
                <label key={priority} className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={filters.priorities[priority]}
                      onChange={(e) => setFilters({
                        ...filters,
                        priorities: {
                          ...filters.priorities,
                          [priority]: e.target.checked
                        }
                      })}
                      onKeyDown={handleKeyDown}
                      className="sr-only peer"
                    />
                    <div className={clsx(
                      "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                      filters.priorities[priority]
                        ? "bg-gray-800 dark:bg-white border-gray-800 dark:border-white"
                        : "border-gray-300 dark:border-gray-600"
                    )}>
                      {filters.priorities[priority] && (
                        <svg className="w-2.5 h-2.5 text-white dark:text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-700 dark:text-gray-300 capitalize">
                    {priority}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Has due date filter */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={filters.hasDueDate}
                  onChange={(e) => setFilters({ ...filters, hasDueDate: e.target.checked })}
                  onKeyDown={handleKeyDown}
                  className="sr-only peer"
                />
                <div className={clsx(
                  "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                  filters.hasDueDate
                    ? "bg-gray-800 dark:bg-white border-gray-800 dark:border-white"
                    : "border-gray-300 dark:border-gray-600"
                )}>
                  {filters.hasDueDate && (
                    <svg className="w-2.5 h-2.5 text-white dark:text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-gray-700 dark:text-gray-300">
                Has due date
              </span>
            </label>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleApply}
            className="flex-1 bg-gray-800 dark:bg-white text-white dark:text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-900 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 transition-colors"
          >
            Apply
          </button>
          <button
            onClick={handleReset}
            className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterDialog;