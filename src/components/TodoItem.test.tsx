import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import TodoItem from "./TodoItem"; // Changed to default import
import { Todo } from "../types/todo";

describe("TodoItem", () => {
  const mockTodo: Todo = {
    id: 1,
    text: "Test Todo",
    completed: false,
    dateCreated: new Date().toISOString(),
    isEditing: false,
    editText: "",
  };

  const mockOnToggle = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnEdit = vi.fn(); // This prop is still passed to TodoItem, for App.tsx to use with the dialog
  // const mockOnEditStart = vi.fn(); // Removed
  // const mockOnEditCancel = vi.fn(); // Removed
  // const mockOnEditChange = vi.fn(); // Removed
  const mockOnOpenEditDialog = vi.fn(); // Added

  beforeEach(() => {
    vi.clearAllMocks();
    render(
      <TodoItem
        todo={mockTodo}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
        onEdit={mockOnEdit}
        onOpenEditDialog={mockOnOpenEditDialog} // Added
        // onEditStart, onEditCancel, onEditChange removed
      />
    );
  });

  test("renders todo text", () => {
    expect(screen.getByText("Test Todo")).toBeInTheDocument();
  });

  test("calls onToggle when checkbox is clicked", () => {
    const checkbox = screen.getByRole("button", { name: "" });
    fireEvent.click(checkbox);
    expect(mockOnToggle).toHaveBeenCalledWith(mockTodo.id);
  });

  test("calls onDelete when delete button is clicked", () => {
    const deleteButton = screen.getByTitle("Delete todo");
    fireEvent.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith(mockTodo.id);
  });

  test("calls onOpenEditDialog when edit button is clicked", () => {
    const editButton = screen.getByTitle("Edit todo");
    fireEvent.click(editButton);
    expect(mockOnOpenEditDialog).toHaveBeenCalledWith(mockTodo); // Changed assertion
  });
});
