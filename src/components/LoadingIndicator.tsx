import React from "react";

const LoadingIndicator: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 dark:from-gray-900 to-blue-50 dark:to-gray-800 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 dark:border-purple-400 border-t-transparent" />
    </div>
  );
};

export default LoadingIndicator;
