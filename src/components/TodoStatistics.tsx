import React from "react";

interface TodoStatisticsProps {
  statistics: {
    totalTasks: number;
    completedTasks: number;
    highPriorityTasks: number;
    progress: number;
  };
}

const TodoStatistics: React.FC<TodoStatisticsProps> = ({ statistics }) => {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {/* Total Tasks - Blue */}
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700/50">
            <div className="text-2xl sm:text-3xl font-bold mb-1 text-blue-700 dark:text-blue-300">
              {statistics.totalTasks}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              Total Tasks
            </div>
          </div>

          {/* Completed - Green */}
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-700/50">
            <div className="text-2xl sm:text-3xl font-bold mb-1 text-green-700 dark:text-green-300">
              {statistics.completedTasks}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400 font-medium">
              Completed
            </div>
          </div>

          {/* High Priority - Red */}
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border border-red-200 dark:border-red-700/50">
            <div className="text-2xl sm:text-3xl font-bold mb-1 text-red-700 dark:text-red-300">
              {statistics.highPriorityTasks}
            </div>
            <div className="text-sm text-red-600 dark:text-red-400 font-medium">
              High Priority
            </div>
          </div>

          {/* Progress - Purple */}
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-700/50">
            <div className="text-2xl sm:text-3xl font-bold mb-1 text-purple-700 dark:text-purple-300">
              {statistics.progress}%
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
              Progress
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodoStatistics;
