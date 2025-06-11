import { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import {
  AcademicCapIcon,
  AdjustmentsHorizontalIcon,
  AtSymbolIcon,
  BriefcaseIcon,
  CalendarIcon,
  ChartBarIcon,
  CameraIcon,
  ClipboardDocumentCheckIcon,
  CreditCardIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  FaceSmileIcon,
  FilmIcon,
  FolderOpenIcon,
  IdentificationIcon,
  KeyIcon,
  LinkIcon,
  MusicalNoteIcon,
  ScaleIcon,
  ScissorsIcon,
  SunIcon,
  TrashIcon,
  TagIcon,
  BellSnoozeIcon,
  HomeIcon,
  CheckCircleIcon,
  UserIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface CreateListDialogProps {
  isOpen: boolean;
  onSave: (name: string, icon: string) => Promise<void>;
  onCancel: () => void;
}

const availableIcons = [
  { name: 'home', icon: HomeIcon },
  { name: 'check', icon: CheckCircleIcon },
  { name: 'user', icon: UserIcon },
  { name: 'briefcase', icon: BriefcaseIcon },
  { name: 'book', icon: BookOpenIcon },
  { name: 'academic-cap', icon: AcademicCapIcon },
  { name: 'adjustments', icon: AdjustmentsHorizontalIcon },
  { name: 'at-symbol', icon: AtSymbolIcon },
  { name: 'calendar', icon: CalendarIcon },
  { name: 'chart-bar', icon: ChartBarIcon },
  { name: 'camera', icon: CameraIcon },
  { name: 'clipboard', icon: ClipboardDocumentCheckIcon },
  { name: 'credit-card', icon: CreditCardIcon },
  { name: 'document', icon: DocumentIcon },
  { name: 'exclamation', icon: ExclamationTriangleIcon },
  { name: 'face-smile', icon: FaceSmileIcon },
  { name: 'film', icon: FilmIcon },
  { name: 'folder', icon: FolderOpenIcon },
  { name: 'identification', icon: IdentificationIcon },
  { name: 'key', icon: KeyIcon },
  { name: 'link', icon: LinkIcon },
  { name: 'musical-note', icon: MusicalNoteIcon },
  { name: 'scale', icon: ScaleIcon },
  { name: 'scissors', icon: ScissorsIcon },
  { name: 'sun', icon: SunIcon },
  { name: 'trash', icon: TrashIcon },
  { name: 'tag', icon: TagIcon },
  { name: 'bell-snooze', icon: BellSnoozeIcon },
];

const CreateListDialog = ({ isOpen, onSave, onCancel }: CreateListDialogProps) => {
  const [listName, setListName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('home');

  useEffect(() => {
    if (isOpen) {
      setListName('');
      setSelectedIcon('home');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    if (listName.trim()) {
      onSave(listName.trim(), selectedIcon);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-sm sm:max-w-md transform transition-all duration-300 ease-in-out scale-100 max-h-[90vh] min-h-[50vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">
            Create New List
          </h2>
          <button
            onClick={onCancel}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            title="Close dialog"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4">
          <label
            htmlFor="listName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            List Name
          </label>
          <input
            id="listName"
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            placeholder="Enter list name"
            autoFocus
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Choose Icon
          </label>
          <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5 max-h-50 overflow-y-auto justify-items-center">
            {availableIcons.map(({ name, icon: IconComponent }) => (
              <button
                key={name}
                onClick={() => setSelectedIcon(name)}
                className={clsx(
                  'p-2 rounded-lg border-2 transition-colors flex items-center justify-center',
                  selectedIcon === name
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                )}
                title={name}
              >
                <IconComponent className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onCancel}
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 order-2 sm:order-1"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 order-1 sm:order-2"
          >
            <CheckIcon className="w-4 h-4" />
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateListDialog;