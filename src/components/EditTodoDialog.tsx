import { XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";
import { Todo } from "../types/todo";
import { useState, useEffect } from "react";

interface EditTodoDialogProps {
  isOpen: boolean;
  todoToEdit: Todo | null;
  onSave: (
    id: number,
    newTitle: string,
    newNotes?: string,
    newPriority?: "low" | "medium" | "high",
    newDueDate?: Date | undefined // Changed to Date
  ) => void;
  onCancel: () => void;
}

const EditTodoDialog = ({
  isOpen,
  todoToEdit,
  onSave,
  onCancel,
}: EditTodoDialogProps) => {
  const [editText, setEditText] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPriority, setEditPriority] = useState<
    "low" | "medium" | "high" | undefined
  >("medium");
  const [editDueDate, setEditDueDate] = useState("");

  useEffect(() => {
    if (todoToEdit) {
      setEditText(todoToEdit.title);
      setEditNotes(todoToEdit.notes || "");
      setEditPriority(todoToEdit.priority || "medium");
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
      setEditDueDate("");
    }
  }, [todoToEdit]);

  if (!isOpen || !todoToEdit) {
    return null;
  }

  const handleSave = () => {
    if (editText.trim()) {
      onSave(
        todoToEdit.id,
        editText.trim(),
        editNotes.trim(),
        editPriority,
        // Parse string to Date or undefined
        editDueDate.trim() ? new Date(editDueDate.trim()) : undefined
      );
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ease-in-out scale-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Edit Todo
          </h2>
          <button
            onClick={onCancel}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            title="Close dialog"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div>
          <label
            htmlFor="todoText"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Task
          </label>
          <textarea
            id="todoText"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            placeholder="Enter todo text"
            // rows={1}
            autoFocus
          />
        </div>

        <div className="mt-4">
          <label
            htmlFor="todoNotes"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Notes
          </label>
          <textarea
            id="todoNotes"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            placeholder="Add notes..."
            rows={5}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="todoDueDate"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Due Date
            </label>
            <input
              type="date"
              id="todoDueDate"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>
          <div>
            <label
              htmlFor="todoPriority"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Priority
            </label>
            <select
              id="todoPriority"
              value={editPriority}
              onChange={(e) =>
                setEditPriority(
                  e.target.value as "low" | "medium" | "high" | undefined
                )
              }
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          >
            <CheckIcon className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTodoDialog;
