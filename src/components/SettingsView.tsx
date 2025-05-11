import React from "react";
import clsx from "clsx";
import { isTauri } from "../utils/environment"; // Assuming isTauri is moved or accessible

interface SettingsViewProps {
  theme: string;
  toggleTheme: () => void;
  storagePath: string;
  setStoragePath: (path: string) => void;
  handleSetPath: (path: string) => Promise<void>;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  toggleTheme,
  storagePath,
  setStoragePath,
  handleSetPath,
}) => {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-8">
          Settings
        </h1>

        <div className="space-y-6">
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

          {isTauri() && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Storage Location
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Set custom path for storing todos and lists (leave empty for
                  default location)
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={storagePath}
                    onChange={(e) => setStoragePath(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter storage path..."
                  />
                  <button
                    onClick={() => handleSetPath(storagePath)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
