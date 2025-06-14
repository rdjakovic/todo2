import React from "react";
import { WifiIcon, CloudIcon } from "@heroicons/react/24/outline";
import { useTodoStore } from "../store/todoStore";

const OfflineIndicator: React.FC = () => {
  const { isOffline } = useTodoStore();

  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium">
      <WifiIcon className="w-4 h-4" />
      <span>Offline Mode</span>
      <CloudIcon className="w-4 h-4 opacity-60" />
    </div>
  );
};

export default OfflineIndicator;