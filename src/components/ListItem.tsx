import {
  HomeIcon,
  CheckCircleIcon,
  BriefcaseIcon,
  UserIcon,
  BookOpenIcon,
  AcademicCapIcon,
  AdjustmentsHorizontalIcon,
  AtSymbolIcon,
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
} from "@heroicons/react/24/outline";
import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import { TodoList } from "../types/todo";

// Helper function to get icon component
const getIconForList = (icon: string) => {
  const props = { className: "w-5 h-5" };
  switch (icon) {
    case "home":
      return <HomeIcon {...props} />;
    case "check":
      return <CheckCircleIcon {...props} />;
    case "user":
      return <UserIcon {...props} />;
    case "briefcase":
      return <BriefcaseIcon {...props} />;
    case "book":
      return <BookOpenIcon {...props} />;
    case "academic-cap":
      return <AcademicCapIcon {...props} />;
    case "adjustments":
      return <AdjustmentsHorizontalIcon {...props} />;
    case "at-symbol":
      return <AtSymbolIcon {...props} />;
    case "calendar":
      return <CalendarIcon {...props} />;
    case "chart-bar":
      return <ChartBarIcon {...props} />;
    case "camera":
      return <CameraIcon {...props} />;
    case "clipboard":
      return <ClipboardDocumentCheckIcon {...props} />;
    case "credit-card":
      return <CreditCardIcon {...props} />;
    case "document":
      return <DocumentIcon {...props} />;
    case "exclamation":
      return <ExclamationTriangleIcon {...props} />;
    case "face-smile":
      return <FaceSmileIcon {...props} />;
    case "film":
      return <FilmIcon {...props} />;
    case "folder":
      return <FolderOpenIcon {...props} />;
    case "identification":
      return <IdentificationIcon {...props} />;
    case "key":
      return <KeyIcon {...props} />;
    case "link":
      return <LinkIcon {...props} />;
    case "musical-note":
      return <MusicalNoteIcon {...props} />;
    case "scale":
      return <ScaleIcon {...props} />;
    case "scissors":
      return <ScissorsIcon {...props} />;
    case "sun":
      return <SunIcon {...props} />;
    case "trash":
      return <TrashIcon {...props} />;
    case "tag":
      return <TagIcon {...props} />;
    case "bell-snooze":
      return <BellSnoozeIcon {...props} />;
    default:
      return <HomeIcon {...props} />;
  }
};

interface ListItemProps {
  list: TodoList;
  onSelect: () => void;
  selected: boolean;
  todoCount: number;
}

export const ListItem = ({
  list,
  onSelect,
  selected,
  todoCount,
}: ListItemProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: list.id,
    data: list,
  });



  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "list-item-container w-full transition-all duration-200",
        // Increase drop zone area significantly
        "py-2 px-2 -mx-2 -my-1",
        isOver && "bg-purple-50 dark:bg-purple-900/50 border-2 border-purple-400 dark:border-purple-500 scale-105 shadow-md rounded-lg"
      )}
    >
      <button
        onClick={onSelect}
        className={clsx(
          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-all duration-200",
          selected
            ? "bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100"
            : "hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-100"
        )}
      >
        <div className="flex items-center gap-3">
          {getIconForList(list.icon)}
          <span>{list.name}</span>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {todoCount}
        </span>
      </button>
    </div>
  );
};