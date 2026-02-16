import { XMarkIcon, CheckIcon, PencilIcon } from "@heroicons/react/24/outline";
import { Todo } from "../types/todo";
import { useState, useEffect } from "react";
import { useTodoStore } from "../store/todoStore";
import RichTextEditor from "./RichTextEditor";
import TiptapRenderer from "./TiptapRenderer";
import { hasVisibleContent } from "../lib/content";

interface EditTodoDialogProps {
  isOpen: boolean;
  todoToEdit: Todo | null;
  viewMode?: boolean;
  onSave: (
    id: string,
    newTitle: string,
    newNotes?: string,
    newPriority?: "low" | "medium" | "high",
    newDueDate?: Date | undefined,
    newListId?: string
  ) => Promise<void>;
  onCancel: () => void;
}

const EditTodoDialog = ({
  isOpen,
  todoToEdit,
  viewMode = false,
  onSave,
  onCancel,
}: EditTodoDialogProps) => {
  const { lists } = useTodoStore();
  const [isViewMode, setIsViewMode] = useState(viewMode);
  const [editText, setEditText] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPriority, setEditPriority] = useState<
    "low" | "medium" | "high" | undefined
  >("medium");
  const [editDueDate, setEditDueDate] = useState("");
  const [editListId, setEditListId] = useState("");

  useEffect(() => {
    if (todoToEdit) {
      setEditText(todoToEdit.title);
      setEditNotes(todoToEdit.notes || "");
      setEditPriority(todoToEdit.priority || "medium");
      setEditListId(todoToEdit.listId);
      // Format Date to YYYY-MM-DD string for input, or empty string
      setEditDueDate(
        todoToEdit.dueDate instanceof Date
          ? todoToEdit.dueDate.toISOString().split("T")[0]
          : ""
      );
    } else {
      setEditText("");
      setEditNotes("");
      setEditPriority("medium");
      setEditListId("");
      setEditDueDate("");
    }
  }, [todoToEdit]);

  useEffect(() => {
    setIsViewMode(viewMode);
  }, [viewMode]);

  if (!isOpen || !todoToEdit) {
    return null;
  }

  const handleSave = () => {
    if (editText.trim()) {
      onSave(
        todoToEdit.id,
        editText.trim(),
        !hasVisibleContent(editNotes) ? "" : editNotes,
        editPriority,
        // Parse string to Date or undefined
        editDueDate.trim() ? new Date(editDueDate.trim()) : undefined,
        editListId
      );
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      //e.preventDefault();
      //handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm sm:max-w-md transform transition-all duration-300 ease-in-out scale-100 max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">
              {isViewMode ? "Todo Details" : "Edit Todo"}
            </h2>
            {isViewMode && (
              <button
                onClick={() => setIsViewMode(false)}
                className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-full"
                title="Edit todo"
              >
                <PencilIcon className="w-5 h-5" />
              </button>
            )}
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            title="Close dialog"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-4">

        <div>
          <label
            htmlFor="todoText"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Task
          </label>
          {isViewMode ? (
            <div className="w-full px-3 py-3 sm:py-2 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-base sm:text-sm whitespace-pre-wrap">
              {editText}
            </div>
          ) : (
            <textarea
              id="todoText"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-3 sm:py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base sm:text-sm resize-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
              placeholder="Enter todo text"
              // rows={1}
              autoFocus
            />
          )}
        </div>

        <div className="mt-4">
          <label
            htmlFor="todoNotes"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Notes
          </label>
          {isViewMode ? (
            <div className="w-full px-3 py-3 sm:py-2 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-base sm:text-sm min-h-[6rem]">
              {!hasVisibleContent(editNotes) ? (
                <span className="text-gray-400 dark:text-gray-500 italic">No notes</span>
              ) : (
                <TiptapRenderer content={editNotes} className="rendered-notes" />
              )}
            </div>
          ) : (
            <RichTextEditor
              key={`editor-${todoToEdit?.id}`}
              initialContent={todoToEdit?.notes || ""}
              onUpdate={(json) => setEditNotes(JSON.stringify(json))}
              placeholder="Add notes..."
            />
          )}
        </div>

        <div className="mt-4">
          <label
            htmlFor="todoList"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            List
          </label>
          {isViewMode ? (
            <div className="w-full px-3 py-3 sm:py-2 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-base sm:text-sm">
              {lists.find((list) => list.id === editListId)?.name || "Unknown List"}
            </div>
          ) : (
            <select
              id="todoList"
              value={editListId}
              onChange={(e) => setEditListId(e.target.value)}
              className="w-full px-3 py-3 sm:py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            >
              {lists
                .filter((list) => list.name !== "All")
                .map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
            </select>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="todoDueDate"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Due Date
            </label>
            {isViewMode ? (
              <div className="w-full px-3 py-3 sm:py-2 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-base sm:text-sm">
                {editDueDate ? new Date(editDueDate).toLocaleDateString() : <span className="text-gray-400 dark:text-gray-500 italic">No due date</span>}
              </div>
            ) : (
              <input
                type="date"
                id="todoDueDate"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-3 sm:py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
              />
            )}
          </div>
          <div>
            <label
              htmlFor="todoPriority"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Priority
            </label>
            {isViewMode ? (
              <div className="w-full px-3 py-3 sm:py-2 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-base sm:text-sm capitalize">
                {editPriority || "Medium"}
              </div>
            ) : (
              <select
                id="todoPriority"
                value={editPriority}
                onChange={(e) =>
                  setEditPriority(
                    e.target.value as "low" | "medium" | "high" | undefined
                  )
                }
                className="w-full px-3 py-3 sm:py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            )}
          </div>
        </div>
        </div>

        {/* Fixed Footer with Buttons */}
        {!isViewMode && (
          <div className="p-4 sm:p-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={onCancel}
                type="button"
                className="px-4 py-3 sm:py-2 text-base sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                type="button"
                className="px-4 py-3 sm:py-2 text-base sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 order-1 sm:order-2"
              >
                <CheckIcon className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditTodoDialog;
