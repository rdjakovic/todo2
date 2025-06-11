import { XMarkIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';

interface DeleteListDialogProps {
  isOpen: boolean;
  listName: string | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

const DeleteListDialog = ({ isOpen, listName, onConfirm, onCancel }: DeleteListDialogProps) => {
  if (!isOpen || !listName) {
    return null;
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-sm sm:max-w-md transform transition-all duration-300 ease-in-out scale-100">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">
              Delete List
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            title="Close dialog"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-base sm:text-base text-gray-700 dark:text-gray-300">
            Are you sure you want to delete the list <strong>"{listName}"</strong>?
          </p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">
            This action cannot be undone. All todos in this list will also be deleted.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onCancel}
            onKeyDown={handleKeyDown}
            type="button"
            className="px-4 py-3 sm:py-2 text-base sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 order-2 sm:order-1"
            autoFocus
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            onKeyDown={handleKeyDown}
            type="button"
            className="px-4 py-3 sm:py-2 text-base sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 order-1 sm:order-2"
          >
            <TrashIcon className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteListDialog;